'use client';

import { setupListeners } from '@reduxjs/toolkit/query';
import { type ReactNode, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { type AppStore, makeStore } from './store';

export function StoreProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [store] = useState<AppStore>(() => makeStore());

  useEffect(() => setupListeners(store.dispatch), [store]);

  return <Provider store={store}>{children}</Provider>;
}
