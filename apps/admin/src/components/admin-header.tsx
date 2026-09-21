'use client';

import { ActionIcon, Box, Burger, Group, Text, Tooltip } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useActiveRouteTrail } from '@/hooks';
import { useGetSharedAgentsQuery } from '@/lib/features/hermes-agents/hermes-agents-api';
import { useGetHermesSessionsQuery } from '@/lib/features/hermes-sessions/hermes-sessions-api';
import { useHermesChatTitles } from './hermes-chat-title-context';
import type { SidebarNavigationMode } from './navigation/navigation-utils';
import { getHermesChatHeaderTitle } from './hermes-session-title';
import { AdminBrand } from './admin-brand';
import classes from './admin-header.module.css';

export function AdminHeader({
  navigationMode,
  mobileOpened,
  onToggleMobileAction,
  onOpenSettingsAction,
}: {
  navigationMode: SidebarNavigationMode;
  mobileOpened: boolean;
  onToggleMobileAction: () => void;
  onOpenSettingsAction: () => void;
}) {
  const t = useTranslations('Navigation');
  const routeTrail = useActiveRouteTrail();
  const { optimisticTitles, optimisticAgentNames } = useHermesChatTitles();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const shouldLoadHermesSessionData = navigationMode === 'hermes' && Boolean(sessionId);
  const { data: sessions = [] } = useGetHermesSessionsQuery(undefined, {
    skip: !shouldLoadHermesSessionData,
    refetchOnMountOrArgChange: 30,
  });
  const { data: agentRoster } = useGetSharedAgentsQuery(undefined, {
    skip: !shouldLoadHermesSessionData,
    refetchOnMountOrArgChange: 30,
  });
  const currentRoute = routeTrail[routeTrail.length - 1];
  const activeSession = sessionId ? sessions.find((session) => session.id === sessionId) : null;
  const activeAgentName = sessionId
    ? agentRoster?.agents.find((agent) => agent.handle === activeSession?.agentHandle)?.displayName ??
      optimisticAgentNames[sessionId] ??
      activeSession?.agentHandle ??
      null
    : null;
  const optimisticTitle = sessionId ? optimisticTitles[sessionId] : undefined;
  const routeTitle = currentRoute
    ? currentRoute.navigationLabelKey
      ? t(currentRoute.navigationLabelKey)
      : (currentRoute.navigationLabel ?? currentRoute.label)
    : '';
  const pageTitle =
    navigationMode === 'hermes' && sessionId
      ? getHermesChatHeaderTitle(
          activeAgentName,
          { title: activeSession?.title.trim() || optimisticTitle || '', preview: activeSession?.preview ?? '' },
          routeTitle || t('chat'),
        )
      : routeTitle;

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
