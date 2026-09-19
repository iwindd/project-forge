import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { HermesRuntimeService } from '../application/hermes-runtime.service.js';

@Controller('hermes/runtime')
@UseGuards(SessionGuard)
export class HermesRuntimeController {
  constructor(private readonly runtime: HermesRuntimeService) {}

  @Get()
  status() {
    return apiSuccess(this.runtime.getStatus());
  }

  @Post('connect')
  async connect() {
    return apiSuccess(await this.runtime.connect());
  }
}
