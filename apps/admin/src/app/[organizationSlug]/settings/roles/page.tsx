"use client";

import { PageHeader } from "@/components/page-header";
import {
  useDeleteRoleMutation,
  useGetRolesQuery,
  type OrganizationRoleSummary,
} from "@/lib/features/organization/organization-members-api";
import { useOrganizationContext } from "@/lib/features/organization/organization-provider";
import { getPath } from "@/routes";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Menu,
  Paper,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconDots, IconLock, IconPencil, IconPlus, IconShieldCheck, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ORGANIZATION_MANAGE_PERMISSION,
  ORGANIZATION_MANAGE_PROJECT_PERMISSION,
} from "./role-form-schema";
import classes from "./roles-page.module.css";

export default function OrganizationRolesPage() {
  const t = useTranslations("OrganizationRoles");
  const { organizationSlug } = useParams<{ organizationSlug?: string }>();
  const { activeOrganization } = useOrganizationContext();
  const organizationId = activeOrganization?.id ?? "";
  const newRolePath = organizationSlug
    ? getPath("settings.roles.new", { organizationSlug })
    : "#";
  const canManage = Boolean(
    activeOrganization?.type === "SHARED" &&
      (activeOrganization.role.isOwner ||
        activeOrganization.role.permissions.includes(ORGANIZATION_MANAGE_PERMISSION)),
  );
  const { data, isFetching, isError } = useGetRolesQuery(
    { organizationId },
    { skip: !organizationId || !canManage },
  );
  const [deleteRole, { isLoading: deletePending }] = useDeleteRoleMutation();

  const roles = data?.data ?? [];

  const remove = async (role: OrganizationRoleSummary) => {
    if (!organizationId || !role.id || role.isOwner) return;
    if (!window.confirm(t("deleteConfirm", { name: role.name }))) return;
    try {
      await deleteRole({ organizationId, roleId: role.id }).unwrap();
      notifications.show({ message: t("deleteSuccess"), color: "teal" });
    } catch {
      notifications.show({ message: t("deleteFailed"), color: "red" });
    }
  };

  return (
    <Box className={classes.page}>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        rightSection={
          <Button
            component={Link}
            href={newRolePath}
            leftSection={<IconPlus size={16} />}
            disabled={!canManage}
          >
            {t("create")}
          </Button>
        }
      />

      {!canManage ? (
        <Alert color="gray" icon={<IconAlertCircle size={18} />}>
          {activeOrganization?.type === "PERSONAL" ? t("personalNotice") : t("permissionNotice")}
        </Alert>
      ) : isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {t("loadFailed")}
        </Alert>
      ) : (
        <Paper className={classes.card} withBorder radius="md">
          {isFetching ? (
            <Center className={classes.emptyState}>
              <Loader size="sm" />
            </Center>
          ) : roles.length ? (
            <Box className={classes.tableScroll}>
              <Table className={classes.table} verticalSpacing="sm">
                <thead>
                  <tr>
                    <th>{t("role")}</th>
                    <th>{t("permissions")}</th>
                    <th>{t("members")}</th>
                    <th>{t("invitations")}</th>
                    <th aria-label={t("actions")} />
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id ?? role.name}>
                      <td>
                        <Group gap="xs" wrap="nowrap">
                          {role.isOwner ? <IconLock size={16} /> : <IconShieldCheck size={16} />}
                          <Stack gap={0}>
                            <Text fw={600}>{role.name}</Text>
                            {role.isOwner ? <Text size="xs" c="dimmed">{t("systemRole")}</Text> : null}
                          </Stack>
                        </Group>
                      </td>
                      <td>
                        {role.permissions.includes(ORGANIZATION_MANAGE_PERMISSION) ? (
                          <Badge variant="light">{t("manageOrganization")}</Badge>
                        ) : null}
                        {role.permissions.includes(ORGANIZATION_MANAGE_PROJECT_PERMISSION) ? (
                          <Badge variant="light">{t("manageProject")}</Badge>
                        ) : null}
                        {!role.permissions.includes(ORGANIZATION_MANAGE_PERMISSION) &&
                        !role.permissions.includes(ORGANIZATION_MANAGE_PROJECT_PERMISSION) ? (
                          <Text size="sm" c="dimmed">{t("noPermissions")}</Text>
                        ) : null}
                      </td>
                      <td>{role.memberCount ?? 0}</td>
                      <td>{role.invitationCount ?? 0}</td>
                      <td>
                        {!role.isOwner && role.id ? (
                          <Menu shadow="md" position="bottom-end">
                            <Menu.Target>
                              <ActionIcon variant="subtle" aria-label={`${t("actions")}: ${role.name}`}>
                                <IconDots size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                component={Link}
                                href={
                                  organizationSlug
                                    ? getPath("settings.roles.edit", {
                                        organizationSlug,
                                        roleId: role.id,
                                      })
                                    : "#"
                                }
                                leftSection={<IconPencil size={16} />}
                              >
                                {t("edit")}
                              </Menu.Item>
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={16} />}
                                disabled={
                                  deletePending ||
                                  role.legacyRole !== null ||
                                  (role.memberCount ?? 0) > 0 ||
                                  (role.invitationCount ?? 0) > 0
                                }
                                onClick={() => void remove(role)}
                              >
                                {t("delete")}
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Box>
          ) : (
            <Stack className={classes.emptyState} align="center" justify="center" gap="xs">
              <IconShieldCheck size={28} stroke={1.5} />
              <Text c="dimmed">{t("noRoles")}</Text>
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}
