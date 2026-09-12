import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-id' } }),
  getProfile: vi.fn().mockResolvedValue({ id: 'profile-id' }),
  createPreloadedState: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/servers/profile/queries/get-profile', () => ({ getProfile: mocks.getProfile }));
vi.mock('@/lib/store', () => ({ createPreloadedState: mocks.createPreloadedState }));
vi.mock('@/lib/api-server', () => ({ isApiServerForbidden: () => false }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('next-intl/server', () => ({
  getLocale: vi.fn().mockResolvedValue('th'),
  getMessages: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/components/admin-shell', () => ({
  AdminShell: (props: Record<string, unknown>) => createElement('admin-shell', props),
}));
vi.mock('@/components/profile/profile-context', () => ({
  ProfileProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/components/forbidden-state', () => ({ ForbiddenState: () => null }));
vi.mock('@/components/providers/app-color-schema-script', () => ({ AppColorSchemaScript: () => null }));
vi.mock('@/components/page-header', () => ({ PageHeader: () => null }));
vi.mock('@/components/providers/app-provider', () => ({
  AppProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@mantine/core', () => ({
  Container: ({ children }: { children: ReactNode }) => children,
  mantineHtmlProps: {},
}));
vi.mock('@mantine/tiptap/styles.css', () => ({}));
vi.mock('@/themes/shadcn/font', () => ({ fontClasses: 'font' }));

import AccountLayout from './layout';

function findElement(node: unknown, type: string): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;
  const candidate = node as { type?: unknown; props?: Record<string, unknown> };
  if (candidate.type === type) return candidate.props ?? null;
  if (typeof candidate.type === 'function') {
    return findElement(candidate.type(candidate.props), type);
  }
  const children = candidate.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findElement(child, type);
      if (found) return found;
    }
  }
  return findElement(children, type);
}

describe('account layout navigation mode', () => {
  it('preserves account navigation when loading the profile surface', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-id' } });
    const tree = await AccountLayout({ children: createElement('child') });
    const props = findElement(tree, 'admin-shell');

    expect(props).toMatchObject({
      navigationMode: 'account',
      user: { id: 'user-id' },
    });
    expect(mocks.getProfile).toHaveBeenCalledOnce();
  });
});
