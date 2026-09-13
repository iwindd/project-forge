import { afterEach, describe, expect, it, vi } from 'vitest';
import { GithubOAuthAdapter } from './github-oauth.adapter.js';

describe('GithubOAuthAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves every verified GitHub email while selecting the primary email', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'access-token', scope: 'user:email' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 123,
            login: 'github-user',
            name: 'GitHub User',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { email: 'secondary@example.com', primary: false, verified: true },
            { email: 'primary@example.com', primary: true, verified: true },
            { email: 'unverified@example.com', primary: false, verified: false },
          ]),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new GithubOAuthAdapter({
      githubClientId: 'client-id',
      githubClientSecret: 'client-secret',
      githubCallbackUrl: 'http://localhost/callback',
      githubScopes: 'read:user user:email',
    } as never);

    const result = await adapter.exchangeCode('oauth-code');

    expect(result.profile.email).toBe('primary@example.com');
    expect(result.profile.emailVerified).toBe(true);
    expect(result.profile.verifiedEmails).toEqual(['secondary@example.com', 'primary@example.com']);
  });
});
