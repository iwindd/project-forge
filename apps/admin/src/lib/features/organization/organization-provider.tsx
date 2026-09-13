'use client';

import { useGetOrganizationsQuery } from './organization-api';
import { resolveOrganizationFromRoute } from './organization-context';
import type { Organization } from './types';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type OrganizationContextValue = {
  organizations: Organization[];
  activeId: string | null;
  activeOrganization: Organization | undefined;
  pending: boolean;
  loadOrganizations: () => Promise<void>;
  switchOrganization: (id: string | null) => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({
  children,
  organizationSlug,
  organizationId,
}: Readonly<{
  children: ReactNode;
  organizationSlug: string;
  organizationId: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [switchPending, setSwitchPending] = useState(false);
  const {
    data: organizations = [],
    isFetching,
    refetch,
  } = useGetOrganizationsQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });

  const activeOrganization = useMemo(
    () => resolveOrganizationFromRoute(organizations, organizationSlug, organizationId),
    [organizationId, organizationSlug, organizations],
  );

  const loadOrganizations = useCallback(async () => {
    await refetch().unwrap();
  }, [refetch]);

  const switchOrganization = useCallback(
    async (id: string | null) => {
      if (!id || id === activeOrganization?.id) return;

      const organization = organizations.find((candidate) => candidate.id === id);
      if (!organization) return;

      setSwitchPending(true);
      try {
        const suffix = pathname.split('/').filter(Boolean).slice(1).join('/');
        router.push(`/${encodeURIComponent(organization.slug)}${suffix ? `/${suffix}` : ''}`);
      } finally {
        setSwitchPending(false);
      }
    },
    [activeOrganization?.id, organizations, pathname, router],
  );

  const value = useMemo(
    () => ({
      organizations,
      activeId: activeOrganization?.id ?? null,
      activeOrganization,
      pending: isFetching || switchPending,
      loadOrganizations,
      switchOrganization,
    }),
    [activeOrganization, isFetching, loadOrganizations, organizations, switchOrganization, switchPending],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOptionalOrganizationContext() {
  return useContext(OrganizationContext);
}

export function useOrganizationContext() {
  const context = useOptionalOrganizationContext();

  if (!context) {
    throw new Error('useOrganizationContext must be used inside OrganizationProvider');
  }

  return context;
}
