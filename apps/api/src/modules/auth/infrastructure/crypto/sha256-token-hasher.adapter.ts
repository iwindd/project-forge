import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { TokenHasherPort } from '../../application/ports/auth.ports.js';

@Injectable()
export class Sha256TokenHasherAdapter implements TokenHasherPort {
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
