"use client";

import { PageHeader } from "@/admin/components/page-header";
import {
  SidebarTabs,
  type SidebarTabItem,
} from "@/admin/components/sidebar-tabs";
import { getPath } from "@/admin/routes";
import { Box, Container, Flex } from "@mantine/core";
import { IconHistory, IconUser } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

export function ProfileShell({ children }: { children: ReactNode }) {
  const { organizationSlug } = useParams<{ organizationSlug: string }>();
  const profilePath = getPath("profile", { organizationSlug });
  const loggingPath = getPath("profile.logging", { organizationSlug });
  const tabs: SidebarTabItem[] = [
    {
      href: profilePath,
      icon: <IconUser size={20} />,
      label: "ข้อมูลบัญชี",
    },
    {
      href: loggingPath,
      icon: <IconHistory size={20} />,
      label: "ประวัติการทำรายการ",
    },
  ];

  return (
    <Container w="100%" size="xl">
      <PageHeader title="บัญชีของฉัน" />
      <Flex
        align="flex-start"
        direction={{ base: "column", sm: "row" }}
        gap={{ base: "lg", sm: "xl" }}
        mb="lg"
      >
        <SidebarTabs
          ariaLabel="หน้าของบัญชีฉัน"
          drawerTitle="เมนูบัญชีของฉัน"
          items={tabs}
        />
        <Box flex={1} miw={0} w={{ base: "100%", sm: "auto" }}>
          {children}
        </Box>
      </Flex>
    </Container>
  );
}
