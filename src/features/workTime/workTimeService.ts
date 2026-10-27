import { apiClient } from '@/services/apiClient';
import { WorkSession } from '@/types/entities';

export interface WorkTimeListParams {
  page?: number;
  limit?: number;
  employee?: string;
  task?: string;
  project?: string;
  from?: string;
  to?: string;
  entryType?: 'automatic' | 'manual';
  running?: boolean;
}

export interface WorkTimePageResult {
  items: WorkSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalSeconds: number;
    manualSessions: number;
    runningSessions: number;
    sessionCount: number;
  };
}

export async function listWorkSessions(params: WorkTimeListParams): Promise<WorkTimePageResult> {
  const { data } = await apiClient.get('/work-time', { params });
  return data.meta;
}


export async function listMyWorkSessions(params: Omit<WorkTimeListParams, 'employee' | 'project'>): Promise<WorkTimePageResult> {
  const { data } = await apiClient.get('/work-time/me', { params });
  return data.meta;
}

export async function createManualWorkSession(payload: {
  taskId: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  reason: string;
}): Promise<WorkSession> {
  const { data } = await apiClient.post('/work-time/manual', payload);
  return data.data;
}

export async function createSelfManualWorkSession(payload: {
  taskId: string;
  startTime: string;
  endTime: string;
  reason: string;
}): Promise<WorkSession> {
  const { data } = await apiClient.post('/work-time/manual/me', payload);
  return data.data;
}
