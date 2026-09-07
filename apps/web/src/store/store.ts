import { configureStore } from '@reduxjs/toolkit';
import { projectForgeApi } from './api';

export function makeStore() {
  return configureStore({
    reducer: { [projectForgeApi.reducerPath]: projectForgeApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(projectForgeApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
