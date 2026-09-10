import { Inject, Injectable } from '@nestjs/common';
import { ExternalServiceError, ConfigurationError } from '../../../../common/errors/application-error.js';
import { AUTH_CONFIG } from '../../application/ports/auth.ports.js';
import type { AuthConfig, GithubOAuthPort } from '../../application/ports/auth.ports.js';
import type { GithubProfile } from '../../application/ports/github-oauth.port.js';

@Injectable()
export class GithubOAuthAdapter implements GithubOAuthPort {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  authorizationUrl(state: string): string {
    if (!this.config.githubClientId) throw new ConfigurationError('GITHUB_CLIENT_ID is not configured');
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', this.config.githubClientId);
    url.searchParams.set('redirect_uri', this.config.githubCallbackUrl);
    url.searchParams.set('scope', this.config.githubScopes);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<{
    profile: GithubProfile;
    accessToken: string;
    scope: string | null;
  }> {
    if (!this.config.githubClientId || !this.config.githubClientSecret) {
      throw new ConfigurationError('GitHub OAuth credentials are not configured');
    }
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.githubClientId,
        client_secret: this.config.githubClientSecret,
        code,
        redirect_uri: this.config.githubCallbackUrl,
      }),
    });
    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
      error?: string;
    };
    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new ExternalServiceError(tokenBody.error || 'GitHub token exchange failed');
    }

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenBody.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Project-Forge',
      },
    });
    if (!profileResponse.ok) throw new ExternalServiceError('GitHub profile lookup failed');
    const profile = (await profileResponse.json()) as GithubProfile;
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenBody.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Project-Forge',
      },
    });
    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as Array<{ email?: string; primary?: boolean; verified?: boolean }>;
      const verifiedEmails = emails
        .filter(email => email.verified && email.email)
        .map(email => email.email!.trim().toLowerCase());
      const verifiedEmail = emails.find((email) => email.primary && email.verified)?.email
        ?? emails.find((email) => email.verified)?.email
        ?? null;
      profile.email = verifiedEmail;
      profile.emailVerified = Boolean(verifiedEmail);
      profile.verifiedEmails = verifiedEmails;
    } else {
      profile.email = null;
      profile.emailVerified = false;
      profile.verifiedEmails = [];
    }
    return {
      profile,
      accessToken: tokenBody.access_token,
      scope: tokenBody.scope || null,
    };
  }
}
