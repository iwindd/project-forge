'use client';

import { Anchor, Box, Drawer, ScrollArea } from '@mantine/core';
import Link from 'next/link';
import { AdminBrand } from '../admin-brand';
import SidebarNavContent from './sidebar-nav-content';

export default function SidebarDrawer({
  opened,
  onCloseAction,
  homeHref,
}: {
  opened: boolean;
  onCloseAction: () => void;
  homeHref: string;
}) {
  return (
    <Drawer
      opened={opened}
      onClose={onCloseAction}
      padding={0}
      position='left'
      size={300}
      withCloseButton={false}
      hiddenFrom='xs'
      overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      title={
        <Box ps='md'>
          <Anchor component={Link} href={homeHref} underline='never' onClick={onCloseAction}>
            <AdminBrand />
          </Anchor>
        </Box>
      }
    >
      <ScrollArea h='calc(100dvh - 72px)' px='md'>
        <SidebarNavContent onNavigateAction={onCloseAction} />
      </ScrollArea>
    </Drawer>
  );
}
