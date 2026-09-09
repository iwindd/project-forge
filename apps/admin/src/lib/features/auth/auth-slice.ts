import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AdminUser } from "@/session";

export type AuthState = {
  user: AdminUser | null;
};

const initialState: AuthState = { user: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AdminUser | null>) => {
      state.user = action.payload;
    },
  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;
