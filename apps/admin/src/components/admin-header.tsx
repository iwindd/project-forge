'use client';

import { ActionIcon, Box, Burger, Group, Text, Tooltip } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useActiveRouteTrail } from '@/hooks';
import { AdminBrand } from './admin-brand';
import classes from './admin-header.module.css';

export function AdminHeader({
  mobileOpened,
  onToggleMobileAction,
  onOpenSettingsAction,
}: {
  mobileOpened: boolean;
  onToggleMobileAction: () => void;
  onOpenSettingsAction: () => void;
}) {
  const t = useTranslations('Navigation');
  const routeTrail = useActiveRouteTrail();
  const currentRoute = routeTrail[routeTrail.length - 1];
  const pageTitle = currentRoute
    ? currentRoute.navigationLabelKey
      ? t(currentRoute.navigationLabelKey)
      : (currentRoute.navigationLabel ?? currentRoute.label)
    : '';

  return (
    <Group className={classes.headerInner} justify='space-between' wrap='nowrap'>
      <Group gap='sm' wrap='nowrap'>
        <Burger
          opened={mobileOpened}
          onClick={onToggleMobileAction}
          aria-expanded={mobileOpened}
          aria-label={mobileOpened ? t('closeMenu') : t('openMenu')}
          size='sm'
          hiddenFrom='sm'
        />
        <Box hiddenFrom='sm'>
          <AdminBrand />
        </Box>
      </Group>

      <Text className={classes.pageTitle} size='sm' fw={600} truncate>
        {pageTitle}
      </Text>

      <Group gap='xs' wrap='nowrap'>
        <Tooltip label={t('settings')}>
          <ActionIcon
            variant='subtle'
            radius='lg'
            size='lg'
            aria-label={t('openSettings')}
            onClick={onOpenSettingsAction}
          >
            <IconSettings style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
