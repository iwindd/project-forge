import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {
    profile: {
      id: 'profile-id',
      name: 'Ada',
      email: null,
      role: 'EDITOR' as const,
      createdAt: '2026-09-10T00:00:00.000Z',
      updatedAt: '2026-09-10T00:00:00.000Z',
      connections: [],
    },
    isLoading: false,
    isError: false,
    retry: vi.fn(),
  },
  useProfile: vi.fn(),
}));

vi.mock('@mantine/core', () => {
  const element = (tag: string) => {
    function MockElement(props: Record<string, unknown>) {
      return createElement(tag, props, props.children as never);
    }
    MockElement.displayName = tag;
    return MockElement;
  };
  function MockAlert(props: Record<string, unknown>) {
    return createElement('div', props, props.title as never, props.children as never);
  }
  MockAlert.displayName = 'Alert';
  return {
    Alert: MockAlert,
    Button: element('button'),
    Loader: element('span'),
    Stack: element('div'),
    Text: element('p'),
  };
});
vi.mock('@/components/profile/profile-context', () => ({ useProfile: mocks.useProfile }));
vi.mock('@/components/profile/profile-details-form', () => ({
  ProfileDetailsForm: () => createElement('div', null, 'details'),
}));
vi.mock('@/components/profile/profile-name-form', () => ({
  ProfileNameForm: () => createElement('div', null, 'name'),
}));
vi.mock('@/components/profile/connections-card', () => ({
  ConnectionsCard: () => createElement('div', null, 'connections'),
}));

import AccountSettingsPage from './page';

function textContent(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (typeof node === 'object' && node !== null && 'props' in node) {
    const element = node as { type?: unknown; props: { children?: unknown } };
    if (typeof element.type === 'function') return textContent(element.type(element.props));
    return textContent(element.props.children);
  }
  return '';
}

function findButton(node: unknown): { onClick?: () => void } | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButton(child);
      if (found) return found;
    }
    return null;
  }
  const element = node as { type?: unknown; props?: Record<string, unknown> };
  if (typeof element.type === 'function') return findButton(element.type(element.props));
  if (element.type === 'button') return element.props as { onClick?: () => void };
  return findButton(element.props?.children);
}

describe('account profile loading states', () => {
  it('renders loading feedback while retaining the profile surface', () => {
    mocks.state.isLoading = true;
    mocks.state.isError = false;
    mocks.useProfile.mockReturnValue(mocks.state);

    const tree = AccountSettingsPage();
    expect(textContent(tree)).toContain('name');
    expect(textContent(tree)).toContain('connections');
    expect((tree as { props: { children: unknown } }).props.children).toBeDefined();
  });

  it('renders an error retry action and invokes the supplied retry callback', () => {
    mocks.state.isLoading = false;
    mocks.state.isError = true;
    mocks.state.retry.mockReset();
    mocks.useProfile.mockReturnValue(mocks.state);

    const tree = AccountSettingsPage();
    expect(textContent(tree)).toContain('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    const button = findButton(tree);
    expect(button).not.toBeNull();
    if (!button) throw new Error('Expected retry button');

    const { onClick } = button;
    expect(onClick).toBeDefined();
    if (!onClick) throw new Error('Expected retry button callback');
    onClick();
    expect(mocks.state.retry).toHaveBeenCalledOnce();
  });
});
