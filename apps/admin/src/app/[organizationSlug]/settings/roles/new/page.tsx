"use client";

import { PageHeader } from "@/admin/components/page-header";
import { useCreateRoleMutation } from "@/lib/features/organization/organization-members-api";
import { useOrganizationContext } from "@/lib/features/organization/organization-provider";
import { getPath } from "@/admin/routes";
import { Alert, Box } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { OrganizationRoleForm } from "../role-form";
import {
  EMPTY_ORGANIZATION_ROLE_FORM,
  ORGANIZATION_MANAGE_PERMISSION,
  type OrganizationRoleFormValues,
} from "../role-form-schema";
import classes from "../roles-page.module.css";

export default function NewOrganizationRolePage() {
  const t = useTranslations("OrganizationRoles");
  const router = useRouter();
  const { organizationSlug } = useParams<{ organizationSlug?: string }>();
  const { activeOrganization } = useOrganizationContext();
  const organizationId = activeOrganization?.id ?? "";
  const rolesPath = organizationSlug
    ? getPath("settings.roles", { organizationSlug })
    : "#";
  const canManage = Boolean(
    activeOrganization?.type === "SHARED" &&
      (activeOrganization.role.isOwner ||
        activeOrganization.role.permissions.includes(ORGANIZATION_MANAGE_PERMISSION)),
  );
  const [createRole, { isLoading }] = useCreateRoleMutation();

  const submit = async (values: OrganizationRoleFormValues) => {
    if (!organizationId || rolesPath === "#") return;

    try {
      await createRole({
        organizationId,
        name: values.name.trim(),
        permissions: values.permissions,
      }).unwrap();
      notifications.show({ message: t("saveSuccess"), color: "teal" });
      router.push(rolesPath);
    } catch {
      notifications.show({ message: t("saveFailed"), color: "red" });
    }
  };

  return (
    <Box className={classes.page}>
      <PageHeader
        title={t("createTitle")}
        subtitle={t("createSubtitle")}
        backTo={rolesPath === "#" ? undefined : rolesPath}
      />

      {!canManage ? (
        <Alert color="gray" icon={<IconAlertCircle size={18} />}>
          {activeOrganization?.type === "PERSONAL"
            ? t("personalNotice")
            : t("permissionNotice")}
        </Alert>
      ) : (
        <OrganizationRoleForm
          initialValues={EMPTY_ORGANIZATION_ROLE_FORM}
          pending={isLoading}
          cancelHref={rolesPath}
          onSubmitAction={submit}
        />
      )}
    </Box>
  );
}
