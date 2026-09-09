"use client";

import { useEffect, useState, type ReactNode } from "react";
import { setupListeners } from "@reduxjs/toolkit/query";
import { Provider } from "react-redux";
import type { AuthState } from "@/lib/features/auth/auth-slice";
import { makeStore, type AppStore } from "../store";

export function StoreProvider({
  children,
  preloadedState,
}: Readonly<{ children: ReactNode; preloadedState: { auth: AuthState } }>) {
  const [store] = useState<AppStore>(() => makeStore(preloadedState));

  useEffect(() => setupListeners(store.dispatch), [store]);

  return <Provider store={store}>{children}</Provider>;
}
