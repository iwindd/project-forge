'use client';

import { PageHeader } from '@/components/page-header';
import { useGetRolesQuery, useUpdateRoleMutation } from '@/lib/features/organization/organization-members-api';
import { useOrganizationContext } from '@/lib/features/organization/organization-provider';
import { getPath } from '@/routes';
import { Alert, Box, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { OrganizationRoleForm } from '../role-form';
import {
  ORGANIZATION_MANAGE_PERMISSION,
  ORGANIZATION_MANAGE_PROJECT_PERMISSION,
  type OrganizationRoleFormValues,
} from '../role-form-schema';
import classes from '../roles-page.module.css';

export default function EditOrganizationRolePage() {
  const t = useTranslations('OrganizationRoles');
  const router = useRouter();
  const { organizationSlug, roleId } = useParams<{
    organizationSlug?: string;
    roleId?: string;
  }>();
  const { activeOrganization } = useOrganizationContext();
  const organizationId = activeOrganization?.id ?? '';
  const rolesPath = organizationSlug ? getPath('settings.roles', { organizationSlug }) : '#';
  const canManage = Boolean(
    activeOrganization?.type === 'SHARED' &&
      (activeOrganization.role.isOwner || activeOrganization.role.permissions.includes(ORGANIZATION_MANAGE_PERMISSION)),
  );
  const { data, isFetching, isError } = useGetRolesQuery({ organizationId }, { skip: !organizationId || !canManage });
  const [updateRole, { isLoading }] = useUpdateRoleMutation();
  const role = data?.data.find((candidate) => candidate.id === roleId);
  const initialValues: OrganizationRoleFormValues = role
    ? {
        name: role.name,
        permissions: [
          ...(role.permissions.includes(ORGANIZATION_MANAGE_PERMISSION) ? [ORGANIZATION_MANAGE_PERMISSION] : []),
          ...(role.permissions.includes(ORGANIZATION_MANAGE_PROJECT_PERMISSION)
            ? [ORGANIZATION_MANAGE_PROJECT_PERMISSION]
            : []),
        ],
      }
    : { name: '', permissions: [] };

  const submit = async (values: OrganizationRoleFormValues) => {
    if (!organizationId || !roleId || rolesPath === '#') return;

    try {
      await updateRole({
        organizationId,
        roleId,
        name: values.name.trim(),
        permissions: values.permissions,
      }).unwrap();
      notifications.show({ message: t('saveSuccess'), color: 'teal' });
      router.push(rolesPath);
    } catch {
      notifications.show({ message: t('saveFailed'), color: 'red' });
    }
  };

  return (
    <Box className={classes.page}>
      <PageHeader
        title={t('editTitle')}
        subtitle={t('editSubtitle')}
        backTo={rolesPath === '#' ? undefined : rolesPath}
      />

      {!canManage ? (
        <Alert color='gray' icon={<IconAlertCircle size={18} />}>
          {activeOrganization?.type === 'PERSONAL' ? t('personalNotice') : t('permissionNotice')}
        </Alert>
      ) : isFetching ? (
        <Center className={classes.emptyState}>
          <Loader size='sm' />
        </Center>
      ) : isError || !role ? (
        <Alert color='red' icon={<IconAlertCircle size={18} />}>
          {t('roleNotFound')}
        </Alert>
      ) : role.isOwner ? (
        <Alert color='gray' icon={<IconAlertCircle size={18} />}>
          {t('ownerEditNotice')}
        </Alert>
      ) : (
        <OrganizationRoleForm
          initialValues={initialValues}
          pending={isLoading}
          cancelHref={rolesPath}
          onSubmitAction={submit}
        />
      )}
    </Box>
  );
}
