import { apiClient } from '@/services/apiClient';
export interface Customer {
  _id: string; customerType: 'individual'|'business'; primaryContactName: string; contactNumber: string;
  companyName?: string; email: string; vatNumber: string; currency: string; createdAt: string;
}
export interface CustomerPayload { customerType: 'individual'|'business'; primaryContactName: string; contactNumber: string; companyName?: string; email: string; vatNumber: string; currency: string; }
export async function listCustomers(params: Record<string, any> = {}) { const { data } = await apiClient.get('/customers', { params }); return { items: data.data as Customer[], meta: data.meta }; }
export async function getCustomer(id: string) { const { data } = await apiClient.get(`/customers/${id}`); return data.data as Customer; }
export async function createCustomer(payload: CustomerPayload) { const { data } = await apiClient.post('/customers', payload); return data.data as Customer; }
export async function updateCustomer(id: string, payload: CustomerPayload) { const { data } = await apiClient.put(`/customers/${id}`, payload); return data.data as Customer; }
export async function deleteCustomer(id: string) { await apiClient.delete(`/customers/${id}`); }
