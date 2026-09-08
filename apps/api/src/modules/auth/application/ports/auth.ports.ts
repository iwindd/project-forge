import type { GithubProfile } from './github-oauth.port.js';

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');
export const GITHUB_OAUTH = Symbol('GITHUB_OAUTH');
export const TOKEN_GENERATOR = Symbol('TOKEN_GENERATOR');
export const TOKEN_HASHER = Symbol('TOKEN_HASHER');
export const SECRET_CIPHER = Symbol('SECRET_CIPHER');

export type AuthConfig = {
  githubClientId: string;
  githubClientSecret: string;
  githubCallbackUrl: string;
  githubScopes: string;
  adminGithubIds: Set<string>;
  sessionSecret: string;
  sessionTtlSeconds: number;
  cookieSecure: boolean;
  adminOrigin: string;
};

export interface TokenGeneratorPort {
  hex(bytes: number): string;
  base64Url(bytes: number): string;
}

export interface TokenHasherPort {
  hash(value: string): string;
}

export interface SecretCipherPort {
  encrypt(value: string): string;
}

export interface GithubOAuthPort {
  authorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<{
    profile: GithubProfile;
    accessToken: string;
    scope: string | null;
  }>;
}
