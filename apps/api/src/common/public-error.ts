import { HttpException, HttpStatus } from '@nestjs/common';

export class PublicError extends HttpException {
  constructor(code: string, message: string, status = HttpStatus.BAD_REQUEST, details: Record<string, unknown> = {}) {
    super({ code, message, details }, status);
  }
}
