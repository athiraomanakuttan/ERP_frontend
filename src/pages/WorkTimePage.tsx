import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Clock3, PlayCircle, Plus, TimerReset, Wrench } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Badge } from '@/components/atoms/Badge';
import { Modal } from '@/components/molecules/Modal';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { listEmployees } from '@/features/employees/employeeService';
import { listProjects } from '@/features/projects/projectService';
import { listTasks } from '@/features/tasks/taskService';
import { createManualWorkSession, listWorkSessions } from '@/features/workTime/workTimeService';
import { EmployeeRef, Task, WorkSession } from '@/types/entities';
import { useAppSelector } from '@/store/hooks';
import { scrollToFirstError } from '@/utils/validation';

const PAGE_SIZE = 15;

function formatDuration(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function personName(person: EmployeeRef | string | null | undefined) {
  if (!person || typeof person === 'string') return '—';
  return `${person.firstName} ${person.lastName ?? ''}`.trim();
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function WorkTimePage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const currentUser = useAppSelector((s) => s.auth.employee);
  const permissions = currentUser?.permissionKeys ?? [];
  const canFilterEmployees = Boolean(currentUser?.isAdmin || permissions.includes('employees:view_all'));
  const [page, setPage] = useState(1);
  const [employee, setEmployee] = useState(() => searchParams.get('employee') ?? '');
  const [project, setProject] = useState(() => searchParams.get('project') ?? '');
  const [task, setTask] = useState(() => searchParams.get('task') ?? '');
  const [entryType, setEntryType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [manualOpen, setManualOpen] = useState(false);

  const params = {
    page,
    limit: PAGE_SIZE,
    employee: employee || undefined,
    project: project || undefined,
    task: task || undefined,
    entryType: entryType === 'manual' || entryType === 'automatic' ? entryType : undefined,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  } as const;

  const { data, isLoading } = useQuery({
    queryKey: ['work-time', params],
    queryFn: () => listWorkSessions(params),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['work-time-employees'],
    queryFn: () => listEmployees({ page: 1, limit: 100 }),
    staleTime: 120_000,
    enabled: canFilterEmployees,
  });
  const { data: projectsData } = useQuery({
    queryKey: ['work-time-projects'],
    queryFn: () => listProjects({ page: 1, limit: 100 }),
    staleTime: 120_000,
  });
  const { data: tasksData } = useQuery({
    queryKey: ['work-time-tasks'],
    queryFn: () => listTasks({ page: 1, limit: 100 }),
    staleTime: 60_000,
  });

  const columns: Column<WorkSession>[] = [
    { header: 'Employee', render: (s) => <div><p className="font-medium text-heading">{personName(s.employee)}</p>{typeof s.employee !== 'string' && <p className="text-xs text-faint">{s.employee.email}</p>}</div> },
    { header: 'Project / Task', render: (s) => {
      if (typeof s.task === 'string') return <span>{s.task}</span>;
      const projectName = typeof s.task.project === 'string' ? s.task.project : s.task.project?.name;
      return <div><p className="font-medium text-heading">{s.task.title}</p><p className="text-xs text-faint">{projectName ?? '—'}</p></div>;
    } },
    { header: 'Started', render: (s) => new Date(s.startTime).toLocaleString() },
    { header: 'Ended', render: (s) => s.endTime ? new Date(s.endTime).toLocaleString() : <Badge tone="info">Running</Badge> },
    { header: 'Duration', render: (s) => <span className="font-mono text-xs">{s.endTime ? formatDuration(s.durationSeconds ?? 0) : 'Running'}</span> },
    { header: 'Source', render: (s) => <div><Badge tone={s.entryType === 'manual' ? 'warning' : 'neutral'}>{s.entryType === 'manual' ? 'Manual' : 'Timer'}</Badge>{s.manualReason && <p className="mt-1 max-w-[220px] text-xs text-faint">{s.manualReason}</p>}</div> },
    { header: 'Recorded by', render: (s) => <span className="text-xs">{s.entryType === 'manual' ? personName(s.createdBy) : 'Employee timer'}</span> },
    { header: 'Ended by', render: (s) => <span className="text-xs capitalize">{s.endReason?.replace(/_/g, ' ') ?? '—'}</span> },
  ];

  const summary = data?.summary ?? { totalSeconds: 0, sessionCount: 0, manualSessions: 0, runningSessions: 0 };

  const resetFilters = () => {
    setEmployee(''); setProject(''); setTask(''); setEntryType(''); setFrom(''); setTo(''); setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Work Time</h1>
          <p className="mt-1 text-sm text-faint">Detailed task sessions, timer history and manual corrections.</p>
        </div>
        {currentUser?.isAdmin && <Button onClick={() => setManualOpen(true)}><Plus className="h-4 w-4" /> Add Manual Work Time</Button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Clock3} label="Recorded Time" value={formatDuration(summary.totalSeconds)} />
        <SummaryCard icon={TimerReset} label="Sessions" value={String(summary.sessionCount)} />
        <SummaryCard icon={Wrench} label="Manual Entries" value={String(summary.manualSessions)} />
        <SummaryCard icon={PlayCircle} label="Running Now" value={String(summary.runningSessions)} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-panel">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {canFilterEmployees ? (
            <Select value={employee} onChange={(e) => { setEmployee(e.target.value); setPage(1); }}>
              <option value="">All employees</option>
              {(employeesData?.items ?? []).map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName ?? ''}</option>)}
            </Select>
          ) : <div className="hidden xl:block" />}
          <Select value={project} onChange={(e) => { setProject(e.target.value); setPage(1); }}>
            <option value="">All projects</option>
            {(projectsData?.items ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          <Select value={task} onChange={(e) => { setTask(e.target.value); setPage(1); }}>
            <option value="">All tasks</option>
            {(tasksData?.items ?? []).map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
          </Select>
          <Select value={entryType} onChange={(e) => { setEntryType(e.target.value); setPage(1); }}>
            <option value="">All sources</option><option value="automatic">Timer</option><option value="manual">Manual</option>
          </Select>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" />
        </div>
        <div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
        <DataTable columns={columns} rows={data?.items ?? []} isLoading={isLoading} rowKey={(s) => s._id} emptyLabel="No work sessions match the selected filters" />
        <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} limit={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {currentUser?.isAdmin && <ManualWorkTimeModal
        isOpen={manualOpen}
        onClose={() => setManualOpen(false)}
        tasks={tasksData?.items ?? []}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['work-time'] });
          queryClient.invalidateQueries({ queryKey: ['task-total-time'] });
          setManualOpen(false);
        }}
      />}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="rounded-2xl border border-line bg-surface p-4 shadow-panel"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary-50 p-2 text-primary-600 dark:bg-primary-950/30"><Icon className="h-5 w-5" /></div><div><p className="text-xs text-faint">{label}</p><p className="mt-0.5 text-xl font-bold text-heading">{value}</p></div></div></div>;
}

function ManualWorkTimeModal({ isOpen, onClose, tasks, onSaved }: { isOpen: boolean; onClose: () => void; tasks: Task[]; onSaved: () => void }) {
  const [taskId, setTaskId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  const selectedTask = useMemo(() => tasks.find((t) => t._id === taskId), [tasks, taskId]);
  const assignees = (selectedTask?.assignees ?? []).filter((a): a is EmployeeRef => typeof a !== 'string');

  const mutation = useMutation({
    mutationFn: () => createManualWorkSession({ taskId, employeeId, startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString(), reason }),
    onSuccess: () => {
      setTaskId(''); setEmployeeId(''); setStartTime(''); setEndTime(''); setReason(''); setLocalError('');
      onSaved();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setLocalError('');
    if (!taskId || !employeeId) { setLocalError('Select a task and employee.'); scrollToFirstError(); return; }
    if (!startTime || !endTime) { setLocalError('Start and end time are required.'); scrollToFirstError(); return; }
    if (new Date(endTime) <= new Date(startTime)) { setLocalError('End time must be after start time.'); scrollToFirstError(); return; }
    if (reason.trim().length < 5) { setLocalError('Reason must contain at least 5 characters.'); scrollToFirstError(); return; }
    mutation.mutate();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Manual Work Time">
      <form className="space-y-4" onSubmit={submit}>
        <div><label className="mb-1 block text-sm font-medium text-body">Task <span className="text-red-500">*</span></label><Select value={taskId} onChange={(e) => { setTaskId(e.target.value); setEmployeeId(''); }}><option value="">Select task</option>{tasks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}</Select></div>
        <div><label className="mb-1 block text-sm font-medium text-body">Employee <span className="text-red-500">*</span></label><Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!taskId}><option value="">Select assigned employee</option>{assignees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName ?? ''}</option>)}</Select>{taskId && assignees.length === 0 && <p className="mt-1 text-xs text-faint">No populated assignees were returned for this task.</p>}</div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium text-body">Start time <span className="text-red-500">*</span></label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div><div><label className="mb-1 block text-sm font-medium text-body">End time <span className="text-red-500">*</span></label><Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div></div>
        <div><label className="mb-1 block text-sm font-medium text-body">Reason for manual entry <span className="text-red-500">*</span></label><textarea className="min-h-24 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body outline-none focus:border-primary-500" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Example: Employee forgot to start the timer" maxLength={500} /></div>
        {(localError || mutation.error) && <p data-field-error="true" className="text-sm text-red-600">{localError || errorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" isLoading={mutation.isPending}>Save Work Time</Button></div>
      </form>
    </Modal>
  );
}
