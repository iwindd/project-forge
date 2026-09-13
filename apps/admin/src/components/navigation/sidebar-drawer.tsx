'use client';

import type { AdminUser } from '@/session';
import { Drawer } from '@mantine/core';
import type { SidebarNavigationMode } from './navigation-utils';
import { SIDEBAR_WIDTH } from './sidebar-constants';
import classes from './sidebar-drawer.module.css';
import SidebarDefault from './sidebar-default';

type SidebarDrawerProps = {
  opened: boolean;
  onCloseAction: () => void;
  user: AdminUser;
  organizationSlug?: string;
  navigationMode?: SidebarNavigationMode;
};

export default function SidebarDrawer({
  opened,
  onCloseAction,
  user,
  organizationSlug,
  navigationMode = 'app',
}: SidebarDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onCloseAction}
      padding={0}
      position='left'
      size={SIDEBAR_WIDTH}
      hiddenFrom='sm'
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      classNames={{
        body: classes.mobileDrawerBody,
        content: classes.mobileDrawerContent,
      }}
    >
      <SidebarDefault
        user={user}
        organizationSlug={organizationSlug}
        navigationMode={navigationMode}
        onNavigateAction={onCloseAction}
      />
    </Drawer>
  );
}
