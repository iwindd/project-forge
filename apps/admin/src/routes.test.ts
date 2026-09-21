import { describe, expect, it } from 'vitest';
import { findRouteTrail, getPath, getRoute } from './routes';

describe('Project Forge routes', () => {
  it('uses canonical user-scoped auth and global entry routes', () => {
    expect(getPath('login')).toBe('/login');
    expect(getPath('organizationPicker')).toBe('/~');
    expect(getPath('hermes.chat')).toBe('/hermes/chat');
    expect(getPath('hermes.chat.session', { sessionId: '770e8400-e29b-41d4-a716-446655440000' })).toBe(
      '/hermes/chat/770e8400-e29b-41d4-a716-446655440000',
    );
    expect(getPath('hermes.agents')).toBe('/hermes/agents');
    expect(findRouteTrail('/admin/login')).toBeNull();
    expect(findRouteTrail('/~')?.at(-1)?.name).toBe('organizationPicker');
    expect(findRouteTrail('/hermes/chat')?.at(-1)?.name).toBe('hermes.chat');
    expect(findRouteTrail('/hermes/chat/770e8400-e29b-41d4-a716-446655440000')?.at(-1)?.name).toBe(
      'hermes.chat.session',
    );
    expect(findRouteTrail('/hermes/agents')?.at(-1)?.name).toBe('hermes.agents');
  });

  it('keeps organization data routes explicitly scoped by slug', () => {
    expect(getPath('overview', { organizationSlug: 'acme' })).toBe('/acme');
    expect(getPath('auditLogs', { organizationSlug: 'acme' })).toBe('/acme/audit-logs');
    expect(getPath('projects', { organizationSlug: 'acme' })).toBe('/acme/projects');
    expect(findRouteTrail('/acme/audit-logs')?.at(-1)?.name).toBe('auditLogs');
    expect(findRouteTrail('/acme/projects')?.at(-1)?.name).toBe('projects');
    expect(findRouteTrail('/acme/profile')).toBeNull();
    expect(findRouteTrail('/acme/users')).toBeNull();
  });

  it('does not retain organization-scoped Chat or Agents routes', () => {
    expect(() => getRoute('chat')).toThrow('Route not found: chat');
    expect(() => getRoute('agents')).toThrow('Route not found: agents');
    expect(findRouteTrail('/acme/chat')).toBeNull();
    expect(findRouteTrail('/acme/agents')).toBeNull();
  });
});
