"use client";


import { AppBreadcrumbs } from "@/admin/components/app-breadcrumbs";
import { PageHeader } from "@/admin/components/page-header";
import {
  SidebarTabs,
  type SidebarTabItem,
} from "@/admin/components/sidebar-tabs";
import { getPath } from "@/routes";
import { Box, Container, Flex } from "@mantine/core";
import { IconHistory, IconUser } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { useUser } from "./user-context";

/**
 * Shared frame for every managed-user route. Tabs are real links so the
 * browser keeps canonical URLs, prefetching and open-in-new-tab behaviour.
 */
export function UserDetailShell({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { organizationSlug } = useParams<{ organizationSlug: string }>();
  const profilePath = getPath("system.users.profile", {
    organizationSlug,
    userId: user.id,
  });
  const loggingPath = getPath("system.users.logging", {
    organizationSlug,
    userId: user.id,
  });
  const tabs: SidebarTabItem[] = [
    {
      href: profilePath,
      icon: <IconUser size={20} />,
      label: "แก้ไขรายการ",
    },
    {
      href: loggingPath,
      icon: <IconHistory size={20} />,
      label: "ประวัติการทำรายการ",
    },
  ];

  return (
    <Container w="100%" size="xl">
      <PageHeader
        title={user.name}
        breadcrumbs={<AppBreadcrumbs />}
        backTo={getPath("system.users", { organizationSlug })}
      />
      <Flex
        align="flex-start"
        direction={{ base: "column", sm: "row" }}
        gap={{ base: "lg", sm: "xl" }}
        mb="lg"
      >
        <SidebarTabs
          ariaLabel="หน้าของผู้ใช้งาน"
          drawerTitle={`เมนูของ ${user.name}`}
          items={tabs}
        />
        <Box flex={1} miw={0} w={{ base: "100%", sm: "auto" }}>
          {children}
        </Box>
      </Flex>
    </Container>
  );
}
