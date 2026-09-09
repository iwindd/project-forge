import { configureStore } from "@reduxjs/toolkit";
import authReducer, { type AuthState } from "@/lib/features/auth/auth-slice";
import { api } from "@/lib/api/api";
import "@/lib/features/auth/auth-api";
import "@/lib/features/audit-log/audit-logs-api";
import "@/lib/features/organization/organization-api";
import "@/lib/features/organization/organization-members-api";
import "@/lib/features/user/users-api";

export type PreloadedState = { auth: AuthState };

export function makeStore(preloadedState: PreloadedState) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [api.reducerPath]: api.reducer,
    },
    preloadedState: {
      auth: preloadedState.auth,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        api.middleware,
      ),
  });

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
