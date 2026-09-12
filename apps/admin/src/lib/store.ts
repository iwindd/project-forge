import { configureStore } from "@reduxjs/toolkit";
import authReducer, { type AuthState } from "@/lib/features/auth/auth-slice";
import { api } from "@/lib/api/api";
import "@/lib/features/auth/auth-api";
import "@/lib/features/audit-log/audit-logs-api";
import { organizationApi } from "@/lib/features/organization/organization-api";
import "@/lib/features/organization/organization-members-api";
import "@/lib/features/profile/profile-api";
import "@/lib/features/security/security-api";
import type { Organization } from "@/lib/features/organization/types";

export type PreloadedState = {
  auth: AuthState;
  api?: ReturnType<typeof api.reducer>;
};

export function makeStore(preloadedState: PreloadedState) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [api.reducerPath]: api.reducer,
    },
    preloadedState: {
      auth: preloadedState.auth,
      [api.reducerPath]:
        preloadedState.api ?? api.reducer(undefined, { type: "@@INIT" }),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        api.middleware,
      ),
  });

  return store;
}

export async function createPreloadedState(
  auth: AuthState,
  organizations: Organization[],
): Promise<PreloadedState> {
  const store = makeStore({ auth });

  await store.dispatch(
    organizationApi.util.upsertQueryData(
      "getOrganizations",
      undefined,
      organizations,
    ),
  );

  return store.getState();
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
