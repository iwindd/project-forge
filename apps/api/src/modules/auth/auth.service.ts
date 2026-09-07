import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessRequest, AccessRequestStatus } from '../access/access-request.entity.js';
import { AuditLog } from '../audit/audit-log.entity.js';
import { OAuthAccount } from './oauth-account.entity.js';
import { Session } from './session.entity.js';
import { AccessStatus, User, UserRole } from '../users/user.entity.js';
import type { AuthenticatedPrincipal } from '../../common/auth/auth.types.js';

type GithubProfile = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
  ) {}

  githubStartUrl(): { url: string; state: string } {
    const clientId = this.required('GITHUB_CLIENT_ID');
    const callback = this.config.get<string>('GITHUB_CALLBACK_URL')!;
    const state = randomBytes(32).toString('hex');
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callback);
    url.searchParams.set('scope', this.config.get<string>('GITHUB_SCOPES') || 'read:user user:email');
    url.searchParams.set('state', state);
    return { url: url.toString(), state };
  }

  async completeGithubLogin(code: string): Promise<{ principal: AuthenticatedPrincipal; sessionToken: string }> {
    const clientId = this.required('GITHUB_CLIENT_ID');
    const clientSecret = this.required('GITHUB_CLIENT_SECRET');
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: this.config.get<string>('GITHUB_CALLBACK_URL'),
      }),
    });
    const tokenBody = (await tokenResponse.json()) as { access_token?: string; scope?: string; error?: string };
    if (!tokenResponse.ok || !tokenBody.access_token) throw new Error(tokenBody.error || 'GitHub token exchange failed');

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${tokenBody.access_token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Project-Forge' },
    });
    if (!profileResponse.ok) throw new Error('GitHub profile lookup failed');
    const profile = (await profileResponse.json()) as GithubProfile;
    const adminIds = new Set((this.config.get<string>('ADMIN_GITHUB_IDS') || '').split(',').map((id) => id.trim()).filter(Boolean));

    const user = await this.em.findOne(User, { githubUserId: String(profile.id) });
    const nextStatus = user?.accessStatus === AccessStatus.APPROVED
      ? AccessStatus.APPROVED
      : adminIds.has(String(profile.id))
        ? AccessStatus.APPROVED
        : user?.accessStatus || AccessStatus.PENDING;
    const nextRole = adminIds.has(String(profile.id)) ? UserRole.ADMIN : user?.role || UserRole.USER;
    const current = user || this.em.create(User, { githubUserId: String(profile.id), githubLogin: profile.login });
    current.githubLogin = profile.login;
    current.name = profile.name ?? null;
    current.avatarUrl = profile.avatar_url ?? null;
    current.accessStatus = nextStatus;
    current.role = nextRole;
    current.isActive = true;
    this.em.persist(current);

    let account = await this.em.findOne(OAuthAccount, { provider: 'GITHUB', providerAccountId: String(profile.id) });
    if (!account) account = this.em.create(OAuthAccount, { userId: current.id, providerAccountId: String(profile.id) });
    account.userId = current.id;
    account.accessTokenCiphertext = this.encryptSecret(tokenBody.access_token);
    account.scope = tokenBody.scope || null;
    this.em.persist(account);

    const pending = await this.em.findOne(AccessRequest, { userId: current.id, status: AccessRequestStatus.PENDING });
    if (!pending && nextStatus === AccessStatus.PENDING) {
      this.em.persist(this.em.create(AccessRequest, { userId: current.id }));
    }
    await this.em.flush();
    return { principal: this.toPrincipal(current), sessionToken: await this.createSession(current.id) };
  }

  async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const ttl = Number(this.config.get<string>('SESSION_TTL_SECONDS') || 604800);
    this.em.persist(this.em.create(Session, { userId, tokenHash: this.hash(token), expiresAt: new Date(Date.now() + ttl * 1000) }));
    await this.em.flush();
    return token;
  }

  async principalFromToken(token: string | undefined): Promise<AuthenticatedPrincipal | null> {
    if (!token) return null;
    const session = await this.em.findOne(Session, { tokenHash: this.hash(token), revokedAt: null });
    if (!session || session.expiresAt.getTime() <= Date.now()) return null;
    const user = await this.em.findOne(User, { id: session.userId });
    if (!user || !user.isActive) return null;
    session.lastSeenAt = new Date();
    await this.em.flush();
    return this.toPrincipal(user);
  }

  async revokeToken(token: string | undefined): Promise<void> {
    if (!token) return;
    const session = await this.em.findOne(Session, { tokenHash: this.hash(token), revokedAt: null });
    if (session) {
      session.revokedAt = new Date();
      await this.em.flush();
    }
  }

  async revokeUserSessions(userId: string): Promise<void> {
    await this.em.nativeUpdate(Session, { userId, revokedAt: null }, { revokedAt: new Date() });
  }

  async writeAudit(input: { actorId?: string | null; targetUserId?: string | null; action: string; resourceType: string; resourceId?: string; before?: Record<string, unknown>; after?: Record<string, unknown>; reason?: string; requestId?: string }) {
    this.em.persist(this.em.create(AuditLog, {
      actorId: input.actorId ?? null,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      beforeJson: input.before ?? null,
      afterJson: input.after ?? null,
      reason: input.reason ?? null,
      requestId: input.requestId ?? null,
    }));
  }

  toPrincipal(user: User): AuthenticatedPrincipal {
    return { id: user.id, githubUserId: user.githubUserId, githubLogin: user.githubLogin, name: user.name, avatarUrl: user.avatarUrl, role: user.role, accessStatus: user.accessStatus, isActive: user.isActive };
  }

  private required(key: string): string {
    const value = this.config.get<string>(key)?.trim();
    if (!value) throw new Error(`${key} is not configured`);
    return value;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private encryptSecret(value: string): string {
    const key = createHash('sha256').update(this.required('SESSION_SECRET')).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
  }
}
