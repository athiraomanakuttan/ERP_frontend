import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { safeGet, safeRemove, safeSet } from '@/utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  primaryColor: string;
  companyName: string;
  logoDataUrl?: string;
}

const DEFAULT_PRIMARY = '#2563EB';

function initialMode(): ThemeMode {
  const cached = safeGet('ems_theme_mode');
  if (cached === 'light' || cached === 'dark' || cached === 'system') return cached;
  return 'system';
}

const initialState: ThemeState = {
  mode: initialMode(),
  primaryColor: safeGet('ems_theme_color') ?? DEFAULT_PRIMARY,
  companyName: safeGet('ems_company_name') ?? 'EMS',
  logoDataUrl: safeGet('ems_logo') ?? undefined,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
      safeSet('ems_theme_mode', action.payload);
    },
    toggleMode: (state) => {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const effectiveDark = state.mode === 'dark' || (state.mode === 'system' && isSystemDark);
      state.mode = effectiveDark ? 'light' : 'dark';
      safeSet('ems_theme_mode', state.mode);
    },
    setBranding: (state, action: PayloadAction<{ primaryColor: string; companyName: string; logoDataUrl?: string }>) => {
      state.primaryColor = action.payload.primaryColor;
      state.companyName = action.payload.companyName;
      state.logoDataUrl = action.payload.logoDataUrl;
      safeSet('ems_theme_color', action.payload.primaryColor);
      safeSet('ems_company_name', action.payload.companyName);
      if (action.payload.logoDataUrl) {
        if (!safeSet('ems_logo', action.payload.logoDataUrl)) safeRemove('ems_logo');
      } else {
        safeRemove('ems_logo');
      }
    },
  },
});

export const { setMode, toggleMode, setBranding } = themeSlice.actions;
export default themeSlice.reducer;
