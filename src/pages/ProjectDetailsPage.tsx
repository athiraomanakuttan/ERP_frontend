import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Clock3,
  ListChecks,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import {
  getProjectEmployeeWorkSummary,
  getProjectWorkSummary,
} from '@/features/projects/projectService';
import { ClientCompany, EmployeeRef, ProjectStatus, TaskStatus } from '@/types/entities';
import { useAppSelector } from '@/store/hooks';

const STATUS_TONE: Record<ProjectStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  planned: 'neutral', active: 'success', on_hold: 'warning', completed: 'info', cancelled: 'danger',
};
const TASK_TONE: Record<TaskStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  to_do: 'neutral', in_progress: 'info', on_hold: 'warning', pending_approval: 'warning', completed: 'success', cancelled: 'danger', reopened: 'info',
};

type RangePreset = 'all' | 'this_month' | 'last_month';

function formatDuration(seconds = 0) {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function personName(person: EmployeeRef | string | null | undefined) {
  if (!person) return 'Not assigned';
  if (typeof person === 'string') return person;
  return `${person.firstName} ${person.lastName ?? ''}`.trim();
}

function clientName(client: ClientCompany | string) {
  return typeof client === 'string' ? client : client.companyName;
}

function initials(firstName: string, lastName?: string) {
  return `${firstName.charAt(0)}${lastName?.charAt(0) ?? ''}`.toUpperCase();
}

function dateLabel(value?: string) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function rangeParams(preset: RangePreset) {
  const now = new Date();
  if (preset === 'all') return {};
  if (preset === 'this_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
    };
  }
  return {
    from: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).toISOString(),
    to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString(),
  };
}

export function ProjectDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.employee);
  const permissions = currentUser?.permissionKeys ?? [];
  const canViewFullDetails = Boolean(currentUser?.isAdmin || (permissions.includes('projects:view_all') && permissions.includes('tasks:view_all')));
  const [range, setRange] = useState<RangePreset>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const params = useMemo(() => rangeParams(range), [range]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-work-summary', id, params],
    queryFn: () => getProjectWorkSummary(id, params),
    enabled: Boolean(id && canViewFullDetails),
  });

  useEffect(() => {
    const employees = data?.employees ?? [];
    if (!employees.length) {
      setSelectedEmployeeId('');
      return;
    }
    if (!employees.some((item) => item.employee._id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0].employee._id);
    }
  }, [data, selectedEmployeeId]);

  const selectedEmployee = data?.employees.find((item) => item.employee._id === selectedEmployeeId);
  const { data: employeeDetails, isLoading: employeeLoading } = useQuery({
    queryKey: ['project-employee-work-summary', id, selectedEmployeeId, params],
    queryFn: () => getProjectEmployeeWorkSummary(id, selectedEmployeeId, params),
    enabled: Boolean(id && selectedEmployeeId),
  });

  if (!canViewFullDetails) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-panel">
        <h1 className="text-lg font-semibold text-heading">Project details are restricted</h1>
        <p className="mt-2 text-sm text-faint">Your role can use the Projects list, but full employee contribution and work analytics are available only to Admin or roles with View All Projects and View All Tasks.</p>
        <Button className="mt-5" variant="secondary" onClick={() => navigate('/projects')}><ArrowLeft className="h-4 w-4" /> Back to Projects</Button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-faint shadow-panel">Loading project details…</div>;
  }
  if (error || !data) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">Unable to load this project or its work summary.</div>;
  }

  const project = data.project;
  const maxEmployeeTime = Math.max(...data.employees.map((item) => item.totalSeconds), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4" /> Projects
        </Button>
        <Select value={range} onChange={(e) => setRange(e.target.value as RangePreset)} className="w-44">
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
        </Select>
      </div>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-panel sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
              <BriefcaseBusiness className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-heading sm:text-3xl">{project.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm text-subtle">{clientName(project.clientCompany)}</span>
                <Badge tone={STATUS_TONE[project.status]}>{project.status.replace('_', ' ')}</Badge>
                <Badge tone={project.priority === 'urgent' || project.priority === 'high' ? 'danger' : 'neutral'}>{project.priority} priority</Badge>
              </div>
              {project.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-faint">{project.description}</p>}
            </div>
          </div>
          <div className="grid shrink-0 gap-3 text-sm sm:grid-cols-3 lg:min-w-[420px]">
            <Meta label="Project Manager" value={personName(project.projectManager)} />
            <Meta label="Start Date" value={dateLabel(project.startDate)} />
            <Meta label="End Date" value={dateLabel(project.endDate)} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Clock3} label="Total Worked Time" value={formatDuration(data.summary.totalWorkedSeconds)} />
        <MetricCard icon={Users} label="Employees Worked" value={String(data.summary.employeesWorked)} />
        <MetricCard icon={ListChecks} label="Tasks in Project" value={String(data.summary.taskCount)} />
        <MetricCard icon={CalendarDays} label="Avg. per Employee" value={formatDuration(data.summary.averageSecondsPerEmployee)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.65fr)]">
        <section className="rounded-3xl border border-line bg-surface p-4 shadow-panel sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-heading">Employees</h2>
              <p className="text-xs text-faint">People with recorded work in this project</p>
            </div>
            <Badge tone="info">{data.employees.length}</Badge>
          </div>

          {data.employees.length > 0 && (
            <EmployeeContributionDonut employees={data.employees} totalSeconds={data.summary.totalWorkedSeconds} />
          )}

          <div className="space-y-2.5">
            {data.employees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-faint">No work time has been recorded for this project yet.</div>
            ) : data.employees.map((item) => {
              const selected = item.employee._id === selectedEmployeeId;
              const width = Math.max(6, Math.round((item.totalSeconds / maxEmployeeTime) * 100));
              return (
                <button
                  key={item.employee._id}
                  type="button"
                  onClick={() => setSelectedEmployeeId(item.employee._id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-all ${selected ? 'border-primary-400 bg-primary-50/70 shadow-sm dark:bg-primary-950/20' : 'border-line bg-surface hover:border-primary-200 hover:bg-surface-hover'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                      {initials(item.employee.firstName, item.employee.lastName)}
                      {item.isWorking && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-heading">{personName(item.employee)}</p>
                          <p className="truncate text-xs text-faint">{item.employee.roleName || item.employee.department || item.employee.email}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-heading">{formatDuration(item.totalSeconds)}</p>
                          <p className="text-xs text-faint">{item.taskCount} task{item.taskCount === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${selected ? 'text-primary-600' : 'text-faint'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-4 shadow-panel sm:p-5">
          {!selectedEmployee ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-faint">Select an employee to view their tasks.</div>
          ) : (
            <>
              <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                    {initials(selectedEmployee.employee.firstName, selectedEmployee.employee.lastName)}
                    {selectedEmployee.isWorking && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-surface bg-emerald-500" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-heading">{personName(selectedEmployee.employee)}</h2>
                    <p className="text-xs text-faint">{selectedEmployee.employee.roleName || selectedEmployee.employee.department || selectedEmployee.employee.email}</p>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div><p className="text-xs text-faint">Total Time</p><p className="mt-1 font-semibold text-heading">{formatDuration(selectedEmployee.totalSeconds)}</p></div>
                  <div><p className="text-xs text-faint">Tasks Worked</p><p className="mt-1 font-semibold text-heading">{selectedEmployee.taskCount}</p></div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-heading">Tasks in this project</h3>
                  <p className="text-xs text-faint">Click a task to open its detailed work sessions.</p>
                </div>
                {selectedEmployee.isWorking && <Badge tone="success">Working now</Badge>}
              </div>

              <div className="mt-3 space-y-2.5">
                {employeeLoading ? (
                  <div className="py-12 text-center text-sm text-faint">Loading employee tasks…</div>
                ) : (employeeDetails?.tasks ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-faint">No task work was recorded in this period.</div>
                ) : employeeDetails!.tasks.map((task) => {
                  const share = selectedEmployee.totalSeconds ? Math.max(4, Math.round((task.totalSeconds / selectedEmployee.totalSeconds) * 100)) : 0;
                  return (
                    <button
                      key={task._id}
                      type="button"
                      onClick={() => navigate(`/work-time?project=${project._id}&employee=${selectedEmployee.employee._id}&task=${task._id}`)}
                      className="group w-full rounded-2xl border border-line bg-surface p-3.5 text-left transition hover:border-primary-200 hover:bg-surface-hover"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:text-primary-300">
                          <ListChecks className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-heading">{task.title}</p>
                            <Badge tone={TASK_TONE[task.status]}>{task.status.replace(/_/g, ' ')}</Badge>
                            {task.isArchived && <Badge tone="neutral">Archived</Badge>}
                            {task.isWorking && <Badge tone="success">Running</Badge>}
                          </div>
                          {task.description && <p className="mt-0.5 truncate text-xs text-faint">{task.description}</p>}
                          <div className="mt-2 flex items-center gap-3">
                            <div className="h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary-500" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-xs text-faint">{task.sessionCount} session{task.sessionCount === 1 ? '' : 's'}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-heading">{formatDuration(task.totalSeconds)}</p>
                          {task.manualSeconds > 0 && <p className="mt-0.5 text-[11px] text-faint">{formatDuration(task.manualSeconds)} manual</p>}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-primary-600" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}


function EmployeeContributionDonut({ employees, totalSeconds }: { employees: Array<{ employee: EmployeeRef; totalSeconds: number }>; totalSeconds: number }) {
  const top = [...employees].sort((a, b) => b.totalSeconds - a.totalSeconds).slice(0, 5);
  const topTotal = top.reduce((sum, item) => sum + item.totalSeconds, 0);
  const others = Math.max(0, totalSeconds - topTotal);
  const rows = others > 0 ? [...top, { employee: { _id: 'others', firstName: 'Others', lastName: '', email: '' } as EmployeeRef, totalSeconds: others }] : top;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const tones = ['rgb(var(--color-primary-600))', 'rgb(var(--color-primary-400))', 'rgb(var(--color-primary-300))', 'rgb(var(--color-primary-200))', 'rgb(var(--color-primary-800))', 'rgb(148 163 184)'];

  return (
    <div className="mb-4 rounded-2xl border border-line bg-surface-hover/50 p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-heading">Time contribution</p>
        <p className="text-xs text-faint">Share of total recorded project work</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Employee time contribution donut chart">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(226 232 240)" strokeWidth="14" />
            {rows.map((item, index) => {
              const fraction = totalSeconds > 0 ? item.totalSeconds / totalSeconds : 0;
              const length = fraction * circumference;
              const circle = (
                <circle
                  key={item.employee._id}
                  cx="60" cy="60" r={radius} fill="none"
                  stroke={tones[index % tones.length]} strokeWidth="14"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset} strokeLinecap="butt"
                />
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-bold text-heading">{formatDuration(totalSeconds)}</span>
            <span className="text-[10px] text-faint">total</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {rows.map((item, index) => {
            const percentage = totalSeconds > 0 ? Math.round((item.totalSeconds / totalSeconds) * 100) : 0;
            return (
              <div key={item.employee._id} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tones[index % tones.length] }} />
                <span className="min-w-0 flex-1 truncate text-subtle">{item.employee._id === 'others' ? 'Others' : personName(item.employee)}</span>
                <span className="font-medium text-heading">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface-hover px-3 py-2.5"><p className="text-[11px] uppercase tracking-wide text-faint">{label}</p><p className="mt-1 truncate font-medium text-heading">{value}</p></div>;
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-panel">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-950/30 dark:text-primary-300"><Icon className="h-5 w-5" /></div>
        <div><p className="text-xs text-faint">{label}</p><p className="mt-0.5 text-xl font-bold text-heading">{value}</p></div>
      </div>
    </div>
  );
}
