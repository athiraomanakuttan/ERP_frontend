import { apiClient } from '@/services/apiClient';
import { Branch, WorkingDay } from '@/types/entities';

export interface BranchPayload {
  name: string;
  timezone: string;
  workingDays: WorkingDay[];
  workingStartTime: string;
  workingEndTime: string;
}

export async function listBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get('/branches');
  return data.data;
}

export async function createBranch(payload: BranchPayload): Promise<Branch> {
  const { data } = await apiClient.post('/branches', payload);
  return data.data;
}

export async function updateBranch(id: string, payload: Partial<BranchPayload>): Promise<Branch> {
  const { data } = await apiClient.put(`/branches/${id}`, payload);
  return data.data;
}

export async function deleteBranch(id: string): Promise<void> {
  await apiClient.delete(`/branches/${id}`);
}
