'use client';

import { setupListeners } from '@reduxjs/toolkit/query';
import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { initializeSettings } from '../features/layout/layout-slice';
import { ADMIN_LAYOUT_SETTINGS_KEY } from '../constants';
import { makeStore, type AppStore } from '../store';

export function StoreProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [store] = useState<AppStore>(() => makeStore());

  useEffect(() => {
    let settings: { layoutMode?: 'default' | 'compact'; navColor?: 'integrate' | 'apparent' } | null = null;
    try {
      const saved = window.localStorage.getItem(ADMIN_LAYOUT_SETTINGS_KEY);
      settings = saved ? JSON.parse(saved) : null;
    } catch {
      settings = null;
    }
    store.dispatch(initializeSettings(settings));
  }, [store]);

  useEffect(() => setupListeners(store.dispatch), [store]);

  return <Provider store={store}>{children}</Provider>;
}
