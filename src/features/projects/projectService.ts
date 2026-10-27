import { apiClient } from '@/services/apiClient';
import { Project, PaginatedResult, ProjectStatus, ProjectPriority, ProjectWorkSummary, ProjectEmployeeTaskSummary } from '@/types/entities';

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  clientCompany?: string;
}

export interface ProjectPayload {
  name: string;
  clientCompany: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  projectManager?: string;
  notes?: string;
}


export async function getProjectClientCompanyOptions(): Promise<Array<{ _id: string; companyName: string }>> {
  const { data } = await apiClient.get('/projects/filter-options/client-companies');
  return data.data;
}

export async function listProjects(params: ProjectListParams): Promise<PaginatedResult<Project>> {
  const { data } = await apiClient.get('/projects', { params });
  return data.meta;
}


function sanitizeProjectPayload<T extends Partial<ProjectPayload>>(payload: T): T {
  const cleaned = { ...payload } as T & { startDate?: string; endDate?: string; projectManager?: string };
  for (const key of ['startDate', 'endDate', 'projectManager'] as const) {
    const value = cleaned[key];
    if (typeof value === 'string' && value.trim() === '') delete cleaned[key];
  }
  return cleaned;
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const { data } = await apiClient.post('/projects', sanitizeProjectPayload(payload));
  return data.data;
}

export async function updateProject(id: string, payload: Partial<ProjectPayload>): Promise<Project> {
  const { data } = await apiClient.put(`/projects/${id}`, sanitizeProjectPayload(payload));
  return data.data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function addTeamMember(projectId: string, employeeId: string): Promise<Project> {
  const { data } = await apiClient.post(`/projects/${projectId}/team-members`, { employeeId });
  return data.data;
}

export async function removeTeamMember(projectId: string, employeeId: string): Promise<Project> {
  const { data } = await apiClient.delete(`/projects/${projectId}/team-members/${employeeId}`);
  return data.data;
}


export async function getProject(id: string): Promise<Project> {
  const { data } = await apiClient.get(`/projects/${id}`);
  return data.data;
}

export async function getProjectWorkSummary(
  id: string,
  params?: { from?: string; to?: string }
): Promise<ProjectWorkSummary> {
  const { data } = await apiClient.get(`/projects/${id}/work-summary`, { params });
  return data.data;
}

export async function getProjectEmployeeWorkSummary(
  projectId: string,
  employeeId: string,
  params?: { from?: string; to?: string }
): Promise<ProjectEmployeeTaskSummary> {
  const { data } = await apiClient.get(`/projects/${projectId}/work-summary/${employeeId}`, { params });
  return data.data;
}
