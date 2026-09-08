"use client";

import {
  localStorageColorSchemeManager,
  MantineProvider,
  type CSSVariablesResolver,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";
import type { ReactNode } from "react";
import { ADMIN_COLOR_SCHEME_KEY } from "../constants";
import type { AuthState } from "../features/auth/auth-slice";
import { adminTheme } from "../theme";
import { StoreProvider } from "./store-provider";

const colorSchemeManager = localStorageColorSchemeManager({
  key: ADMIN_COLOR_SCHEME_KEY,
});

dayjs.extend(buddhistEra);

const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {},
  dark: {
    "--mantine-color-body": "var(--mantine-color-dark-9)",
  },
});

export function AdminUIProvider({
  children,
  preloadedState,
}: Readonly<{ children: ReactNode; preloadedState: { auth: AuthState } }>) {
  return (
    <MantineProvider
      theme={adminTheme}
      cssVariablesResolver={cssVariablesResolver}
      colorSchemeManager={colorSchemeManager}
      defaultColorScheme="auto"
      deduplicateInlineStyles
    >
      <DatesProvider settings={{ locale: "th", firstDayOfWeek: 0 }}>
        <Notifications position="bottom-right" />
        <ModalsProvider>
          <StoreProvider preloadedState={preloadedState}>
            {children}
          </StoreProvider>
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
