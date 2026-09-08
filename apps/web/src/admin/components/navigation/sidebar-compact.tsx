'use client';

import { Anchor, Group, ScrollArea, Stack, Text } from '@mantine/core';
import Link from 'next/link';
import { useRef } from 'react';
import { AdminBrand } from '../admin-brand';
import NavigationScrollControls from './navigation-scroll-controls';
import { getNavItems, isLinkItem, useFilteredNavGroups, useIsRouteActive } from './navigation-utils';
import classes from './sidebar-compact.module.css';

export default function SidebarCompact({ homeHref }: { homeHref: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const groups = useFilteredNavGroups();
  const isActiveRoute = useIsRouteActive();
  return (
    <aside className={classes.compactSidebar}>
      <Group gap={0} justify='center' w='100%' pb='xs'>
        <Anchor component={Link} href={homeHref} underline='never' aria-label='หน้าหลัก Project Forge'>
          <AdminBrand compact />
        </Anchor>
      </Group>
      <NavigationScrollControls viewportRef={viewportRef}>
        <ScrollArea className={classes.iconSidebarScroll} viewportRef={viewportRef} scrollbars='y' type='always'>
          <Stack gap={4} align='center' pb='xl'>
            {getNavItems(groups).map((item) => {
              if (!isLinkItem(item) || !item.icon) return null;
              const IconComponent = item.icon;
              return (
                <Anchor
                  key={item.id}
                  component={Link}
                  href={item.href}
                  className={classes.compactSidebarItem}
                  data-active={isActiveRoute(item.href)}
                  underline='never'
                  aria-label={item.label}
                >
                  <IconComponent size={24} stroke={1.8} />
                  <Text className={classes.compactSidebarLabel} fw={600} size='xs'>
                    {item.label}
                  </Text>
                </Anchor>
              );
            })}
          </Stack>
        </ScrollArea>
      </NavigationScrollControls>
    </aside>
  );
}
