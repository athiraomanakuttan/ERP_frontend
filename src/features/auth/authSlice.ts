import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { safeGet, safeGetJson, safeRemove, safeSet } from '@/utils/storage';

export interface AuthEmployee {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  isAdmin: boolean;
  permissionKeys?: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  employee: AuthEmployee | null;
}

// The employee is persisted alongside the tokens so a page refresh doesn't lose who is logged in
// (previously only the tokens survived, which silently turned admins into regular users).
// It is re-validated against the server on load - see ProtectedRoute.
const initialState: AuthState = {
  accessToken: safeGet('ems_access_token'),
  refreshToken: safeGet('ems_refresh_token'),
  employee: safeGetJson<AuthEmployee>('ems_employee'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; employee: AuthEmployee }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.employee = action.payload.employee;
      safeSet('ems_access_token', action.payload.accessToken);
      safeSet('ems_refresh_token', action.payload.refreshToken);
      safeSet('ems_employee', JSON.stringify(action.payload.employee));
    },
    setEmployee: (state, action: PayloadAction<AuthEmployee>) => {
      state.employee = action.payload;
      safeSet('ems_employee', JSON.stringify(action.payload));
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      safeSet('ems_access_token', action.payload.accessToken);
      safeSet('ems_refresh_token', action.payload.refreshToken);
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.employee = null;
      safeRemove('ems_access_token');
      safeRemove('ems_refresh_token');
      safeRemove('ems_employee');
    },
  },
});

export const { setCredentials, setEmployee, setTokens, logout } = authSlice.actions;
export default authSlice.reducer;
