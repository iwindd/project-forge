import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Principal } from '../../../common/auth/principal.decorator.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { HermesSessionService } from '../application/hermes-session.service.js';
import type { HermesSessionAttachment, HermesSessionSummary } from '../domain/hermes-session.types.js';
import {
  createHermesSessionSchema,
  hermesSessionActionResponseEnvelopeSchema,
  hermesSessionIdParamSchema,
  hermesSessionListResponseEnvelopeSchema,
  hermesSessionResponseEnvelopeSchema,
  renameHermesSessionSchema,
} from './dto/hermes-sessions.schemas.js';

@Controller('hermes/sessions')
@UseGuards(SessionGuard)
export class HermesSessionsController {
  constructor(private readonly sessions: HermesSessionService) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal) {
    return hermesSessionListResponseEnvelopeSchema.parse(apiSuccess({ sessions: await this.sessions.list(principal.id) }));
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Principal() principal: AuthenticatedPrincipal, @Body() rawBody: unknown) {
    const { agentHandle } = createHermesSessionSchema.parse(rawBody);
    const attachment = await this.sessions.create(principal.id, agentHandle);
    const summary = await this.findSummary(principal.id, attachment.record.id, attachment);
    return hermesSessionResponseEnvelopeSchema.parse(
      apiSuccess({ session: summary, snapshot: attachment.snapshot }),
    );
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resume(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown) {
    const { id } = hermesSessionIdParamSchema.parse(rawParams);
    const attachment = await this.sessions.attach(principal.id, id);
    const summary = await this.findSummary(principal.id, id, attachment);
    return hermesSessionResponseEnvelopeSchema.parse(
      apiSuccess({ session: summary, snapshot: attachment.snapshot }),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async rename(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() rawBody: unknown,
  ) {
    const { id } = hermesSessionIdParamSchema.parse(rawParams);
    const { title } = renameHermesSessionSchema.parse(rawBody);
    await this.sessions.rename(principal.id, id, title);
    return hermesSessionActionResponseEnvelopeSchema.parse(apiSuccess(null));
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown) {
    const { id } = hermesSessionIdParamSchema.parse(rawParams);
    await this.sessions.close(principal.id, id);
    return hermesSessionActionResponseEnvelopeSchema.parse(apiSuccess(null));
  }

  private async findSummary(
    userId: string,
    id: string,
    attachment: HermesSessionAttachment,
  ): Promise<HermesSessionSummary> {
    const summary = (await this.sessions.list(userId)).find((candidate) => candidate.id === id);
    if (summary) return summary;
    return {
      id,
      agentHandle: attachment.record.agentHandle,
      title: attachment.snapshot.title,
      preview: attachment.snapshot.messages.at(-1)?.text ?? '',
      messageCount: attachment.snapshot.messageCount,
      startedAt: attachment.record.createdAt.toISOString(),
      active: true,
      closedAt: null,
    };
  }
}
