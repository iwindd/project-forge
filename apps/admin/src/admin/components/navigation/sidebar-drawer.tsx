"use client";

import { Box, Drawer, ScrollArea } from "@mantine/core";
import { useRef } from "react";
import { OrganizationSwitcher } from "../../features/organization/organization-switcher";
import NavigationScrollControls from "./navigation-scroll-controls";
import classes from "./sidebar-drawer.module.css";
import SidebarNavContent from "./sidebar-nav-content";
import { useScrollbarVisibility } from "./use-scrollbar-visibility";

type SidebarDrawerProps = {
  opened: boolean;
  onCloseAction: () => void;
};

export default function SidebarDrawer({
  opened,
  onCloseAction,
}: SidebarDrawerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollbar = useScrollbarVisibility();
  const scrollbarClassName = `${classes.navigationScrollbar} ${scrollbar.visible ? classes.navigationScrollbarVisible : ""}`;

  return (
    <Drawer
      opened={opened}
      onClose={onCloseAction}
      padding={0}
      position="left"
      size={300}
      title={<OrganizationSwitcher />}
      hiddenFrom="sm"
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      classNames={{
        body: classes.mobileDrawerBody,
        content: classes.mobileDrawerContent,
      }}
    >
      <div className={classes.mobileDrawerSidebar}>
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
              <SidebarNavContent onNavigateAction={onCloseAction} />
            </Box>
          </ScrollArea>
        </NavigationScrollControls>
      </div>
    </Drawer>
  );
}
