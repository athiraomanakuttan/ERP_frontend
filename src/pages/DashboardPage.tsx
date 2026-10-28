import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, CalendarOff, FolderKanban, ListChecks, CalendarDays, PartyPopper,
  ArrowRight, BriefcaseBusiness, Clock3, CheckCircle2, CircleDot, Plus, TrendingUp,
} from 'lucide-react';
import { Spinner } from '@/components/atoms/Spinner';
import { apiClient } from '@/services/apiClient';
import { useAppSelector } from '@/store/hooks';
import { getUpcomingHolidays } from '@/features/holidays/holidayService';
import { listEmployees } from '@/features/employees/employeeService';
import { listProjects } from '@/features/projects/projectService';
import { listTasks } from '@/features/tasks/taskService';
import { pendingLeaveRequests } from '@/features/leaves/leaveService';
import { Badge } from '@/components/atoms/Badge';

interface AdminDashboardData {
  totalEmployees: number;
  employeesOnLeaveToday: number;
  presentEmployees: number;
  pendingLeaveRequests: number;
  activeProjects: number;
  upcomingEvents: { type: 'birthday' | 'work_anniversary'; employee: string; date: string }[];
}
interface EmployeeDashboardData { myTaskCount: number; myPendingLeaveRequests: number; }

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
function formatDate(date: string) { return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function localDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DashboardPage() {
  const employee = useAppSelector((s) => s.auth.employee);
  const isAdmin = employee?.isAdmin;
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', isAdmin ? 'admin' : 'me'],
    queryFn: async () => { const { data } = await apiClient.get(isAdmin ? '/dashboard/admin' : '/dashboard/me'); return data.data; },
  });
  const { data: upcomingHolidays = [] } = useQuery({ queryKey: ['upcoming-holidays'], queryFn: () => getUpcomingHolidays(5) });

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
  return isAdmin
    ? <AdminDashboard data={data as AdminDashboardData} upcomingHolidays={upcomingHolidays} firstName={employee?.firstName ?? 'Admin'} />
    : <EmployeeDashboard data={data as EmployeeDashboardData} upcomingHolidays={upcomingHolidays} firstName={employee?.firstName ?? ''} />;
}

function AdminDashboard({ data, upcomingHolidays, firstName }: { data: AdminDashboardData; upcomingHolidays: Awaited<ReturnType<typeof getUpcomingHolidays>>; firstName: string }) {
  const today = localDateKey();
  const { data: employees } = useQuery({ queryKey: ['dashboard-recent-employees'], queryFn: () => listEmployees({ page: 1, limit: 5 }) });
  const { data: projects } = useQuery({ queryKey: ['dashboard-projects'], queryFn: () => listProjects({ page: 1, limit: 50 }) });
  const { data: tasks } = useQuery({ queryKey: ['dashboard-tasks'], queryFn: () => listTasks({ page: 1, limit: 5 }) });
  const { data: pendingLeaves = [] } = useQuery({
  queryKey: ['dashboard-pending-leaves'],
  queryFn: () => pendingLeaveRequests()
});

  const total = data?.totalEmployees ?? 0;
  const present = data?.presentEmployees ?? 0;
  const onLeave = data?.employeesOnLeaveToday ?? 0;
  const absent = Math.max(0, total - present - onLeave);
  const attendancePct = pct(present, total);
  const projectItems = projects?.items ?? [];
  const activeProjects = projectItems.filter((p) => p.status === 'active').length || data?.activeProjects || 0;
  const completedProjects = projectItems.filter((p) => p.status === 'completed').length;
  const onHoldProjects = projectItems.filter((p) => p.status === 'on_hold').length;
  const projectTotal = projects?.total ?? projectItems.length;
  const donut = { background: `conic-gradient(rgb(var(--color-primary-600)) 0 ${attendancePct}%, #22c55e ${attendancePct}% ${Math.min(100, attendancePct + pct(onLeave,total))}%, rgb(var(--color-border)) 0)` };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Organization overview</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-heading">{greeting()}, {firstName}! <span className="inline-block">👋</span></h2>
          <p className="mt-1 text-sm text-subtle">Here’s what’s happening across your organization today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-xl border border-line bg-surface px-4 py-2.5 text-right shadow-panel sm:block"><p className="text-xs font-medium text-faint">Today</p><p className="text-sm font-semibold text-heading">{new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</p></div>
          <Link to="/employees" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700"><Plus className="h-4 w-4" /> Quick action</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Employees" value={total} icon={Users} tone="blue" hint={`${employees?.total ?? total} records`} to="/employees" />
        <KpiCard label="Present Today" value={present} icon={UserCheck} tone="green" hint={`${attendancePct}% attendance`} progress={attendancePct} to={`/attendance?tab=team&from=${localDateString()}&to=${localDateString()}`} />
        <KpiCard label="On Leave Today" value={onLeave} icon={CalendarOff} tone="amber" hint={`${pct(onLeave,total)}% of total`} to={`/leaves?tab=reviewed&status=approved&from=${today}&to=${today}`} />
        <KpiCard label="Active Projects" value={data?.activeProjects ?? 0} icon={FolderKanban} tone="violet" hint={`${completedProjects} completed`} to="/projects" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.9fr_.9fr]">
        <Panel title="Attendance overview" subtitle="Live organization status" link={`/attendance?tab=team&from=${localDateString()}&to=${localDateString()}`}>
          <div className="grid gap-5 md:grid-cols-[1fr_180px] md:items-center">
            <div className="space-y-4">
              {[['Present',present,'bg-emerald-500'],['On leave',onLeave,'bg-amber-500'],['Other',absent,'bg-slate-300 dark:bg-slate-600']].map(([label,value,color]) => {
                const valueNum = Number(value); return <div key={String(label)}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-medium text-body">{label}</span><span className="font-semibold text-heading">{valueNum}</span></div><div className="h-2 rounded-full bg-muted"><div className={`h-2 rounded-full ${color}`} style={{width:`${pct(valueNum,total)}%`}} /></div></div>;
              })}
            </div>
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full p-4" style={donut}><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-surface"><span className="text-3xl font-extrabold text-heading">{attendancePct}%</span><span className="text-xs text-faint">Present</span></div></div>
          </div>
        </Panel>

        <Panel title="Leave status" subtitle="Pending approvals">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-center gap-4"><div className="flex h-24 w-24 items-center justify-center rounded-full border-[12px] border-primary-100 dark:border-primary-900/40"><div className="text-center"><p className="text-2xl font-bold text-heading">{pendingLeaves.length}</p><p className="text-[10px] text-faint">Pending</p></div></div><div className="space-y-2 text-sm"><Legend color="bg-primary-500" label="Pending" value={pendingLeaves.length}/><Legend color="bg-emerald-500" label="On leave today" value={onLeave}/></div></div>
            <Link to="/leaves" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">Review leave requests <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </Panel>

        <Panel title="Project status" subtitle="Current portfolio">
          <div className="space-y-3"><Legend color="bg-primary-500" label="Active" value={activeProjects}/><Legend color="bg-emerald-500" label="Completed" value={completedProjects}/><Legend color="bg-amber-500" label="On hold" value={onHoldProjects}/><Legend color="bg-slate-400" label="Total" value={projectTotal}/></div>
          <Link to="/projects" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">View projects <ArrowRight className="h-4 w-4" /></Link>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.35fr_.9fr]">
        <Panel title="Recent employees" link="/employees">
          <div className="divide-y divide-line">{(employees?.items ?? []).map((e) => <div key={e._id} className="flex items-center gap-3 py-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{e.firstName[0]}{e.lastName?.[0] ?? ''}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-heading">{e.firstName} {e.lastName ?? ''}</p><p className="truncate text-xs text-faint">{e.department ?? e.email}</p></div><Badge tone={e.status === 'active' ? 'success' : 'neutral'}>{e.status}</Badge></div>)}</div>
        </Panel>
        <Panel title="Ongoing tasks" link="/tasks">
          <div className="divide-y divide-line">{(tasks?.items ?? []).map((t) => <div key={t._id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-heading">{t.title}</p><p className="mt-0.5 truncate text-xs text-faint">{typeof t.project === 'string' ? 'Project task' : t.project.name}</p></div><TaskStatus status={t.status}/></div>)}</div>
        </Panel>
        <Panel title="Upcoming" link="/holidays">
          <div className="space-y-3">{upcomingHolidays.slice(0,4).map((h) => <div key={h._id} className="flex gap-3"><div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"><span className="text-[10px] uppercase">{new Date(h.date).toLocaleDateString(undefined,{month:'short'})}</span><span className="text-sm font-bold">{new Date(h.date).getDate()}</span></div><div><p className="text-sm font-semibold text-heading">{h.name}</p><p className="text-xs text-faint">Holiday</p></div></div>)}</div>
        </Panel>
      </section>
    </div>
  );
}

function KpiCard({label,value,icon:Icon,tone,hint,progress,to}:{label:string;value:number;icon:any;tone:'blue'|'green'|'amber'|'violet';hint:string;progress?:number;to?:string}) {
  const tones = { blue:'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300', green:'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300', amber:'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300', violet:'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300' };
  const content = <><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-subtle">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-heading">{value}</p></div><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="h-6 w-6" /></div></div><div className="mt-3 flex items-center justify-between gap-2 text-xs text-faint"><span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" />{hint}</span>{to && <ArrowRight className="h-4 w-4 text-primary-600" />}</div>{typeof progress === 'number' && <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-emerald-500" style={{width:`${progress}%`}} /></div>}</>;
  const className = `block rounded-2xl border border-line bg-surface p-5 shadow-panel transition ${to ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:hover:border-primary-700' : ''}`;
  return to ? <Link to={to} className={className} aria-label={`Open ${label}`}>{content}</Link> : <div className={className}>{content}</div>;
}
function Panel({title,subtitle,link,children}:{title:string;subtitle?:string;link?:string;children:React.ReactNode}) { return <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel"><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-heading">{title}</h3>{subtitle && <p className="mt-0.5 text-xs text-faint">{subtitle}</p>}</div>{link && <Link to={link} className="text-xs font-semibold text-primary-600">View all</Link>}</div>{children}</div>; }
function Legend({color,label,value}:{color:string;label:string;value:number}) { return <div className="flex items-center justify-between gap-6"><span className="flex items-center gap-2 text-sm text-subtle"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span><span className="text-sm font-bold text-heading">{value}</span></div>; }
function TaskStatus({status}:{status:string}) { const map:Record<string,{label:string,cls:string}>={to_do:{label:'To Do',cls:'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'},in_progress:{label:'In Progress',cls:'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'},on_hold:{label:'On Hold',cls:'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'},pending_approval:{label:'Pending',cls:'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'},completed:{label:'Completed',cls:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'}}; const s=map[status]??{label:status,cls:'bg-muted text-subtle'}; return <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>; }

function EmployeeDashboard({ data, upcomingHolidays, firstName }: { data: EmployeeDashboardData; upcomingHolidays: Awaited<ReturnType<typeof getUpcomingHolidays>>; firstName: string }) {
  return <div className="space-y-6"><div><p className="text-sm font-medium text-primary-600">My workspace</p><h2 className="mt-1 text-3xl font-extrabold text-heading">{greeting()}, {firstName}!</h2><p className="mt-1 text-sm text-subtle">Here’s your work overview for today.</p></div><div className="grid gap-4 sm:grid-cols-2"><KpiCard label="My Tasks" value={data?.myTaskCount ?? 0} icon={ListChecks} tone="blue" hint="Assigned to you" to="/tasks"/><KpiCard label="Pending Leave Requests" value={data?.myPendingLeaveRequests ?? 0} icon={CalendarDays} tone="amber" hint="Awaiting decision" to="/leaves"/></div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Quick actions"><div className="grid gap-2">{[['/attendance','Attendance',Clock3],['/leaves','Request leave',CalendarDays],['/tasks','My tasks',ListChecks]].map(([to,label,Icon]:any)=><Link key={to} to={to} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold text-body hover:bg-muted"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary-600"/>{label}</span><ArrowRight className="h-4 w-4 text-faint"/></Link>)}</div></Panel><Panel title="Upcoming holidays"><div className="divide-y divide-line">{upcomingHolidays.map(h=><div key={h._id} className="flex items-center justify-between py-3 text-sm"><span className="font-medium text-heading">{h.name}</span><span className="text-faint">{formatDate(h.date)}</span></div>)}</div></Panel></div></div>;
}
