import { apiClient } from '@/services/apiClient';
import { LeaveType, LeaveRequest, LeaveBalanceItem } from '@/types/entities';

export async function listLeaveTypes(): Promise<LeaveType[]> {
  const { data } = await apiClient.get('/leaves/types');
  return data.data;
}

export async function createLeaveType(payload: { name: string; defaultDaysPerYear: number; description?: string }): Promise<LeaveType> {
  const { data } = await apiClient.post('/leaves/types', payload);
  return data.data;
}

export async function updateLeaveType(id: string, payload: Partial<{ name: string; defaultDaysPerYear: number; description?: string }>): Promise<LeaveType> {
  const { data } = await apiClient.put(`/leaves/types/${id}`, payload);
  return data.data;
}

export async function deleteLeaveType(id: string): Promise<void> {
  await apiClient.delete(`/leaves/types/${id}`);
}

export interface LeaveRequestPayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface LeaveListFilters {
  from?: string;
  to?: string;
  status?: 'approved' | 'rejected';
  employee?: string;
}

export async function createLeaveRequest(payload: LeaveRequestPayload): Promise<LeaveRequest> {
  const { data } = await apiClient.post('/leaves/requests', payload);
  return data.data;
}

export async function myLeaveRequests(filters: LeaveListFilters = {}): Promise<LeaveRequest[]> {
  const { data } = await apiClient.get('/leaves/requests/me', { params: filters });
  return data.data;
}

export async function pendingLeaveRequests(filters: LeaveListFilters = {}): Promise<LeaveRequest[]> {
  const { data } = await apiClient.get('/leaves/requests/pending', { params: filters });
  return data.data;
}

export async function reviewedLeaveRequests(filters: LeaveListFilters = {}): Promise<LeaveRequest[]> {
  const { data } = await apiClient.get('/leaves/requests/reviewed', { params: filters });
  return data.data;
}

export async function decideLeaveRequest(id: string, decision: 'approve' | 'reject', decisionNote?: string): Promise<LeaveRequest> {
  const { data } = await apiClient.patch(`/leaves/requests/${id}/decision`, { decision, decisionNote });
  return data.data;
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data } = await apiClient.patch(`/leaves/requests/${id}/cancel`);
  return data.data;
}


export async function myLeaveBalance(year?: number): Promise<LeaveBalanceItem[]> {
  const { data } = await apiClient.get('/leaves/balance/me', { params: { year } });
  return data.data;
}

export async function employeeLeaveBalance(employeeId: string, year?: number): Promise<LeaveBalanceItem[]> {
  const { data } = await apiClient.get(`/leaves/balance/${employeeId}`, { params: { year } });
  return data.data;
}
