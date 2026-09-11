import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  refetchRoles: vi.fn(),
  useGetRolesQuery: vi.fn(),
  useDeleteRoleMutation: vi.fn(),
}));

vi.mock('@mantine/core', () => {
  const element = (tag: string) => {
    const Component = (props: Record<string, unknown>) =>
      createElement(tag, props, props.children as never);
    Component.displayName = tag;
    return Component;
  };

  return {
    ActionIcon: element('button'),
    Alert: element('div'),
    Badge: element('span'),
    Box: element('div'),
    Button: element('button'),
    Center: element('div'),
    Group: element('div'),
    Loader: element('span'),
    Menu: {
      Target: element('div'),
      Dropdown: element('div'),
      Item: element('button'),
    },
    Paper: element('div'),
    Stack: element('div'),
    Table: element('table'),
    Text: element('p'),
  };
});

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('@tabler/icons-react', () => {
  const icon = () => null;
  return {
    IconAlertCircle: icon,
    IconDots: icon,
    IconLock: icon,
    IconPencil: icon,
    IconPlus: icon,
    IconRefresh: icon,
    IconShieldCheck: icon,
    IconTrash: icon,
  };
});
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('next/navigation', () => ({ useParams: () => ({ organizationSlug: 'acme' }) }));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({ loadFailed: 'Unable to load roles', retry: 'Retry' })[key] ?? key,
}));
vi.mock('@/components/page-header', () => ({ PageHeader: () => createElement('header') }));
vi.mock('@/routes', () => ({ getPath: () => '/roles' }));
vi.mock('@/lib/features/organization/organization-provider', () => ({
  useOrganizationContext: () => ({
    activeOrganization: {
      id: 'organization-id',
      type: 'SHARED',
      role: { isOwner: true, permissions: [] },
    },
  }),
}));
vi.mock('@/lib/features/organization/organization-members-api', () => ({
  useGetRolesQuery: mocks.useGetRolesQuery,
  useDeleteRoleMutation: mocks.useDeleteRoleMutation,
}));
vi.mock('./role-form-schema', () => ({
  ORGANIZATION_MANAGE_PERMISSION: 'organization.manage',
  ORGANIZATION_MANAGE_PROJECT_PERMISSION: 'organization.manage_project',
}));
vi.mock('./roles-page.module.css', () => ({ default: {} }));

import OrganizationRolesPage from './page';

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
  if (element.type === 'button') return element.props as { onClick?: () => void };
  if (typeof element.type === 'function') return findButton(element.type(element.props));
  return findButton(element.props?.children);
}

describe('organization roles loading errors', () => {
  it('renders a retry action that refetches roles', () => {
    mocks.refetchRoles.mockReset();
    mocks.useGetRolesQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
      refetch: mocks.refetchRoles,
    });
    mocks.useDeleteRoleMutation.mockReturnValue([vi.fn(), { isLoading: false }]);

    const button = findButton(OrganizationRolesPage());

    expect(button).not.toBeNull();
    if (!button?.onClick) throw new Error('Expected retry button');
    button.onClick();
    expect(mocks.refetchRoles).toHaveBeenCalledOnce();
  });
});
