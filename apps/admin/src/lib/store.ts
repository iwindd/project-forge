import { configureStore } from "@reduxjs/toolkit";
import authReducer, { type AuthState } from "@/lib/features/auth/auth-slice";
import { auditLogsApi } from "@/lib/features/audit-log/audit-logs-api";
import { organizationMembersApi } from "@/lib/features/organization/organization-members-api";
import { usersApi } from "@/lib/features/user/users-api";

export type PreloadedState = { auth: AuthState };

export function makeStore(preloadedState: PreloadedState) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
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

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
