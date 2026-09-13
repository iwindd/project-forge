'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { setupListeners } from '@reduxjs/toolkit/query';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from '../../lib/store';
import type { PreloadedState } from '../../lib/store';

export function StoreProvider({
  children,
  preloadedState,
}: Readonly<{ children: ReactNode; preloadedState: PreloadedState }>) {
  const [store] = useState<AppStore>(() => makeStore(preloadedState));

  useEffect(() => setupListeners(store.dispatch), [store]);

  return <Provider store={store}>{children}</Provider>;
}
