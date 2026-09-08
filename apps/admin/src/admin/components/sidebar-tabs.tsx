"use client";

import { Button, Drawer, Tabs } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconLayoutSidebarLeftExpand } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import classes from "./sidebar-tabs.module.css";

export type SidebarTabItem = {
  href: string;
  icon: ReactNode;
  label: ReactNode;
};

type SidebarTabsProps = {
  ariaLabel: string;
  drawerTitle: string;
  items: readonly SidebarTabItem[];
};

function TabNavigation({
  ariaLabel,
  items,
  onNavigate,
}: SidebarTabsProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <Tabs
      value={pathname}
      variant="none"
      orientation="vertical"
      placement="left"
      w="100%"
      classNames={classes}
    >
      <Tabs.List aria-label={ariaLabel} w="100%">
        {items.map((item) => (
          <Tabs.Tab
            key={item.href}
            value={item.href}
            w="100%"
            leftSection={item.icon}
            onClick={onNavigate}
            renderRoot={(props) => (
              <Link href={item.href} {...props} />
            )}
          >
            {item.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}

export function SidebarTabs({
  ariaLabel,
  drawerTitle,
  items,
}: SidebarTabsProps) {
  const [opened, { close, open }] = useDisclosure(false);

  return (
    <>
      <div className={classes.desktop}>
        <TabNavigation ariaLabel={ariaLabel} drawerTitle={drawerTitle} items={items} />
      </div>

      <Button
        className={classes.mobileTrigger}
        hiddenFrom="sm"
        variant="default"
        leftSection={<IconLayoutSidebarLeftExpand size={19} />}
        aria-controls="sidebar-tabs-drawer"
        aria-expanded={opened}
        onClick={open}
      >
        เมนู
      </Button>

      <Drawer
        id="sidebar-tabs-drawer"
        opened={opened}
        onClose={close}
        position="left"
        size={280}
        title={drawerTitle}
        padding="md"
        hiddenFrom="sm"
        overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      >
        <TabNavigation
          ariaLabel={ariaLabel}
          drawerTitle={drawerTitle}
          items={items}
          onNavigate={close}
        />
      </Drawer>
    </>
  );
}
