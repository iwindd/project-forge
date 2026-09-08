"use client";

import { Box, ScrollArea } from "@mantine/core";
import { useRef } from "react";
import { OrganizationSwitcher } from "../../features/organization/organization-switcher";
import NavigationScrollControls from "./navigation-scroll-controls";
import classes from "./sidebar-default.module.css";
import SidebarNavContent from "./sidebar-nav-content";
import type { SidebarNavigationMode } from "./navigation-utils";
import { useScrollbarVisibility } from "./use-scrollbar-visibility";

export default function SidebarDefault({
  navigationMode = "admin",
}: {
  navigationMode?: SidebarNavigationMode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollbar = useScrollbarVisibility();
  const scrollbarClassName = `${classes.navigationScrollbar} ${scrollbar.visible ? classes.navigationScrollbarVisible : ""}`;

  return (
    <aside className={classes.sidebar} data-admin-sidebar>
      <div className={classes.sidebarHeader}>
        <OrganizationSwitcher />
      </div>

      <NavigationScrollControls
        orientation="vertical"
        viewportRef={viewportRef}
      >
        <ScrollArea
          className={classes.iconSidebarScroll}
          classNames={{
            scrollbar: scrollbarClassName,
            thumb: classes.navigationScrollbarThumb,
          }}
          onMouseEnter={scrollbar.showThenHide}
          onMouseLeave={scrollbar.hide}
          onScrollPositionChange={scrollbar.showThenHide}
          scrollbars="y"
          scrollbarSize={10}
          scrollHideDelay={500}
          type="always"
          viewportRef={viewportRef}
        >
          <Box px="md">
            <SidebarNavContent navigationMode={navigationMode} />
          </Box>
        </ScrollArea>
      </NavigationScrollControls>
    </aside>
  );
}
