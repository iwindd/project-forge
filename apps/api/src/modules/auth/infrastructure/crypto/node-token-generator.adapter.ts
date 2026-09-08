import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { TokenGeneratorPort } from '../../application/ports/auth.ports.js';

@Injectable()
export class NodeTokenGeneratorAdapter implements TokenGeneratorPort {
  hex(bytes: number): string {
    return randomBytes(bytes).toString('hex');
  }

  base64Url(bytes: number): string {
    return randomBytes(bytes).toString('base64url');
  }
}
