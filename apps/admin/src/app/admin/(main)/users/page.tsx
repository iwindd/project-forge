"use client";

import { PageHeader } from "@/admin/components/page-header";
import { UsersTable } from "@/app/admin/(main)/users/components/users-table";
import { Container } from "@mantine/core";
import { useTranslations } from "next-intl";

export default function AdminUsersPage() {
  const t = useTranslations("Users");

  return (
    <Container w="100%" size="xl">
      <PageHeader title={t("title")} />
      <UsersTable />
    </Container>
  );
}
