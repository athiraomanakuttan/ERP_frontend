import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { IconButton } from '@/components/atoms/IconButton';
import { Pencil, Trash2, Plus, Clock3, PlusCircle, Search, RotateCcw, CalendarDays } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Checkbox } from '@/components/atoms/Checkbox';
import { Pagination } from '@/components/molecules/Pagination';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { listTasks, deleteTask, getTaskFilterOptions, TaskListParams } from '@/features/tasks/taskService';
import { TaskFormModal } from '@/features/tasks/TaskFormModal';
import { TaskStatusControl } from '@/features/tasks/TaskStatusControl';
import { TaskTimerButton } from '@/features/tasks/TaskTimerButton';
import { SelfManualWorkTimeModal } from '@/features/workTime/SelfManualWorkTimeModal';
import { useCurrentTimer } from '@/features/tasks/useCurrentTimer';
import { useAppSelector } from '@/store/hooks';
import { Task, TaskStatus, TaskPriority, EmployeeRef } from '@/types/entities';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: Array<{ value: '' | TaskStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'to_do', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'reopened', label: 'Reopened' },
];

const PRIORITY_OPTIONS: Array<{ value: '' | TaskPriority; label: string }> = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_EDGE: Record<TaskStatus, string> = {
  to_do: 'border-l-blue-500',
  in_progress: 'border-l-amber-500',
  on_hold: 'border-l-orange-500',
  pending_approval: 'border-l-violet-500',
  completed: 'border-l-emerald-500',
  cancelled: 'border-l-red-500',
  reopened: 'border-l-fuchsia-500',
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  high: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  urgent: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
};

function formatDuration(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function dueLabel(date?: string) {
  if (!date) return { primary: 'No due date', secondary: '', overdue: false };
  const due = new Date(date);
  const today = new Date();
  const endToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.ceil((dueDay.getTime() - endToday.getTime()) / 86400000);
  return {
    primary: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    secondary: days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` : days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} left`,
    overdue: days < 0,
  };
}

function initials(person: EmployeeRef) {
  return `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase();
}

export function TasksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useAppSelector((s) => s.auth.employee);
  const currentEmployeeId = currentUser?.id;
  const permissions = currentUser?.permissionKeys ?? [];
  const canCreate = Boolean(currentUser?.isAdmin || permissions.includes('tasks:create'));
  const canEdit = Boolean(currentUser?.isAdmin || permissions.includes('tasks:edit'));
  const canDelete = Boolean(currentUser?.isAdmin || permissions.includes('tasks:delete'));
  const canApprove = Boolean(currentUser?.isAdmin || permissions.includes('tasks:approve'));
  const canReject = Boolean(currentUser?.isAdmin || permissions.includes('tasks:reject'));
  const canAssign = Boolean(currentUser?.isAdmin || permissions.includes('tasks:assign'));
  const canViewAllWorkTime = Boolean(currentUser?.isAdmin || (permissions.includes('projects:view_all') && permissions.includes('tasks:view_all')));

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | TaskStatus>('');
  const [priorityFilter, setPriorityFilter] = useState<'' | TaskPriority>('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [manualTimeTask, setManualTimeTask] = useState<Task | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const { data: filterOptions } = useQuery({
    queryKey: ['task-filter-options', currentEmployeeId, permissions.join('|')],
    queryFn: getTaskFilterOptions,
    staleTime: 60_000,
  });
  const projects = filterOptions?.projects ?? [];
  const companyOptions = filterOptions?.companies ?? [];
  const visibleProjects = companyFilter
    ? projects.filter((project) => project.clientCompany === companyFilter)
    : projects;

  const { data: currentTimer } = useCurrentTimer();

  const baseParams = useMemo<TaskListParams>(() => ({
    search: debouncedSearch || undefined,
    project: projectFilter || undefined,
    company: !projectFilter && companyFilter ? companyFilter : undefined,
    assignee: myTasksOnly ? currentEmployeeId : undefined,
    priority: priorityFilter || undefined,
    dueFrom: dueFrom || undefined,
    dueTo: dueTo || undefined,
  }), [debouncedSearch, projectFilter, companyFilter, myTasksOnly, currentEmployeeId, priorityFilter, dueFrom, dueTo]);

  const listParams: TaskListParams = {
    ...baseParams,
    page,
    limit: PAGE_SIZE,
    status: statusFilter || undefined,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['tasks', listParams],
    queryFn: () => listTasks(listParams),
    placeholderData: keepPreviousData,
  });

  const { data: summary } = useQuery({
    queryKey: ['tasks-summary', baseParams],
    queryFn: async () => {
      const [all, todo, progress, pending, completed] = await Promise.all([
        listTasks({ ...baseParams, page: 1, limit: 1 }),
        listTasks({ ...baseParams, page: 1, limit: 1, status: 'to_do' }),
        listTasks({ ...baseParams, page: 1, limit: 1, status: 'in_progress' }),
        listTasks({ ...baseParams, page: 1, limit: 1, status: 'pending_approval' }),
        listTasks({ ...baseParams, page: 1, limit: 1, status: 'completed' }),
      ]);
      return { total: all.total, todo: todo.total, progress: progress.total, pending: pending.total, completed: completed.total };
    },
    staleTime: 15_000,
  });

  const tasks = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-summary'] });
      setDeleting(null);
    },
  });

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  function clearFilters() {
    setSearchInput('');
    setProjectFilter('');
    setCompanyFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setDueFrom('');
    setDueTo('');
    setMyTasksOnly(false);
    setPage(1);
  }

  const hasFilters = Boolean(searchInput || projectFilter || companyFilter || statusFilter || priorityFilter || dueFrom || dueTo || myTasksOnly);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-heading">Tasks</h1>
          <p className="mt-1 text-sm text-subtle">Plan, assign and track all project tasks in one place.</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Create Task
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total Tasks', summary?.total ?? data?.total ?? 0, 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'],
          ['To Do', summary?.todo ?? 0, 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300'],
          ['In Progress', summary?.progress ?? 0, 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'],
          ['Pending Approval', summary?.pending ?? 0, 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300'],
          ['Completed', summary?.completed ?? 0, 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-line bg-surface p-4 shadow-panel">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Clock3 className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-medium text-subtle">{label}</p>
                <p className="mt-0.5 text-2xl font-semibold text-heading">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-line bg-surface p-4 shadow-panel xl:sticky xl:top-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-heading">Filters</h2>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-primary-400"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-subtle">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input
                  placeholder="Search tasks…"
                  value={searchInput}
                  onChange={(e) => resetToFirstPage(setSearchInput)(e.target.value)}
                  className="pl-9"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-subtle">Client company</span>
              <Select value={companyFilter} onChange={(e) => { resetToFirstPage(setCompanyFilter)(e.target.value); setProjectFilter(''); }}>
                <option value="">All companies</option>
                {companyOptions.map((company) => <option key={company._id} value={company._id}>{company.companyName}</option>)}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-subtle">Project</span>
              <Select value={projectFilter} onChange={(e) => resetToFirstPage(setProjectFilter)(e.target.value)}>
                <option value="">All projects</option>
                {visibleProjects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-subtle">Status</span>
              <Select value={statusFilter} onChange={(e) => resetToFirstPage(setStatusFilter)(e.target.value as '' | TaskStatus)}>
                {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-subtle">Priority</span>
              <Select value={priorityFilter} onChange={(e) => resetToFirstPage(setPriorityFilter)(e.target.value as '' | TaskPriority)}>
                {PRIORITY_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </Select>
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-subtle">Due date</span>
              <div className="space-y-2">
                <Input type="date" value={dueFrom} onChange={(e) => resetToFirstPage(setDueFrom)(e.target.value)} aria-label="Due date from" />
                <Input type="date" value={dueTo} onChange={(e) => resetToFirstPage(setDueTo)(e.target.value)} aria-label="Due date to" />
              </div>
            </div>

            <div className="rounded-xl bg-muted p-3">
              <Checkbox id="my-tasks-only" label="My tasks only" checked={myTasksOnly} onChange={(e) => resetToFirstPage(setMyTasksOnly)(e.target.checked)} />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-heading">{data?.total ?? 0} task{data?.total === 1 ? '' : 's'}</h2>
              {isFetching && !isLoading && <p className="text-xs text-faint">Refreshing…</p>}
            </div>
          </div>

          <div className="space-y-2.5">
            {isLoading && Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />)}

            {!isLoading && tasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
                <p className="font-medium text-heading">No tasks match your filters</p>
                <p className="mt-1 text-sm text-subtle">Try clearing one or more filters.</p>
              </div>
            )}

            {tasks.map((task) => {
              const assignedPeople = task.assignees.filter((a): a is EmployeeRef => typeof a !== 'string');
              const isAssignedToCurrentUser = Boolean(currentEmployeeId && task.assignees.some((a) => (typeof a === 'string' ? a : a._id) === currentEmployeeId));
              const due = dueLabel(task.dueDate);
              const projectName = typeof task.project === 'string' ? 'Project' : task.project.name;

              return (
                <article key={task._id} className={`rounded-2xl border border-line border-l-[3px] ${STATUS_EDGE[task.status]} bg-surface p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-panel`}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_150px_150px] xl:grid-cols-[minmax(0,1fr)_170px_190px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-heading">{task.title}</h3>
                          <p className="mt-0.5 text-xs text-subtle">{projectName}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
                      </div>

                      {task.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-subtle">{task.description}</p>}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <TaskStatusControl task={task} canEdit={canEdit || isAssignedToCurrentUser} canApprove={canApprove} canReject={canReject} currentEmployeeId={currentEmployeeId} isAdmin={Boolean(currentUser?.isAdmin)} />

                        <div className="flex items-center -space-x-2" title={assignedPeople.map((p) => `${p.firstName} ${p.lastName ?? ''}`.trim()).join(', ')}>
                          {assignedPeople.slice(0, 3).map((person) => (
                            <span key={person._id} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary-100 text-[10px] font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">
                              {initials(person)}
                            </span>
                          ))}
                          {assignedPeople.length > 3 && <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-muted text-[10px] font-semibold text-subtle">+{assignedPeople.length - 3}</span>}
                          {assignedPeople.length === 0 && <span className="text-xs text-faint">No assignees</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 lg:flex-col lg:items-start lg:justify-center">
                      <CalendarDays className={`h-4 w-4 shrink-0 ${due.overdue ? 'text-red-500' : 'text-faint'}`} />
                      <div>
                        <p className={`text-sm font-medium ${due.overdue ? 'text-red-600 dark:text-red-400' : 'text-heading'}`}>{due.primary}</p>
                        {due.secondary && <p className={`text-xs ${due.overdue ? 'text-red-500' : 'text-faint'}`}>{due.secondary}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 lg:flex-col lg:items-end lg:justify-center">
                      {canViewAllWorkTime && (
                        <button type="button" onClick={() => navigate(`/work-time?task=${task._id}`)} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400" title="View work sessions">
                          <Clock3 className="h-3.5 w-3.5" /> {formatDuration(task.totalWorkedSeconds ?? 0)} worked
                        </button>
                      )}

                      {isAssignedToCurrentUser && currentEmployeeId ? (
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <TaskTimerButton taskId={task._id} employeeId={currentEmployeeId} currentTimer={currentTimer} status={task.status} />
                          <button type="button" onClick={() => setManualTimeTask(task)} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:underline dark:text-primary-400">
                            <PlusCircle className="h-3 w-3" /> Manual time
                          </button>
                        </div>
                      ) : null}

                      {(canEdit || canDelete) && (
                        <div className="flex gap-1">
                          {canEdit && <IconButton onClick={() => { setEditing(task); setModalOpen(true); }} aria-label="Edit task"><Pencil className="h-4 w-4" /></IconButton>}
                          {canDelete && <IconButton onClick={() => setDeleting(task)} aria-label="Delete task"><Trash2 className="h-4 w-4" /></IconButton>}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
            <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} limit={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </section>
      </div>

      <SelfManualWorkTimeModal task={manualTimeTask} onClose={() => setManualTimeTask(null)} />
      <TaskFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} task={editing} defaultProjectId={projectFilter || undefined} canAssign={canAssign} currentEmployeeId={currentEmployeeId} />
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete task"
        message={`Delete "${deleting?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting._id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
