import { configureStore } from "@reduxjs/toolkit";
import authReducer, { type AuthState } from "./features/auth/auth-slice";
import layoutReducer from "./features/layout/layout-slice";
import { ADMIN_LAYOUT_SETTINGS_KEY } from "./constants";
import { auditLogsApi } from "./features/audit-log/audit-logs-api";
import { organizationMembersApi } from "./features/organization/organization-members-api";
import { usersApi } from "./features/user/users-api";

export type PreloadedState = { auth: AuthState };

export function makeStore(preloadedState: PreloadedState) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      layout: layoutReducer,
      [usersApi.reducerPath]: usersApi.reducer,
      [auditLogsApi.reducerPath]: auditLogsApi.reducer,
      [organizationMembersApi.reducerPath]: organizationMembersApi.reducer,
    },
    preloadedState: {
      auth: preloadedState.auth,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        usersApi.middleware,
        auditLogsApi.middleware,
        organizationMembersApi.middleware,
      ),
  });

  let previousLayoutState = store.getState().layout;

  store.subscribe(() => {
    const layout = store.getState().layout;
    if (layout === previousLayoutState) return;
    previousLayoutState = layout;

    if (typeof window !== "undefined" && layout.isHydrated) {
      const { fontScale } = layout;
      try {
        window.localStorage.setItem(
          ADMIN_LAYOUT_SETTINGS_KEY,
          JSON.stringify({
            fontScale,
          }),
        );
      } catch {
        // Ignore storage failures; the in-memory Redux state remains usable.
      }
    }
  });

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
