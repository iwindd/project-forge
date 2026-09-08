'use client';

import { ActionIcon, Affix, AppShell, Box, Center, Loader, Stack, Text, Transition } from '@mantine/core';
import { useDisclosure, useMediaQuery, useWindowScroll } from '@mantine/hooks';
import { IconArrowUp, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useGetMeQuery } from '@/store/api';
import { useAppDispatch, useAppSelector } from '../hooks';
import { setLayoutMode } from '../features/layout/layout-slice';
import { AdminHeader } from './admin-header';
import { AdminSettingsDrawer } from './admin-settings-drawer';
import classes from './admin-shell.module.css';
import SidebarCompact from './navigation/sidebar-compact';
import SidebarDefault from './navigation/sidebar-default';
import SidebarDrawer from './navigation/sidebar-drawer';

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useGetMeQuery();
  const { layoutMode, navColor, isHydrated } = useAppSelector((state) => state.layout);
  const [mobileOpened, mobileHandlers] = useDisclosure(false);
  const [settingsOpened, settingsHandlers] = useDisclosure(false);
  const drawerScreen = useMediaQuery('(max-width: 35.999em)') ?? false;
  const autoCompactScreen = useMediaQuery('(min-width: 36em) and (max-width: 74.999em)') ?? false;
  const [scroll, scrollTo] = useWindowScroll();
  const effectiveMode = drawerScreen
    ? 'default'
    : autoCompactScreen && layoutMode === 'default'
      ? 'compact'
      : layoutMode;
  const isAdminRoute = pathname.startsWith('/admin');
  const homeHref = isAdminRoute ? '/admin' : '/projects';
  const nextMode = effectiveMode === 'default' ? 'compact' : 'default';

  useEffect(() => {
    if (isLoading) return;
    const status = (error as { status?: number } | undefined)?.status;
    if (status === 401 || !data?.user) {
      router.replace('/login');
      return;
    }
    if (data.user.accessStatus !== 'APPROVED') {
      router.replace(data.user.accessStatus === 'PENDING' ? '/access-pending' : '/access-blocked');
      return;
    }
    if (isAdminRoute && data.user.role !== 'ADMIN') router.replace('/projects');
  }, [data?.user, error, isAdminRoute, isLoading, router]);

  if (isLoading)
    return (
      <Center mih='100dvh'>
        <Stack align='center' gap='sm'>
          <Loader color='brand' size='sm' />
          <Text size='sm' c='dimmed'>
            กำลังตรวจสอบ session…
          </Text>
        </Stack>
      </Center>
    );
  if (!data?.user || error) return null;

  return (
    <AppShell
      padding={0}
      layout='alt'
      header={{ height: 72 }}
      navbar={{ width: effectiveMode === 'compact' ? 90 : 300, breakpoint: 'xs', collapsed: { mobile: true } }}
      className={classes.appShell}
      data-nav-color={navColor}
    >
      <AppShell.Header className={classes.header} data-scrolled={scroll.y > 0}>
        <AdminHeader
          user={data.user}
          mobileOpened={mobileOpened}
          onToggleMobileAction={mobileHandlers.toggle}
          onOpenSettingsAction={settingsHandlers.open}
          showBrand={drawerScreen || effectiveMode === 'compact'}
        />
      </AppShell.Header>
      <AppShell.Navbar className={classes.navbar}>
        <Box className={classes.sidebarToggleWrapper} hiddenFrom='lg'>
          <ActionIcon
            className={classes.sidebarToggle}
            variant='default'
            radius='xl'
            size='sm'
            aria-label={nextMode === 'default' ? 'ขยายเมนู' : 'ย่อเมนู'}
            onClick={() => dispatch(setLayoutMode(nextMode))}
          >
            {effectiveMode === 'compact' ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          </ActionIcon>
        </Box>
        {effectiveMode === 'compact' ? <SidebarCompact homeHref={homeHref} /> : <SidebarDefault homeHref={homeHref} />}
      </AppShell.Navbar>
      <SidebarDrawer opened={mobileOpened} onCloseAction={mobileHandlers.close} homeHref={homeHref} />
      <AppShell.Main className={classes.main}>
        <Box className={classes.mainContent}>{children}</Box>
      </AppShell.Main>
      <AdminSettingsDrawer opened={settingsOpened} onCloseAction={settingsHandlers.close} />
      <Transition transition='slide-up' mounted={scroll.y > 320}>
        {(styles) => (
          <Affix position={{ bottom: 24, right: 24 }} style={styles}>
            <ActionIcon size='lg' radius='xl' variant='filled' aria-label='กลับด้านบน' onClick={() => scrollTo({ y: 0 })}>
              <IconArrowUp size={19} />
            </ActionIcon>
          </Affix>
        )}
      </Transition>
      {!isHydrated && <Box className={classes.hydrationCover} />}
    </AppShell>
  );
}
