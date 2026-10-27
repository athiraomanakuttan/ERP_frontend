import { apiClient } from '@/services/apiClient';
import { ClientCompany, PaginatedResult } from '@/types/entities';

export interface ClientCompanyListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

export interface ClientCompanyPayload {
  companyName: string;
  contactPerson?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export async function listClientCompanies(params: ClientCompanyListParams): Promise<PaginatedResult<ClientCompany>> {
  const { data } = await apiClient.get('/client-companies', { params });
  return data.meta;
}

export async function createClientCompany(payload: ClientCompanyPayload): Promise<ClientCompany> {
  const { data } = await apiClient.post('/client-companies', payload);
  return data.data;
}

export async function updateClientCompany(id: string, payload: Partial<ClientCompanyPayload>): Promise<ClientCompany> {
  const { data } = await apiClient.put(`/client-companies/${id}`, payload);
  return data.data;
}

export async function deleteClientCompany(id: string): Promise<void> {
  await apiClient.delete(`/client-companies/${id}`);
}
