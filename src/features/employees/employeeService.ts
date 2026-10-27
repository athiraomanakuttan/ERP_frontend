import { apiClient } from '@/services/apiClient';
import { Employee, EmployeeRef, PaginatedResult } from '@/types/entities';

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  branch?: string;
  role?: string;
  status?: 'active' | 'inactive';
}

export interface EmployeePayload {
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender?: string;
  phone: string;
  email: string;
  address: string;
  employeeCode?: string;
  joiningDate: string;
  department?: string;
  role: string;
  branch: string;
  reportingManager?: string;
  teamLead?: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  initialPassword?: string;
}

/** Server-side paginated + filtered fetch - only the current page's rows cross the wire. */
export async function listEmployees(params: EmployeeListParams): Promise<PaginatedResult<Employee>> {
  const { data } = await apiClient.get('/employees', { params });
  return data.meta;
}

/** Lightweight typeahead search (Reporting Manager / Team Lead pickers) - capped server-side at 20 results. */
export async function searchEmployees(query: string): Promise<EmployeeRef[]> {
  if (!query.trim()) return [];
  const { data } = await apiClient.get('/employees/search', { params: { q: query } });
  return data.data;
}

function sanitizeEmployeePayload<T extends Partial<EmployeePayload>>(payload: T): T {
  const cleaned = { ...payload } as T & { employeeCode?: string };

  // employeeCode is optional but unique in MongoDB. Sending an empty string would
  // make every employee without a code collide on the same unique value ("").
  if (typeof cleaned.employeeCode === 'string') {
    const code = cleaned.employeeCode.trim();
    if (code) cleaned.employeeCode = code;
    else delete cleaned.employeeCode;
  }

  // Optional select/object-id fields should be omitted when the browser sends an empty string.
  for (const key of ['gender', 'reportingManager', 'teamLead'] as const) {
    const value = cleaned[key];
    if (typeof value === 'string' && value.trim() === '') delete cleaned[key];
  }

  return cleaned;
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  const { data } = await apiClient.post('/employees', sanitizeEmployeePayload(payload));
  return data.data;
}

export async function updateEmployee(id: string, payload: Partial<EmployeePayload>): Promise<Employee> {
  const { data } = await apiClient.put(`/employees/${id}`, sanitizeEmployeePayload(payload));
  return data.data;
}

export async function setEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<Employee> {
  const { data } = await apiClient.patch(`/employees/${id}/status`, { status });
  return data.data;
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiClient.delete(`/employees/${id}`);
}


export async function adminResetEmployeePassword(employeeId: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/admin-reset-password', { employeeId, newPassword });
}
