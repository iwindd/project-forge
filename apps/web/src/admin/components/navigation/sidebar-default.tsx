'use client';

import { Anchor, Box, Group, ScrollArea } from '@mantine/core';
import Link from 'next/link';
import { useRef } from 'react';
import { AdminBrand } from '../admin-brand';
import NavigationScrollControls from './navigation-scroll-controls';
import classes from './sidebar-default.module.css';
import SidebarNavContent from './sidebar-nav-content';
import { useScrollbarVisibility } from './use-scrollbar-visibility';

export default function SidebarDefault({ homeHref }: { homeHref: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollbar = useScrollbarVisibility();
  const scrollbarClassName = `${classes.navigationScrollbar} ${scrollbar.visible ? classes.navigationScrollbarVisible : ''}`;
  return (
    <aside className={classes.sidebar}>
      <Group gap={8} w='100%' align='center' px='lg' h={72}>
        <Anchor component={Link} href={homeHref} underline='never' aria-label='หน้าหลัก Project Forge'>
          <AdminBrand />
        </Anchor>
      </Group>
      <NavigationScrollControls viewportRef={viewportRef}>
        <ScrollArea
          className={classes.iconSidebarScroll}
          classNames={{ scrollbar: scrollbarClassName, thumb: classes.navigationScrollbarThumb }}
          onMouseEnter={scrollbar.showThenHide}
          onMouseLeave={scrollbar.hide}
          onScrollPositionChange={scrollbar.showThenHide}
          scrollbars='y'
          scrollbarSize={10}
          scrollHideDelay={500}
          type='always'
          viewportRef={viewportRef}
        >
          <Box px='md'>
            <SidebarNavContent />
          </Box>
        </ScrollArea>
      </NavigationScrollControls>
    </aside>
  );
}
