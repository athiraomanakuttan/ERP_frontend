import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, Clock3,
  Gauge, ListChecks, TimerReset, TrendingUp, UserRoundCheck, Users, Palmtree,
  ChevronRight, Activity, ShieldCheck,
} from 'lucide-react';
import { FormField } from '@/components/molecules/FormField';
import { Spinner } from '@/components/atoms/Spinner';
import { AnalyticsEmployee, reportAnalytics } from '@/features/reports/reportService';
import { formatDuration } from '@/features/attendance/attendanceMath';

function dateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function monthStart() {
  const now = new Date();
  return dateString(new Date(now.getFullYear(), now.getMonth(), 1));
}
function pct(value: number, max: number) { return max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0; }
function nameOf(row: AnalyticsEmployee) { return `${row.employee.firstName} ${row.employee.lastName ?? ''}`.trim(); }

type Section = 'overview' | 'people' | 'work' | 'business' | 'audit';

export function ReportsPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(dateString(new Date()));
  const [section, setSection] = useState<Section>('overview');

  const query = useQuery({
    queryKey: ['analytics-report', from, to],
    queryFn: () => reportAnalytics({ from, to }),
  });
  const report = query.data;

  const topEmployees = useMemo(() => report?.employees.slice(0, 6) ?? [], [report]);
  const maxEmployeeTask = Math.max(1, ...topEmployees.map((x) => x.taskSeconds));
  const maxProject = Math.max(1, ...(report?.projects ?? []).map((x) => x.seconds));
  const maxClient = Math.max(1, ...(report?.clients ?? []).map((x) => x.seconds));
  const maxLeave = Math.max(1, ...(report?.leaveTypes ?? []).map((x) => x.approvedDays + x.pendingDays));

  const tabs: Array<{ key: Section; label: string; icon: typeof BarChart3 }> = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'people', label: 'People', icon: Users },
    { key: 'work', label: 'Work', icon: ListChecks },
    { key: 'business', label: 'Business', icon: Building2 },
    { key: 'audit', label: 'Audit', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Reports & Insights</h1>
          <p className="mt-1 text-sm text-subtle">Understand attendance, effort, leave usage and client/project workload instead of repeating operational lists.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-surface p-3 shadow-sm">
          <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-subtle">From</label><FormField id="report-from" label="" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-subtle">To</label><FormField id="report-to" label="" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setSection(key)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${section === key ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300' : 'border-line bg-surface text-body hover:bg-surface-hover'}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {query.isLoading ? <div className="py-24"><Spinner className="mx-auto" /></div> : query.isError || !report ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">Unable to load report analytics for this period.</div>
      ) : (
        <>
          {section === 'overview' && <Overview report={report} navigate={navigate} from={from} to={to} topEmployees={topEmployees} maxEmployeeTask={maxEmployeeTask} />}
          {section === 'people' && <People report={report} navigate={navigate} from={from} to={to} maxEmployeeTask={maxEmployeeTask} maxLeave={maxLeave} />}
          {section === 'work' && <Work report={report} navigate={navigate} from={from} to={to} maxProject={maxProject} />}
          {section === 'business' && <Business report={report} navigate={navigate} from={from} to={to} maxClient={maxClient} />}
          {section === 'audit' && <Audit report={report} navigate={navigate} from={from} to={to} />}
        </>
      )}
    </div>
  );
}

function Overview({ report, navigate, from, to, topEmployees, maxEmployeeTask }: any) {
  const org = report.organization;
  const taskTotal = Object.values(report.taskStatusCounts as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Clock3} label="Attendance time" value={formatDuration(org.attendanceSeconds)} hint={`${org.workedDays} worked employee-days`} onClick={() => navigate(`/attendance?from=${from}&to=${to}&scope=all`)} />
      <Metric icon={Gauge} label="Task-time utilization" value={`${org.utilizationPercent}%`} hint={`${formatDuration(org.taskSeconds)} recorded on tasks`} />
      <Metric icon={CheckCircle2} label="Tasks completed" value={String(org.tasksCompleted)} hint={`${taskTotal} visible tasks`} onClick={() => navigate(`/tasks?status=completed&from=${from}&to=${to}`)} />
      <Metric icon={Palmtree} label="Approved leave days" value={String(org.leaveDays)} hint="Across visible employees" onClick={() => navigate(`/leaves?tab=reviewed&status=approved&from=${from}&to=${to}`)} />
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
      <Card title="Where work time is going" subtitle="Top employees by recorded task time">
        <div className="space-y-4">
          {topEmployees.length === 0 ? <Empty /> : topEmployees.map((row: AnalyticsEmployee) => (
            <button key={row.employee._id} onClick={() => navigate(`/work-time?employee=${row.employee._id}&from=${from}&to=${to}`)} className="group block w-full text-left">
              <div className="mb-1.5 flex items-center justify-between gap-3"><div><span className="font-semibold text-heading">{nameOf(row)}</span><span className="ml-2 text-xs text-subtle">{row.taskCount} tasks</span></div><span className="font-semibold tabular-nums text-heading">{formatDuration(row.taskSeconds)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary-500 transition group-hover:bg-primary-600" style={{ width: `${pct(row.taskSeconds, maxEmployeeTask)}%` }} /></div>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Time composition" subtitle="Attendance time vs task-recorded time">
        <Donut percent={org.utilizationPercent} center={`${org.utilizationPercent}%`} label="Task utilization" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Mini label="Attendance" value={formatDuration(org.attendanceSeconds)} />
          <Mini label="Task time" value={formatDuration(org.taskSeconds)} />
          <Mini label="Automatic timer" value={formatDuration(Math.max(0, org.taskSeconds - org.manualSeconds))} />
          <Mini label="Manual time" value={formatDuration(org.manualSeconds)} />
        </div>
      </Card>
    </div>

    <Card title="Management snapshot" subtitle="Quick signals for the selected period">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Signal icon={Users} label="Employees in scope" value={org.employees} />
        <Signal icon={BriefcaseBusiness} label="Active projects" value={org.activeProjects} onClick={() => navigate('/projects?status=active')} />
        <Signal icon={Activity} label="Task sessions recorded" value={report.employees.reduce((n: number, x: AnalyticsEmployee) => n + x.totalSessions, 0)} />
        <Signal icon={TimerReset} label="Manual corrections" value={report.manualEntries.length} />
      </div>
    </Card>
  </div>;
}

function People({ report, navigate, from, to, maxEmployeeTask, maxLeave }: any) {
  return <div className="space-y-5">
    <Card title="Employee work summary" subtitle="Attendance time, task time and leave in one view">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {report.employees.map((row: AnalyticsEmployee) => (
          <div key={row.employee._id} className="rounded-2xl border border-line bg-surface-hover/40 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-heading">{nameOf(row)}</p><p className="text-xs text-subtle">{row.employee.email}</p></div><span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">{row.utilizationPercent}%</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary-500" style={{ width: `${pct(row.taskSeconds, maxEmployeeTask)}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><Mini label="Worked days" value={String(row.daysWorked)} /><Mini label="Task time" value={formatDuration(row.taskSeconds)} /><Mini label="Leave days" value={String(row.leaveDays)} /><Mini label="Completed" value={`${row.completedTaskCount}/${row.taskCount}`} /></div>
            <div className="mt-3 flex gap-2"><Action onClick={() => navigate(`/attendance?employee=${row.employee._id}&from=${from}&to=${to}`)}>Attendance</Action><Action onClick={() => navigate(`/leaves?tab=reviewed&status=approved&employee=${row.employee._id}&from=${from}&to=${to}`)}>Leaves</Action><Action onClick={() => navigate(`/work-time?employee=${row.employee._id}&from=${from}&to=${to}`)}>Time</Action></div>
          </div>
        ))}
      </div>
    </Card>
    <Card title="Leave utilization" subtitle="Approved and pending days by leave type">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {report.leaveTypes.length === 0 ? <Empty /> : report.leaveTypes.map((item: any) => <button key={item.leaveTypeId} onClick={() => navigate(`/leaves?leaveType=${item.leaveTypeId}&from=${from}&to=${to}`)} className="rounded-2xl border border-line p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><p className="font-semibold text-heading">{item.name}</p><ChevronRight className="h-4 w-4 text-subtle" /></div><div className="mt-3 flex items-end gap-2"><span className="text-2xl font-bold text-heading">{item.approvedDays}</span><span className="pb-1 text-xs text-subtle">approved days</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct(item.approvedDays + item.pendingDays, maxLeave)}%` }} /></div><p className="mt-2 text-xs text-subtle">{item.pendingDays} pending · {item.entitlementPerEmployee} days/year per employee</p></button>)}
      </div>
    </Card>
  </div>;
}

function Work({ report, navigate, from, to, maxProject }: any) {
  const counts = report.taskStatusCounts;
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CheckCircle2} label="Completed" value={String(counts.completed ?? 0)} onClick={() => navigate('/tasks?status=completed')} /><Metric icon={TrendingUp} label="In progress" value={String(counts.in_progress ?? 0)} onClick={() => navigate('/tasks?status=in_progress')} /><Metric icon={Clock3} label="Pending approval" value={String(counts.pending_approval ?? 0)} onClick={() => navigate('/tasks?status=pending_approval')} /><Metric icon={TimerReset} label="Manual work time" value={formatDuration(report.organization.manualSeconds)} onClick={() => navigate(`/work-time?entryType=manual&from=${from}&to=${to}`)} /></div>
    <Card title="Project effort" subtitle="Projects ranked by recorded work time">
      <div className="grid gap-3 lg:grid-cols-2">
        {report.projects.length === 0 ? <Empty /> : report.projects.map((p: any) => <button key={p.projectId} onClick={() => navigate(`/projects/${p.projectId}`)} className="rounded-2xl border border-line p-4 text-left transition hover:border-primary-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-heading">{p.name}</p><p className="text-xs capitalize text-subtle">{p.status.replaceAll('_',' ')}</p></div><span className="font-bold text-heading">{formatDuration(p.seconds)}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary-500" style={{ width: `${pct(p.seconds, maxProject)}%` }} /></div><div className="mt-3 flex gap-4 text-xs text-subtle"><span>{p.employees} employees</span><span>{p.tasks} tasks</span><span>{formatDuration(p.manualSeconds)} manual</span></div></button>)}
      </div>
    </Card>
  </div>;
}

function Business({ report, navigate, maxClient }: any) {
  return <Card title="Client company effort" subtitle="Which clients are consuming the most recorded project time">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {report.clients.length === 0 ? <Empty /> : report.clients.map((c: any) => <button key={c.clientCompanyId} onClick={() => navigate(`/projects?clientCompany=${c.clientCompanyId}`)} className="rounded-2xl border border-line p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between gap-3"><div className="rounded-xl bg-primary-50 p-2 text-primary-600 dark:bg-primary-500/10"><Building2 className="h-5 w-5" /></div><ChevronRight className="h-4 w-4 text-subtle" /></div><p className="mt-3 font-semibold text-heading">{c.companyName}</p><p className="mt-1 text-2xl font-bold text-heading">{formatDuration(c.seconds)}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary-500" style={{ width: `${pct(c.seconds, maxClient)}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><Mini label="Projects" value={String(c.projects)} /><Mini label="Employees" value={String(c.employees)} /><Mini label="Tasks" value={String(c.tasks)} /></div></button>)}
    </div>
  </Card>;
}

function Audit({ report, navigate, from, to }: any) {
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={TimerReset} label="Manual time" value={formatDuration(report.organization.manualSeconds)} /><Metric icon={Activity} label="Manual entries shown" value={String(report.manualEntries.length)} /><Metric icon={ShieldCheck} label="Audit period" value={`${from} → ${to}`} /></div>
    <Card title="Recent manual-time corrections" subtitle="Manual entries are separated from automatic timer time for audit visibility">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {report.manualEntries.length === 0 ? <Empty text="No manual-time corrections in this period." /> : report.manualEntries.map((entry: any, index: number) => <button key={`${entry.taskId}-${entry.startTime}-${index}`} onClick={() => navigate(`/work-time?employee=${entry.employeeId}&task=${entry.taskId}&entryType=manual&from=${from}&to=${to}`)} className="rounded-2xl border border-line p-4 text-left transition hover:border-primary-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-heading">{entry.employeeName}</p><p className="text-xs text-subtle">{entry.taskTitle}</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Manual</span></div><p className="mt-3 text-xl font-bold text-heading">{formatDuration(entry.seconds)}</p><p className="mt-1 line-clamp-2 text-xs text-subtle">{entry.reason || 'No reason supplied'}</p><p className="mt-3 text-[11px] text-subtle">{new Date(entry.startTime).toLocaleString()}</p></button>)}
      </div>
    </Card>
  </div>;
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) { return <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm"><div className="mb-5"><h2 className="font-semibold text-heading">{title}</h2>{subtitle && <p className="mt-1 text-xs text-subtle">{subtitle}</p>}</div>{children}</section>; }
function Metric({ icon: Icon, label, value, hint, onClick }: any) { const Comp:any = onClick ? 'button' : 'div'; return <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-2xl border border-line bg-surface p-4 text-left shadow-sm ${onClick ? 'transition hover:-translate-y-0.5 hover:shadow-md' : ''}`}><div className="flex items-center gap-3"><div className="rounded-xl bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-500/10"><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs text-subtle">{label}</p><p className="truncate text-xl font-bold text-heading">{value}</p>{hint && <p className="mt-0.5 truncate text-[11px] text-subtle">{hint}</p>}</div></div></Comp>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/50 p-2.5"><p className="text-[10px] uppercase tracking-wide text-subtle">{label}</p><p className="mt-0.5 font-semibold text-heading">{value}</p></div>; }
function Signal({ icon: Icon, label, value, onClick }: any) { const Comp:any = onClick ? 'button':'div'; return <Comp type={onClick?'button':undefined} onClick={onClick} className="flex items-center gap-3 rounded-xl bg-muted/45 p-3 text-left"><Icon className="h-5 w-5 text-primary-600"/><div><p className="text-xs text-subtle">{label}</p><p className="font-bold text-heading">{value}</p></div></Comp>; }
function Action({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-body transition hover:bg-surface-hover">{children}</button>; }
function Donut({ percent, center, label }: { percent: number; center: string; label: string }) { const p=Math.max(0,Math.min(100,percent)); return <div className="flex justify-center"><div className="relative grid h-40 w-40 place-items-center rounded-full" style={{background:`conic-gradient(rgb(var(--color-primary-500)) ${p}%, rgb(var(--color-muted)) ${p}% 100%)`}}><div className="grid h-28 w-28 place-items-center rounded-full bg-surface text-center"><div><p className="text-2xl font-bold text-heading">{center}</p><p className="text-xs text-subtle">{label}</p></div></div></div></div>; }
function Empty({ text='No report data in this period.' }: { text?: string }) { return <div className="col-span-full rounded-xl border border-dashed border-line p-8 text-center text-sm text-subtle">{text}</div>; }
