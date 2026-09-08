import { configureStore } from '@reduxjs/toolkit';
import { projectForgeApi } from '@/store/api';
import { ADMIN_LAYOUT_SETTINGS_KEY } from './constants';
import layoutReducer from './features/layout/layout-slice';

export function makeStore() {
  const store = configureStore({
    reducer: {
      layout: layoutReducer,
      [projectForgeApi.reducerPath]: projectForgeApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(projectForgeApi.middleware),
  });

  let previousLayout = store.getState().layout;
  store.subscribe(() => {
    const layout = store.getState().layout;
    if (layout === previousLayout || !layout.isHydrated || typeof window === 'undefined') return;
    previousLayout = layout;
    try {
      window.localStorage.setItem(
        ADMIN_LAYOUT_SETTINGS_KEY,
        JSON.stringify({ layoutMode: layout.layoutMode, navColor: layout.navColor }),
      );
    } catch {
      // Keep the in-memory preference when localStorage is unavailable.
    }
  });

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
