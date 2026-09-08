import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type LayoutMode = 'default' | 'compact';
export type NavColor = 'integrate' | 'apparent';

export type LayoutState = {
  layoutMode: LayoutMode;
  navColor: NavColor;
  isHydrated: boolean;
};

const initialState: LayoutState = {
  layoutMode: 'default',
  navColor: 'apparent',
  isHydrated: false,
};

const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setLayoutMode: (state, action: PayloadAction<LayoutMode>) => {
      state.layoutMode = action.payload;
      state.isHydrated = true;
    },
    setNavColor: (state, action: PayloadAction<NavColor>) => {
      state.navColor = action.payload;
      state.isHydrated = true;
    },
    initializeSettings: (state, action: PayloadAction<Partial<LayoutState> | null>) => {
      const settings = action.payload;
      if (settings) {
        state.layoutMode = settings.layoutMode ?? state.layoutMode;
        state.navColor = settings.navColor ?? state.navColor;
      }
      state.isHydrated = true;
    },
    resetSettings: () => ({ ...initialState, isHydrated: true }),
  },
});

export const { setLayoutMode, setNavColor, initializeSettings, resetSettings } = layoutSlice.actions;
export default layoutSlice.reducer;
