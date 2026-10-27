import { apiClient } from '@/services/apiClient';
import { Employee, AttendanceSession, LeaveRequest, Project, Task, Branch, ClientCompany, PaginatedResult, AttendanceSummaryRow } from '@/types/entities';

interface ListParams {
  page?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

async function fetchReport<T>(path: string, params: ListParams): Promise<PaginatedResult<T>> {
  const { data } = await apiClient.get(path, { params });
  return data.meta;
}

export interface AnalyticsEmployee {
  employee: { _id: string; firstName: string; lastName?: string; email: string };
  daysWorked: number;
  leaveDays: number;
  pendingLeaveDays: number;
  attendanceSeconds: number;
  taskSeconds: number;
  automaticSeconds: number;
  manualSeconds: number;
  utilizationPercent: number;
  totalSessions: number;
  taskCount: number;
  completedTaskCount: number;
}

export interface AnalyticsReport {
  range: { from: string; to: string };
  organization: {
    employees: number;
    workedDays: number;
    leaveDays: number;
    attendanceSeconds: number;
    taskSeconds: number;
    utilizationPercent: number;
    tasksCompleted: number;
    activeProjects: number;
    manualSeconds: number;
  };
  taskStatusCounts: Record<string, number>;
  employees: AnalyticsEmployee[];
  projects: Array<{ projectId: string; name: string; status: string; seconds: number; automaticSeconds: number; manualSeconds: number; employees: number; tasks: number }>;
  clients: Array<{ clientCompanyId: string; companyName: string; seconds: number; projects: number; employees: number; tasks: number }>;
  leaveTypes: Array<{ leaveTypeId: string; name: string; entitlementPerEmployee: number; approvedDays: number; pendingDays: number }>;
  manualEntries: Array<{ employeeId: string; employeeName: string; taskId: string; taskTitle: string; seconds: number; startTime: string; endTime?: string; reason: string }>;
}

export async function reportAnalytics(params: { from: string; to: string }): Promise<AnalyticsReport> {
  const { data } = await apiClient.get('/reports/analytics', { params });
  return data.data;
}

export const reportEmployees = (params: ListParams) => fetchReport<Employee>('/reports/employees', params);
export const reportAttendance = (params: ListParams) => fetchReport<AttendanceSession>('/reports/attendance', params);
export const reportLeaves = (params: ListParams) => fetchReport<LeaveRequest>('/reports/leaves', params);
export const reportProjects = (params: ListParams) => fetchReport<Project>('/reports/projects', params);
export const reportTasks = (params: ListParams) => fetchReport<Task>('/reports/tasks', params);
export const reportBranches = (params: ListParams) => fetchReport<Branch>('/reports/branches', params);
export const reportClientCompanies = (params: ListParams) => fetchReport<ClientCompany>('/reports/client-companies', params);
export const reportAttendanceSummary = (params: ListParams) => fetchReport<AttendanceSummaryRow>('/reports/attendance-summary', params);
