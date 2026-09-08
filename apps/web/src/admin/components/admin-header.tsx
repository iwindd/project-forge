'use client';

import { ActionIcon, Avatar, Box, Burger, Button, Group, Menu, Text, Tooltip } from '@mantine/core';
import { IconFolder, IconLogout, IconSettings } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogoutMutation } from '@/store/api';
import type { User } from '@/lib/api';
import { AdminBrand } from './admin-brand';
import classes from './admin-header.module.css';

export function AdminHeader({
  user,
  mobileOpened,
  onToggleMobileAction,
  onOpenSettingsAction,
  showBrand,
}: {
  user: User;
  mobileOpened: boolean;
  onToggleMobileAction: () => void;
  onOpenSettingsAction: () => void;
  showBrand: boolean;
}) {
  const router = useRouter();
  const [logout, { isLoading }] = useLogoutMutation();
  const displayName = user.name || user.githubLogin || 'ผู้ใช้งาน';

  const handleLogout = async () => {
    await logout()
      .unwrap()
      .catch(() => undefined);
    router.replace('/login');
  };

  return (
    <Group className={classes.headerInner} justify='space-between' wrap='nowrap'>
      <Group gap='sm' wrap='nowrap'>
        <Burger
          opened={mobileOpened}
          onClick={onToggleMobileAction}
          aria-expanded={mobileOpened}
          aria-label={mobileOpened ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}
          size='sm'
          hiddenFrom='xs'
        />
        <Box visibleFrom='sm'>{showBrand && <AdminBrand />}</Box>
      </Group>

      <Group gap='xs' wrap='nowrap'>
        <Button
          component={Link}
          href='/projects'
          variant='default-subtle'
          size='sm'
          className={classes.workspaceButton}
          leftSection={<IconFolder size={17} />}
        >
          Projects
        </Button>
        <Tooltip label='การตั้งค่า'>
          <ActionIcon
            variant='default-subtle'
            radius='lg'
            size='lg'
            aria-label='เปิดการตั้งค่า'
            onClick={onOpenSettingsAction}
          >
            <IconSettings style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
        <Menu position='bottom-end' width={220}>
          <Menu.Target>
            <Button variant='default-subtle' px='xs' h={46}>
              <Group gap='xs' wrap='nowrap'>
                <Avatar src={user.avatarUrl} color='brand' radius='xl' size={32}>
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
                <div className={classes.userDetails}>
                  <Text size='sm' fw={600} maw={130} truncate>
                    {displayName}
                  </Text>
                  <Text size='xs' c='dimmed' ta='left' maw={130} truncate>
                    @{user.githubLogin}
                  </Text>
                </div>
              </Group>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{user.githubLogin}</Menu.Label>
            <Menu.Item color='red' leftSection={<IconLogout size={17} />} onClick={() => void handleLogout()}>
              {isLoading ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
