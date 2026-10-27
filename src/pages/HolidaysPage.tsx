import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { IconButton } from '@/components/atoms/IconButton';
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from '@/components/atoms/Select';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { listHolidays, deleteHoliday } from '@/features/holidays/holidayService';
import { HolidayFormModal } from '@/features/holidays/HolidayFormModal';
import { listBranches } from '@/features/branches/branchService';
import { useAppSelector } from '@/store/hooks';
import { Holiday, Branch } from '@/types/entities';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { from: dateKey(start), to: dateKey(end) };
}

export function HolidaysPage() {
  const queryClient = useQueryClient();
  const isAdmin = useAppSelector((s) => s.auth.employee?.isAdmin);
  const [branchFilter, setBranchFilter] = useState('');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [deleting, setDeleting] = useState<Holiday | null>(null);

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: listBranches, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (!branchFilter && branches.length > 0) setBranchFilter(branches[0]._id);
  }, [branches, branchFilter]);

  const selectedBranch = branches.find((b) => b._id === branchFilter);
  const range = useMemo(() => monthRange(month), [month]);
  const listParams = { page: 1, limit: 200, branch: branchFilter || undefined, ...range };
  const { data, isLoading } = useQuery({
    queryKey: ['holidays', listParams],
    queryFn: () => listHolidays(listParams),
    enabled: Boolean(branchFilter),
  });

  const holidays = data?.items ?? [];
  const holidayByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    for (const holiday of holidays) {
      const key = dateKey(new Date(holiday.date));
      map.set(key, [...(map.get(key) ?? []), holiday]);
    }
    return map;
  }, [holidays]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const cells: Array<Date | null> = Array(first.getDay()).fill(null);
    for (let day = 1; day <= last.getDate(); day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  function isWorkingDay(date: Date) {
    if (!selectedBranch) return true;
    const key = DAY_KEYS[date.getDay()];
    return selectedBranch.workingDays.find((d) => d.day === key)?.isWorking ?? false;
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setDeleting(null);
    },
  });

  const columns: Column<Holiday>[] = [
    { header: 'Holiday', render: (h) => <span className="font-medium text-heading">{h.name}</span> },
    { header: 'Date', render: (h) => new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) },
    {
      header: 'Branches',
      render: (h) => <div className="flex flex-wrap gap-1">{h.branches.map((b) => <Badge key={typeof b === 'string' ? b : (b as Branch)._id}>{typeof b === 'string' ? b : (b as Branch).name}</Badge>)}</div>,
    },
    {
      header: '', className: 'text-right', render: (h) => isAdmin ? (
        <div className="flex justify-end gap-1">
          <IconButton onClick={() => { setEditing(h); setModalOpen(true); }} aria-label="Edit holiday"><Pencil className="h-4 w-4" /></IconButton>
          <IconButton onClick={() => setDeleting(h)} aria-label="Delete holiday"><Trash2 className="h-4 w-4" /></IconButton>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Holiday Calendar</h1>
          <p className="mt-1 text-sm text-faint">Non-working days are disabled in gray. Company holidays are marked in red.</p>
        </div>
        {isAdmin && <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" />Add Holiday</Button>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-panel">
        <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="w-56">
          {branches.length === 0 && <option value="">No branches</option>}
          {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </Select>
        <div className="flex items-center gap-2">
          <IconButton aria-label="Previous month" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></IconButton>
          <div className="min-w-40 text-center font-semibold text-heading">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
          <IconButton aria-label="Next month" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></IconButton>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
        <div className="grid grid-cols-7 border-b border-line bg-muted/50">
          {WEEKDAYS.map((day) => <div key={day} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-faint">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            if (!date) return <div key={`blank-${index}`} className="min-h-28 border-b border-r border-line bg-muted/20" />;
            const key = dateKey(date);
            const dayHolidays = holidayByDate.get(key) ?? [];
            const working = isWorkingDay(date);
            const today = key === dateKey(new Date());
            return (
              <div key={key} className={`min-h-28 border-b border-r border-line p-2 ${!working ? 'bg-slate-100 text-slate-400 dark:bg-slate-900/50 dark:text-slate-500' : 'bg-surface'}`}>
                <div className="flex items-center justify-between">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${today ? 'bg-primary-600 text-white' : ''}`}>{date.getDate()}</span>
                  {!working && <span className="text-[10px] uppercase">Off</span>}
                </div>
                <div className="mt-2 space-y-1">
                  {dayHolidays.map((holiday) => (
                    <button key={holiday._id} type="button" disabled={!isAdmin} onClick={() => { if (isAdmin) { setEditing(holiday); setModalOpen(true); } }} className="block w-full rounded-md bg-red-50 px-2 py-1 text-left text-[11px] font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
                      {holiday.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-faint"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-800" />Non-working day</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-red-100 dark:bg-red-950/50" />Holiday</span></div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-heading">Holidays in {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
          <DataTable columns={columns} rows={holidays} isLoading={isLoading} rowKey={(h) => h._id} emptyLabel="No holidays in this month" />
        </div>
      </div>

      <HolidayFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} holiday={editing} />
      <ConfirmDialog isOpen={Boolean(deleting)} title="Delete holiday" message={`Delete "${deleting?.name}"?`} confirmLabel="Delete" isLoading={deleteMutation.isPending} onConfirm={() => deleting && deleteMutation.mutate(deleting._id)} onCancel={() => setDeleting(null)} />
    </div>
  );
}
