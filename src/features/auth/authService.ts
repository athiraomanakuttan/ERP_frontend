import { apiClient } from '@/services/apiClient';
import { AuthEmployee } from './authSlice';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  employee: AuthEmployee;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data.data;
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPasswordRequest(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword });
}

/** Re-fetches who the current token belongs to (name, admin flag, permissions). */
export async function fetchCurrentEmployee(): Promise<AuthEmployee> {
  const { data } = await apiClient.get('/auth/me');
  const me = data.data;
  return {
    id: me.id,
    firstName: me.firstName,
    lastName: me.lastName,
    email: me.email,
    isAdmin: me.isAdmin,
    permissionKeys: me.permissionKeys,
  };
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout');
}
