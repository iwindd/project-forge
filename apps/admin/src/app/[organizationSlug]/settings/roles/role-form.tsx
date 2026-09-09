"use client";

import { schemaResolver, useForm } from "@mantine/form";
import { Button, Checkbox, Group, Paper, Stack, TextInput } from "@mantine/core";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ORGANIZATION_MANAGE_PERMISSION,
  organizationRoleFormSchema,
  type OrganizationRoleFormValues,
} from "./role-form-schema";
import classes from "./roles-page.module.css";

type OrganizationRoleFormProps = {
  initialValues: OrganizationRoleFormValues;
  pending?: boolean;
  cancelHref: string;
  onSubmitAction: (values: OrganizationRoleFormValues) => void | Promise<void>;
};

export function OrganizationRoleForm({
  initialValues,
  pending = false,
  cancelHref,
  onSubmitAction,
}: OrganizationRoleFormProps) {
  const t = useTranslations("OrganizationRoles");
  const form = useForm<OrganizationRoleFormValues>({
    initialValues,
    validate: schemaResolver(organizationRoleFormSchema),
    validateInputOnBlur: true,
  });

  return (
    <Paper className={classes.card} withBorder radius="md" p="lg">
      <form onSubmit={form.onSubmit(onSubmitAction)}>
        <Stack gap="md">
          <TextInput
            label={t("roleName")}
            placeholder={t("roleNamePlaceholder")}
            {...form.getInputProps("name")}
            required
            autoFocus
          />
          <Checkbox
            label={t("manageOrganization")}
            description={t("manageOrganizationDescription")}
            checked={form.values.permissions.includes(ORGANIZATION_MANAGE_PERMISSION)}
            error={form.errors.permissions}
            onChange={(event) =>
              form.setFieldValue(
                "permissions",
                event.currentTarget.checked
                  ? [ORGANIZATION_MANAGE_PERMISSION]
                  : [],
              )
            }
          />
          <Group justify="flex-end">
            <Button component={Link} href={cancelHref} variant="default" type="button">
              {t("cancel")}
            </Button>
            <Button type="submit" loading={pending || form.submitting}>
              {t("save")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
