"use client";

import { useEffect, useState, type ReactNode } from "react";
import { setupListeners } from "@reduxjs/toolkit/query";
import { Provider } from "react-redux";
import { ADMIN_LAYOUT_SETTINGS_KEY } from "../constants";
import type { AuthState } from "../features/auth/auth-slice";
import {
  initializeSettings,
  type LayoutState,
} from "../features/layout/layout-slice";
import { makeStore, type AppStore } from "../store";

export function StoreProvider({
  children,
  preloadedState,
}: Readonly<{ children: ReactNode; preloadedState: { auth: AuthState } }>) {
  const [store] = useState<AppStore>(() => makeStore(preloadedState));

  useEffect(() => {
    let settings: Partial<LayoutState> | null = null;

    try {
      const saved = window.localStorage.getItem(ADMIN_LAYOUT_SETTINGS_KEY);
      settings = saved ? (JSON.parse(saved) as Partial<LayoutState>) : null;
    } catch {
      settings = null;
    }

    store.dispatch(initializeSettings(settings));
  }, [store]);

  useEffect(() => setupListeners(store.dispatch), [store]);

  return <Provider store={store}>{children}</Provider>;
}
