import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigurationError } from '../../../../common/errors/application-error.js';
import { AUTH_CONFIG } from '../../application/ports/auth.ports.js';
import type { AuthConfig, SecretCipherPort } from '../../application/ports/auth.ports.js';

@Injectable()
export class AesSecretCipherAdapter implements SecretCipherPort {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  encrypt(value: string): string {
    if (!this.config.sessionSecret) throw new ConfigurationError('SESSION_SECRET is not configured');
    const key = createHash('sha256').update(this.config.sessionSecret).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
  }
}
