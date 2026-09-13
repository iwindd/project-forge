import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { getRequestId } from '../http/request-context.js';
import { ApplicationError } from './application-error.js';

@Catch()
export class PublicErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = getRequestId(request);
    response.header('X-Request-ID', requestId);

    const mapped = this.map(exception);
    response.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
        requestId,
        details: mapped.details,
      },
    });
  }

  private map(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: Record<string, unknown>;
  } {
    if (exception instanceof ApplicationError) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'INVALID_INPUT',
        message: 'Request validation failed',
        details: { issues: exception.issues },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return { status, code: 'HTTP_ERROR', message: body, details: {} };
      }
      const record = body as Record<string, unknown>;
      return {
        status,
        code: typeof record.code === 'string' ? record.code : 'HTTP_ERROR',
        message: typeof record.message === 'string' ? record.message : 'Request failed',
        details: isRecord(record.details) ? record.details : {},
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: {},
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
