import type { OAuthAccountRecord } from '../../domain/oauth-account.js';

export const OAUTH_ACCOUNT_REPOSITORY = Symbol('OAUTH_ACCOUNT_REPOSITORY');

export interface OAuthAccountRepository {
  findByProviderAccount(provider: 'GITHUB', providerAccountId: string): Promise<OAuthAccountRecord | null>;
  save(account: OAuthAccountRecord): Promise<void>;
}
