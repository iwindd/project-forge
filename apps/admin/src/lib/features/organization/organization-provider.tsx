"use client";

import { auditLogsApi } from "@/lib/features/audit-log/audit-logs-api";
import { organizationMembersApi } from "@/lib/features/organization/organization-members-api";
import { usersApi } from "@/lib/features/user/users-api";
import { useAppDispatch } from "@/admin/hooks";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addOrganizationHeader,
  getActiveOrganizationId,
  setActiveOrganizationId,
} from "./organization-context";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  type: "PERSONAL" | "SHARED";
  role: {
    id: string | null;
    name: string;
    permissions: string[];
    isOwner: boolean;
    legacyRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  };
};

type OrganizationContextValue = {
  organizations: Organization[];
  activeId: string | null;
  activeOrganization: Organization | undefined;
  pending: boolean;
  loadOrganizations: () => Promise<void>;
  switchOrganization: (id: string | null) => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null,
);
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";

export function OrganizationProvider({
  children,
  organizationSlug,
}: Readonly<{ children: ReactNode; organizationSlug: string }>) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadOrganizations = useCallback(async () => {
    const response = await fetch(`${apiOrigin}/api/v1/organizations`, {
      credentials: "include",
      cache: "no-store",
      headers: addOrganizationHeader(new Headers()),
    });

    if (!response.ok) return;

    const result = (await response.json()) as { data: Organization[] };
    setOrganizations(result.data);

    const stored = getActiveOrganizationId();
    const selected =
      result.data.find((organization) => organization.slug === organizationSlug) ??
      result.data.find((organization) => organization.id === stored) ??
      result.data[0];

    if (selected && selected.id !== stored) {
      setActiveOrganizationId(selected.id);
    }

    setActiveId(selected?.id ?? null);
  }, [organizationSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrganizations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOrganizations]);

  const switchOrganization = useCallback(
    async (id: string | null) => {
      if (!id || id === activeId) return;

      setPending(true);
      try {
        const response = await fetch(
          `${apiOrigin}/api/v1/organizations/${encodeURIComponent(id)}/switch`,
          {
            method: "POST",
            credentials: "include",
          },
        );

        if (!response.ok) return;

        const result = (await response.json()) as {
          organization: Organization;
        };
        setActiveOrganizationId(id);
        setActiveId(id);
        dispatch(usersApi.util.resetApiState());
        dispatch(auditLogsApi.util.resetApiState());
        dispatch(organizationMembersApi.util.resetApiState());
        const organization =
          organizations.find((candidate) => candidate.id === id) ??
          result.organization;

        if (pathname === "/account" || pathname.startsWith("/account/")) {
          router.refresh();
          return;
        }

        if (organization) {
          const suffix = pathname.split("/").filter(Boolean).slice(1).join("/");
          router.push(
            `/${encodeURIComponent(organization.slug)}${suffix ? `/${suffix}` : ""}`,
          );
        } else {
          router.refresh();
        }
      } finally {
        setPending(false);
      }
    },
    [activeId, dispatch, organizations, pathname, router],
  );

  const activeOrganization = organizations.find(
    (organization) => organization.id === activeId,
  );
  const value = useMemo(
    () => ({
      organizations,
      activeId,
      activeOrganization,
      pending,
      loadOrganizations,
      switchOrganization,
    }),
    [
      activeId,
      activeOrganization,
      loadOrganizations,
      organizations,
      pending,
      switchOrganization,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error(
      "useOrganizationContext must be used inside OrganizationProvider",
    );
  }

  return context;
}
