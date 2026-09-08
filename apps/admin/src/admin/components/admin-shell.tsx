"use client";

import {
  ActionIcon,
  Affix,
  AppShell,
  Box,
  Transition,
} from "@mantine/core";
import { useDisclosure, useWindowScroll } from "@mantine/hooks";
import { IconArrowUp } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { AdminUser } from "../../session";
import { OrganizationProvider } from "../features/organization/organization-provider";
import { useAppSelector } from "../hooks";
import { AdminHeader } from "./admin-header";
import { AdminSettingsDrawer } from "./admin-settings-drawer";
import classes from "./admin-shell.module.css";
import SidebarDefault from "./navigation/sidebar-default";
import SidebarDrawer from "./navigation/sidebar-drawer";
import type { SidebarNavigationMode } from "./navigation/navigation-utils";

export function AdminShell({
  user,
  organizationSlug,
  navigationMode = "admin",
  children,
}: Readonly<{
  user: AdminUser;
  organizationSlug: string;
  navigationMode?: SidebarNavigationMode;
  children: ReactNode;
}>) {
  const hydrated = useAppSelector((state) => state.layout.isHydrated);
  const [mobileOpened, mobileHandlers] = useDisclosure(false);
  const [settingsOpened, settingsHandlers] = useDisclosure(false);
  const [scroll, scrollTo] = useWindowScroll();

  const shell = (
    <AppShell
      padding={0}
      layout="alt"
      header={{ height: 72 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: true },
      }}
      className={classes.appShell}
    >
      <AppShell.Header
        className={classes.header}
        data-scrolled={scroll.y > 0}
      >
        <AdminHeader
          mobileOpened={mobileOpened}
          onToggleMobileAction={mobileHandlers.toggle}
          onOpenSettingsAction={settingsHandlers.open}
        />
      </AppShell.Header>

      <AppShell.Navbar className={classes.navbar}>
        <SidebarDefault
          user={user}
          organizationSlug={organizationSlug}
          navigationMode={navigationMode}
        />
      </AppShell.Navbar>

      <SidebarDrawer
        opened={mobileOpened}
        onCloseAction={mobileHandlers.close}
        user={user}
        organizationSlug={organizationSlug}
        navigationMode={navigationMode}
      />

      <AppShell.Main className={classes.main}>
        <Box className={classes.mainContent}>{children}</Box>
      </AppShell.Main>

      <AdminSettingsDrawer
        opened={settingsOpened}
        onCloseAction={settingsHandlers.close}
      />

      <Transition transition="slide-up" mounted={scroll.y > 320}>
        {(transitionStyles) => (
          <Affix position={{ bottom: 24, right: 24 }} style={transitionStyles}>
            <ActionIcon
              size="lg"
              radius="xl"
              variant="filled"
              aria-label="กลับด้านบน"
              onClick={() => scrollTo({ y: 0 })}
            >
              <IconArrowUp size={19} />
            </ActionIcon>
          </Affix>
        )}
      </Transition>

      {!hydrated && <Box className={classes.hydrationCover} />}
    </AppShell>
  );

  if (navigationMode === "account") {
    return shell;
  }

  return (
    <OrganizationProvider organizationSlug={organizationSlug}>
      {shell}
    </OrganizationProvider>
  );
}
