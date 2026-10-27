import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorText } from '@/components/atoms/ErrorText';
import { checkIn, checkOut, startBreak, endBreak, myToday, myHistory, teamHistory, teamEmployees } from '@/features/attendance/attendanceService';
import { totalWorkedSeconds, sessionWorkedSeconds, formatDuration, isOnBreak } from '@/features/attendance/attendanceMath';
import { useAppSelector } from '@/store/hooks';
import { AttendanceSession } from '@/types/entities';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function employeeName(session: AttendanceSession) {
  if (typeof session.employee === 'string') return session.employee;
  return `${session.employee.firstName} ${session.employee.lastName ?? ''}`.trim();
}
function employeeId(session: AttendanceSession) {
  return typeof session.employee === 'string' ? session.employee : session.employee._id;
}
function timeLabel(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function mutationErrorMessage(error: unknown) {
  const e = error as { response?: { data?: { message?: string } }; message?: string } | null;
  return e?.response?.data?.message || e?.message || 'Something went wrong. Please try again.';
}

interface DailyAttendanceSummary {
  key: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  sessions: AttendanceSession[];
  firstCheckIn: string;
  lastCheckOut?: string | null;
  isWorking: boolean;
  breakCount: number;
  workedSeconds: number;
  checkInCount: number;
  checkOutCount: number;
}

export function AttendancePage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const currentUser = useAppSelector((s) => s.auth.employee);
  const permissions = currentUser?.permissionKeys ?? [];
  const hasEmployeeScope = permissions.some((key) => ['employees:view', 'employees:view_assigned', 'employees:view_all'].includes(key));
  const canViewTeam = Boolean(currentUser?.isAdmin || (permissions.includes('attendance:view') && hasEmployeeScope));
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState<'mine' | 'team'>(() => requestedTab === 'team' && canViewTeam ? 'team' : 'mine');
  const [from, setFrom] = useState(searchParams.get('from') ?? daysAgoStr(6));
  const [to, setTo] = useState(searchParams.get('to') ?? todayStr());
  const [teamEmployee, setTeamEmployee] = useState('');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const { data: todaySessions = [], isLoading } = useQuery({ queryKey: ['attendance-today'], queryFn: myToday });
  const { data: historySessions = [], isLoading: historyLoading } = useQuery({ queryKey: ['attendance-history', from, to], queryFn: () => myHistory(from, to) });

  const { data: employeeOptions = [] } = useQuery({
    queryKey: ['attendance-employee-options'],
    queryFn: teamEmployees,
    enabled: canViewTeam,
    staleTime: 60_000,
  });

  const { data: teamSessions = [], isLoading: teamLoading } = useQuery({
    queryKey: ['attendance-team-history', from, to, teamEmployee],
    queryFn: () => teamHistory(from, to, teamEmployee || undefined),
    enabled: canViewTeam && tab === 'team',
  });

  const openSession = todaySessions.find((s) => !s.checkOutTime);
  const onBreak = openSession ? isOnBreak(openSession) : false;
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!openSession || onBreak) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [openSession, onBreak]);

  const todayTotalSeconds = useMemo(() => totalWorkedSeconds(todaySessions), [todaySessions, openSession, onBreak]);

  function invalidateToday() {
    queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-team-history'] });
    queryClient.invalidateQueries({ queryKey: ['current-timer'] });
    queryClient.invalidateQueries({ queryKey: ['task-total-time'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['work-time'] });
  }

  const checkInMutation = useMutation({ mutationFn: checkIn, onSuccess: invalidateToday });
  const checkOutMutation = useMutation({ mutationFn: checkOut, onSuccess: invalidateToday });
  const startBreakMutation = useMutation({ mutationFn: startBreak, onSuccess: invalidateToday });
  const endBreakMutation = useMutation({ mutationFn: endBreak, onSuccess: invalidateToday });
  const mutationError = checkInMutation.error || checkOutMutation.error || startBreakMutation.error || endBreakMutation.error;

  const historyByDay = useMemo(() => {
    const groups = new Map<string, typeof historySessions>();
    for (const s of historySessions) {
      const list = groups.get(s.workDate) ?? [];
      list.push(s);
      groups.set(s.workDate, list);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [historySessions]);

  const teamDailyRows = useMemo<DailyAttendanceSummary[]>(() => {
    const groups = new Map<string, AttendanceSession[]>();
    for (const session of teamSessions) {
      const key = `${employeeId(session)}:${session.workDate}`;
      const list = groups.get(key) ?? [];
      list.push(session);
      groups.set(key, list);
    }

    return Array.from(groups.entries())
      .map(([key, sessions]) => {
        const sorted = [...sessions].sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
        const closed = sorted.filter((s) => Boolean(s.checkOutTime));
        const isWorking = sorted.some((s) => !s.checkOutTime);
        const lastClosed = closed.length ? closed.reduce((latest, s) => {
          if (!latest.checkOutTime) return s;
          return new Date(s.checkOutTime!).getTime() > new Date(latest.checkOutTime).getTime() ? s : latest;
        }) : undefined;
        return {
          key,
          employeeId: employeeId(sorted[0]),
          employeeName: employeeName(sorted[0]),
          workDate: sorted[0].workDate,
          sessions: sorted,
          firstCheckIn: sorted[0].checkInTime,
          lastCheckOut: lastClosed?.checkOutTime,
          isWorking,
          breakCount: sorted.reduce((count, s) => count + s.breaks.length, 0),
          workedSeconds: totalWorkedSeconds(sorted),
          checkInCount: sorted.length,
          checkOutCount: closed.length,
        };
      })
      .sort((a, b) => {
        if (a.workDate !== b.workDate) return a.workDate < b.workDate ? 1 : -1;
        return a.employeeName.localeCompare(b.employeeName);
      });
  }, [teamSessions]);

  return (
    <div className="space-y-6">
      {canViewTeam && (
        <div className="inline-flex rounded-md bg-muted p-1">
          <button className={`rounded px-3 py-1.5 text-sm font-medium ${tab === 'mine' ? 'bg-surface text-heading shadow-sm' : 'text-subtle'}`} onClick={() => setTab('mine')}>My Attendance</button>
          <button className={`rounded px-3 py-1.5 text-sm font-medium ${tab === 'team' ? 'bg-surface text-heading shadow-sm' : 'text-subtle'}`} onClick={() => setTab('team')}>{currentUser?.isAdmin ? 'All Employees' : 'Assigned Employees'}</button>
        </div>
      )}

      {tab === 'mine' ? (
        <>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-subtle">Today's status</p>
                <div className="mt-1 flex items-center gap-2">
                  {isLoading ? <Spinner className="h-5 w-5" /> : openSession ? <Badge tone={onBreak ? 'warning' : 'success'}>{onBreak ? 'On Break' : 'Checked In'}</Badge> : <Badge tone="neutral">Checked Out</Badge>}
                  <span className="text-2xl font-semibold tabular-nums text-heading">{formatDuration(todayTotalSeconds)}</span>
                  <span className="text-sm text-faint">worked today</span>
                </div>
              </div>
              <div className="flex gap-2">
                {!openSession && <Button onClick={() => checkInMutation.mutate()} isLoading={checkInMutation.isPending}>Check In</Button>}
                {openSession && !onBreak && <><Button variant="secondary" onClick={() => startBreakMutation.mutate()} isLoading={startBreakMutation.isPending}>Start Break</Button><Button variant="danger" onClick={() => checkOutMutation.mutate()} isLoading={checkOutMutation.isPending}>Check Out</Button></>}
                {openSession && onBreak && <Button onClick={() => endBreakMutation.mutate()} isLoading={endBreakMutation.isPending}>End Break</Button>}
              </div>
            </div>
            {mutationError && <ErrorText>{mutationErrorMessage(mutationError)}</ErrorText>}
            {openSession && onBreak && <p className="mt-2 text-xs text-faint">End the break before checking out. Any running task was paused when the break started.</p>}
          </div>

          <div className="space-y-3">
            <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} title="History" />
            {historyLoading ? <Spinner className="mx-auto" /> : historyByDay.length === 0 ? <Empty label="No attendance records in this range." /> : (
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
                {historyByDay.map(([date, sessions]) => <div key={date} className="flex items-center justify-between px-4 py-3 text-sm"><span className="font-medium text-body">{new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><div className="flex items-center gap-3 text-subtle"><span>{sessions.length} session{sessions.length === 1 ? '' : 's'}</span><span className="font-medium text-heading">{formatDuration(totalWorkedSeconds(sessions))}</span></div></div>)}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-panel">
            <div><label className="mb-1 block text-xs font-medium text-faint">Employee</label><Select className="w-56" value={teamEmployee} onChange={(e) => setTeamEmployee(e.target.value)}><option value="">{currentUser?.isAdmin ? 'All employees' : 'All assigned employees'}</option>{employeeOptions.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName ?? ''}</option>)}</Select></div>
            <div><label className="mb-1 block text-xs font-medium text-faint">From</label><FormField id="team-from" label="" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="mb-1 block text-xs font-medium text-faint">To</label><FormField id="team-to" label="" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {['Employee', 'Date', 'First check in', 'Last check out', 'Breaks', 'Working time', 'Sessions'].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-medium text-subtle">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {teamLoading ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center"><Spinner className="mx-auto" /></td></tr>
                  ) : teamDailyRows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-faint">No attendance records in this range</td></tr>
                  ) : teamDailyRows.map((row) => {
                    const expanded = expandedDay === row.key;
                    return (
                      <FragmentRow key={row.key}>
                        <tr
                          className="cursor-pointer transition-colors hover:bg-surface-hover"
                          onClick={() => setExpandedDay(expanded ? null : row.key)}
                          aria-expanded={expanded}
                        >
                          <td className="px-4 py-3 font-medium text-heading">{row.employeeName}</td>
                          <td className="px-4 py-3 text-body">{new Date(`${row.workDate}T00:00:00`).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-body">{timeLabel(row.firstCheckIn)}</td>
                          <td className="px-4 py-3 text-body">{row.isWorking ? <Badge tone="success">Working</Badge> : timeLabel(row.lastCheckOut)}</td>
                          <td className="px-4 py-3 text-body">{row.breakCount}</td>
                          <td className="px-4 py-3 font-medium tabular-nums text-heading">{formatDuration(row.workedSeconds)}</td>
                          <td className="px-4 py-3 text-body"><span className="font-medium">{row.checkInCount}</span> in / <span className="font-medium">{row.checkOutCount}</span> out <span className="ml-2 text-xs text-faint">{expanded ? 'Hide details' : 'View details'}</span></td>
                        </tr>
                        {expanded && (
                          <tr className="bg-muted/40">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="rounded-xl border border-line bg-surface">
                                <div className="border-b border-line px-4 py-3">
                                  <p className="font-medium text-heading">{row.employeeName} · {new Date(`${row.workDate}T00:00:00`).toLocaleDateString()}</p>
                                  <p className="text-xs text-faint">All check-in/check-out sessions recorded for this day</p>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[680px] text-sm">
                                    <thead><tr className="border-b border-line text-xs text-subtle"><th className="px-4 py-2 text-left">Session</th><th className="px-4 py-2 text-left">Check in</th><th className="px-4 py-2 text-left">Check out</th><th className="px-4 py-2 text-left">Breaks</th><th className="px-4 py-2 text-left">Worked</th></tr></thead>
                                    <tbody className="divide-y divide-line">
                                      {row.sessions.map((session, index) => (
                                        <tr key={session._id}>
                                          <td className="px-4 py-2 text-body">#{index + 1}</td>
                                          <td className="px-4 py-2 text-body">{timeLabel(session.checkInTime)}</td>
                                          <td className="px-4 py-2 text-body">{session.checkOutTime ? timeLabel(session.checkOutTime) : <Badge tone="success">Working</Badge>}</td>
                                          <td className="px-4 py-2 text-body">
                                            <div>{session.breaks.length} break{session.breaks.length === 1 ? '' : 's'}</div>
                                            {session.breaks.length > 0 && (
                                              <div className="mt-1 space-y-0.5 text-xs text-faint">
                                                {session.breaks.map((entry, breakIndex) => (
                                                  <div key={`${session._id}-break-${breakIndex}`}>
                                                    {timeLabel(entry.breakStart)} – {entry.breakEnd ? timeLabel(entry.breakEnd) : 'Ongoing'}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 font-medium tabular-nums text-heading">{formatDuration(sessionWorkedSeconds(session))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-faint">Each row summarizes one employee's attendance for one day. Click a row to view every session from that day.</p>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function DateFilters({ from, to, onFrom, onTo, title }: { from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void; title: string }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-medium text-body">{title}</p><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><FormField id="from" label="" type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="w-full sm:w-40" /><span className="hidden shrink-0 text-faint sm:inline">to</span><FormField id="to" label="" type="date" value={to} onChange={(e) => onTo(e.target.value)} className="w-full sm:w-40" /></div></div>;
}
function Empty({ label }: { label: string }) { return <p className="rounded-lg border border-dashed border-line bg-surface p-6 text-center text-sm text-faint">{label}</p>; }
