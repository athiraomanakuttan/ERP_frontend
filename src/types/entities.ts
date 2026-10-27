export interface Permission {
  _id: string;
  module: string;
  action: 'view' | 'view_assigned' | 'view_all' | 'create' | 'edit' | 'delete' | 'approve' | 'reject' | 'assign';
  key: string;
  description?: string;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: Permission[] | string[];
  isSystemRole: boolean;
  createdAt: string;
}

export interface WorkingDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isWorking: boolean;
}

export interface Branch {
  _id: string;
  name: string;
  timezone: string;
  workingDays: WorkingDay[];
  workingStartTime: string;
  workingEndTime: string;
  createdAt: string;
}

export interface EmployeeRef {
  _id: string;
  firstName: string;
  lastName?: string;
  email: string;
}

export interface Employee {
  _id: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone: string;
  email: string;
  address: string;
  employeeCode?: string;
  joiningDate: string;
  department?: string;
  role: Role | string;
  branch: Branch | string;
  reportingManager?: EmployeeRef | string | null;
  teamLead?: EmployeeRef | string | null;
  status: 'active' | 'inactive';
  isAdmin?: boolean;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClientCompany {
  _id: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export type TaskStatus = 'to_do' | 'in_progress' | 'on_hold' | 'pending_approval' | 'completed' | 'cancelled' | 'reopened';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: { _id: string; name: string; status?: string } | string;
  assignees: (EmployeeRef | string)[];
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  submittedForApprovalAt?: string;
  submittedBy?: EmployeeRef | string | null;
  approvedBy?: EmployeeRef | string | null;
  pendingApprover?: EmployeeRef | string | null;
  createdBy?: EmployeeRef | string | null;
  approvedAt?: string;
  createdAt: string;
  totalWorkedSeconds?: number;
}

export interface CurrentTimer {
  taskId: string;
  startTime: string;
  completedSeconds?: number;
}

export interface WorkSession {
  _id: string;
  task: { _id: string; title: string; project?: { _id: string; name: string } | string } | string;
  employee: EmployeeRef | string;
  startTime: string;
  endTime?: string | null;
  durationSeconds?: number | null;
  endReason?: 'manual_pause' | 'checkout' | 'break_start' | 'task_completed' | 'manual_entry' | 'logout';
  entryType: 'automatic' | 'manual';
  manualReason?: string;
  createdBy?: EmployeeRef | string | null;
  createdAt: string;
}

export interface LeaveType {
  _id: string;
  name: string;
  defaultDaysPerYear: number;
  description?: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  _id: string;
  employee: EmployeeRef | string;
  leaveType: LeaveType | string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  currentApprover?: EmployeeRef | string | null;
  decidedBy?: EmployeeRef | string | null;
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
}

export interface BreakEntry {
  breakStart: string;
  breakEnd?: string | null;
}

export interface AttendanceSession {
  _id: string;
  employee: EmployeeRef | string;
  workDate: string;
  checkInTime: string;
  checkOutTime?: string | null;
  breaks: BreakEntry[];
  correctionReason?: string;
  createdAt: string;
}

export interface Holiday {
  _id: string;
  name: string;
  date: string;
  branches: (Branch | string)[];
  createdAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  publishedBy: EmployeeRef | string;
  createdAt: string;
}

export type NotificationType =
  | 'client_company_created'
  | 'project_created'
  | 'task_created'
  | 'task_submitted'
  | 'task_completed'
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  _id: string;
  name: string;
  clientCompany: ClientCompany | string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  projectManager?: EmployeeRef | string | null;
  teamMembers: (EmployeeRef | string)[];
  createdBy?: EmployeeRef | string | null;
  notes?: string;
  createdAt: string;
  totalWorkedSeconds?: number;
}


export interface ProjectWorkEmployee {
  employee: EmployeeRef & { department?: string; roleName?: string };
  totalSeconds: number;
  automaticSeconds: number;
  manualSeconds: number;
  taskCount: number;
  isWorking: boolean;
  lastActivityAt?: string;
}

export interface ProjectWorkSummary {
  project: Project;
  summary: {
    totalWorkedSeconds: number;
    employeesWorked: number;
    taskCount: number;
    averageSecondsPerEmployee: number;
  };
  employees: ProjectWorkEmployee[];
}

export interface ProjectEmployeeTaskSummary {
  employee: EmployeeRef & { department?: string; roleName?: string };
  summary: ProjectWorkEmployee;
  tasks: Array<{
    _id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    isArchived?: boolean;
    totalSeconds: number;
    automaticSeconds: number;
    manualSeconds: number;
    sessionCount: number;
    isWorking: boolean;
    lastActivityAt?: string;
  }>;
}


export interface LeaveBalanceItem {
  leaveTypeId: string;
  leaveTypeName: string;
  entitlement: number;
  approvedDays: number;
  pendingDays: number;
  usedOrReservedDays: number;
  balanceDays: number;
  year: number;
}

export interface AttendanceSummaryRow {
  employee: EmployeeRef;
  daysWorked: number;
  leaveDays: number;
  totalWorkingSeconds: number;
  totalSessions: number;
}
