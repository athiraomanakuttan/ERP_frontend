import { apiClient } from '@/services/apiClient';
import { Role, Permission } from '@/types/entities';

export interface RolePayload {
  name: string;
  description?: string;
  permissions: string[];
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await apiClient.get('/roles');
  return data.data;
}

export async function getRole(id: string): Promise<Role> {
  const { data } = await apiClient.get(`/roles/${id}`);
  return data.data;
}

export async function createRole(payload: RolePayload): Promise<Role> {
  const { data } = await apiClient.post('/roles', payload);
  return data.data;
}

export async function updateRole(id: string, payload: Partial<RolePayload>): Promise<Role> {
  const { data } = await apiClient.put(`/roles/${id}`, payload);
  return data.data;
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/roles/${id}`);
}

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get('/permissions');
  return data.data;
}
