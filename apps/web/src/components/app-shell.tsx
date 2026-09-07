'use client';

import {
  Avatar,
  Badge,
  Box,
  Burger,
  Center,
  Divider,
  Group,
  Loader,
  AppShell as MantineAppShell,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronRight,
  IconFolders,
  IconGitBranch,
  IconLayoutDashboard,
  IconLogout,
  IconShield,
  IconUsers,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useGetMeQuery, useLogoutMutation } from '@/store/api';

function getErrorMessage(error: unknown) {
  const payload = error as { data?: { message?: string | string[] } } | undefined;
  const message = payload?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || 'ไม่สามารถตรวจสอบ session ได้';
}

function pageTitle(pathname: string) {
  if (pathname === '/projects' || pathname === '/') return 'Projects';
  if (pathname === '/projects/new') return 'Add project';
  if (pathname.startsWith('/projects/')) return 'Project details';
  if (pathname === '/admin') return 'Admin overview';
  if (pathname.startsWith('/admin/users')) return 'Users';
  if (pathname.startsWith('/admin/access-requests')) return 'Access requests';
  return 'Project Forge';
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpened, setMobileOpened] = useState(false);
  const { data, isLoading, error } = useGetMeQuery();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  const user = data?.user;
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (pathname) setMobileOpened(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;
    if (error) {
      if ((error as { status?: number }).status === 401) router.replace('/login');
      return;
    }
    if (!user) return;
    if (user.accessStatus !== 'APPROVED') {
      router.replace(user.accessStatus === 'PENDING' ? '/access-pending' : '/access-blocked');
      return;
    }
    if (isAdminRoute && user.role !== 'ADMIN') router.replace('/projects');
  }, [error, isAdminRoute, isLoading, router, user]);

  const navItems = useMemo(
    () => [
      { href: '/projects', label: 'Projects', icon: IconFolders },
      ...(user?.role === 'ADMIN'
        ? [
            { href: '/admin', label: 'Admin overview', icon: IconLayoutDashboard },
            { href: '/admin/users', label: 'Users', icon: IconUsers },
            { href: '/admin/access-requests', label: 'Access requests', icon: IconShield },
          ]
        : []),
    ],
    [user?.role],
  );

  async function handleLogout() {
    await logout()
      .unwrap()
      .catch(() => undefined);
    router.replace('/login');
  }

  if (isLoading) {
    return (
      <Center mih='100dvh' bg='var(--mantine-color-body)'>
        <Stack align='center' gap='sm'>
          <Loader color='brandBlue' size='sm' />
          <Text size='sm' c='dimmed'>
            กำลังตรวจสอบ session…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center mih='100dvh' p='xl'>
        <Stack maw={440} align='center' gap='sm'>
          <Text fw={700}>ไม่สามารถเปิด workspace ได้</Text>
          <Text c='dimmed' ta='center' size='sm'>
            {getErrorMessage(error)}
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!user) return null;

  return (
    <MantineAppShell
      header={{ height: 72 }}
      navbar={{ width: 292, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding={0}
      layout='alt'
    >
      <MantineAppShell.Header className='forge-header'>
        <Group h='100%' px={{ base: 'md', sm: 'xl' }} justify='space-between' wrap='nowrap'>
          <Group gap='sm' wrap='nowrap'>
            <Burger
              hiddenFrom='sm'
              opened={mobileOpened}
              onClick={() => setMobileOpened((opened) => !opened)}
              aria-label={mobileOpened ? 'ปิดเมนู' : 'เปิดเมนู'}
            />
            <Group gap='sm' wrap='nowrap'>
              <ThemeIcon variant='light' color='brandBlue' radius='md' size={38}>
                <IconGitBranch size={21} stroke={1.8} />
              </ThemeIcon>
              <Box visibleFrom='sm'>
                <Text fw={700} size='lg' lh={1.1} style={{ fontFamily: 'var(--font-prompt), sans-serif' }}>
                  PROJECT FORGE
                </Text>
                <Text size='xs' c='dimmed' lh={1.2}>
                  private workspace
                </Text>
              </Box>
            </Group>
          </Group>
          <Group gap='sm' wrap='nowrap'>
            <Text size='sm' c='dimmed' visibleFrom='md'>
              {pageTitle(pathname)}
            </Text>
            <Badge variant='light' color='brandBlue' size='lg'>
              Phase 1
            </Badge>
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar className='forge-navbar'>
        <MantineAppShell.Section grow component={ScrollArea} px='sm' py='md'>
          <Stack gap={5}>
            <Text size='xs' fw={700} c='dimmed' tt='uppercase' px='sm' mb={4}>
              Workspace
            </Text>
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                leftSection={<item.icon size={20} stroke={1.8} />}
                rightSection={<IconChevronRight size={15} stroke={1.7} />}
                active={pathname === item.href || (item.href !== '/projects' && pathname.startsWith(`${item.href}/`))}
                variant='light'
                onClick={() => setMobileOpened(false)}
              />
            ))}
          </Stack>
        </MantineAppShell.Section>

        <MantineAppShell.Section px='sm' pb='md'>
          <Divider mb='md' />
          <Group gap='sm' px='sm' mb='sm' wrap='nowrap'>
            <Avatar src={user.avatarUrl} color='brandBlue' radius='xl' size={36}>
              {(user.name || user.githubLogin).slice(0, 1).toUpperCase()}
            </Avatar>
            <Box miw={0} style={{ flex: 1 }}>
              <Text size='sm' fw={600} truncate>
                {user.name || user.githubLogin}
              </Text>
              <Text size='xs' c='dimmed' truncate>
                @{user.githubLogin}
              </Text>
            </Box>
          </Group>
          <UnstyledButton className='forge-signout' onClick={() => void handleLogout()} disabled={loggingOut}>
            <IconLogout size={18} stroke={1.8} />
            <Text size='sm'>{loggingOut ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}</Text>
          </UnstyledButton>
        </MantineAppShell.Section>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main className='forge-main'>
        <Box maw={1440} mx='auto' px={{ base: 'md', sm: 'xl', lg: '3xl' }} py={{ base: 'xl', sm: '2xl' }}>
          {children}
        </Box>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
