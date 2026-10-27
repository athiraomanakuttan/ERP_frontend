import { apiClient } from '@/services/apiClient';
import { Task, PaginatedResult, TaskStatus, TaskPriority, CurrentTimer } from '@/types/entities';

export interface TaskListParams {
  page?: number;
  limit?: number;
  search?: string;
  project?: string;
  company?: string;
  assignee?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueFrom?: string;
  dueTo?: string;
}


export interface TaskFilterOptions {
  projects: Array<{ _id: string; name: string; clientCompany: string }>;
  companies: Array<{ _id: string; companyName: string }>;
}

export async function getTaskFilterOptions(): Promise<TaskFilterOptions> {
  const { data } = await apiClient.get('/tasks/filter-options');
  return data.data;
}

export interface TaskPayload {
  title: string;
  description?: string;
  project: string;
  assignees: string[];
  priority?: TaskPriority;
  dueDate?: string;
}

export async function listTasks(params: TaskListParams): Promise<PaginatedResult<Task>> {
  const { data } = await apiClient.get('/tasks', { params });
  return data.meta;
}


function sanitizeTaskPayload<T extends Partial<TaskPayload>>(payload: T): T {
  const cleaned = { ...payload } as T & { dueDate?: string };
  if (typeof cleaned.dueDate === 'string' && cleaned.dueDate.trim() === '') delete cleaned.dueDate;
  return cleaned;
}

export async function createTask(payload: TaskPayload): Promise<Task> {
  const { data } = await apiClient.post('/tasks', sanitizeTaskPayload(payload));
  return data.data;
}

export async function updateTask(id: string, payload: Partial<TaskPayload>): Promise<Task> {
  const { data } = await apiClient.put(`/tasks/${id}`, sanitizeTaskPayload(payload));
  return data.data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}

export async function changeTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const { data } = await apiClient.patch(`/tasks/${id}/status`, { status });
  return data.data;
}

export async function decideTaskApproval(id: string, decision: 'approve' | 'reopen'): Promise<Task> {
  const { data } = await apiClient.patch(`/tasks/${id}/approval`, { decision });
  return data.data;
}

// --- Timer ---
export async function startTimer(taskId: string): Promise<void> {
  await apiClient.post(`/tasks/${taskId}/timer/start`);
}

export async function pauseTimer(taskId: string): Promise<void> {
  await apiClient.post(`/tasks/${taskId}/timer/pause`);
}

export async function getCurrentTimer(): Promise<CurrentTimer | null> {
  const { data } = await apiClient.get('/tasks/timer/current');
  return data.data;
}

export async function getTotalTime(taskId: string, employeeId: string): Promise<{ totalSeconds: number }> {
  const { data } = await apiClient.get(`/tasks/${taskId}/timer/total/${employeeId}`);
  return data.data;
}
