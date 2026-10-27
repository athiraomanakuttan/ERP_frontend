import { ReactNode, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, XCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { IconButton } from '@/components/atoms/IconButton';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import {
  myLeaveRequests,
  pendingLeaveRequests,
  reviewedLeaveRequests,
  cancelLeaveRequest,
  listLeaveTypes,
  deleteLeaveType,
  myLeaveBalance,
  employeeLeaveBalance,
} from '@/features/leaves/leaveService';
import { LeaveRequestModal } from '@/features/leaves/LeaveRequestModal';
import { LeaveTypeModal } from '@/features/leaves/LeaveTypeModal';
import { LeaveDecisionModal } from '@/features/leaves/LeaveDecisionModal';
import { useAppSelector } from '@/store/hooks';
import { listEmployees } from '@/features/employees/employeeService';
import { LeaveRequest, LeaveStatus, LeaveType, LeaveBalanceItem } from '@/types/entities';

const STATUS_TONE: Record<LeaveStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

type Tab = 'mine' | 'approvals' | 'reviewed' | 'balances' | 'types';

function dateRange(request: LeaveRequest) {
  const start = new Date(request.startDate).toLocaleDateString();
  const end = new Date(request.endDate).toLocaleDateString();
  return start === end ? start : `${start} – ${end}`;
}

function employeeName(request: LeaveRequest) {
  return typeof request.employee === 'string'
    ? request.employee
    : `${request.employee.firstName} ${request.employee.lastName ?? ''}`.trim();
}

function leaveTypeName(request: LeaveRequest) {
  return typeof request.leaveType === 'string' ? request.leaveType : request.leaveType.name;
}

export function LeavesPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const currentUser = useAppSelector((s) => s.auth.employee);
  const isAdmin = Boolean(currentUser?.isAdmin);
  const permissions = currentUser?.permissionKeys ?? [];
  const canApprove = isAdmin || permissions.includes('leaves:approve');
  const canReject = isAdmin || permissions.includes('leaves:reject');
  const canDecide = canApprove || canReject;
  const canReviewHistory = canDecide || permissions.includes('leaves:view');
  const hasEmployeeScope = isAdmin || permissions.some((key) => ['employees:view', 'employees:view_assigned', 'employees:view_all'].includes(key));
  const canViewBalances = isAdmin || (canReviewHistory && hasEmployeeScope);

  const requestedTab = searchParams.get('tab');
  const initialTab: Tab = requestedTab === 'approvals' && canDecide
    ? 'approvals'
    : requestedTab === 'reviewed' && canReviewHistory
      ? 'reviewed'
      : requestedTab === 'balances' && canViewBalances
        ? 'balances'
        : requestedTab === 'types' && isAdmin
          ? 'types'
          : 'mine';
  const requestedStatus = searchParams.get('status');
  const requestedEmployee = searchParams.get('employee') ?? '';
  const currentYear = new Date().getFullYear();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');
  const [reviewedStatus, setReviewedStatus] = useState<'' | 'approved' | 'rejected'>(requestedStatus === 'approved' || requestedStatus === 'rejected' ? requestedStatus : '');
  const [balanceEmployee, setBalanceEmployee] = useState(requestedEmployee);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [leaveTypeModalOpen, setLeaveTypeModalOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [deletingLeaveType, setDeletingLeaveType] = useState<LeaveType | null>(null);
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<{ request: LeaveRequest; decision: 'approve' | 'reject' } | null>(null);

  const filters = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to]);

  const { data: myRequests = [], isLoading: mineLoading } = useQuery({
    queryKey: ['leave-requests-mine', filters],
    queryFn: () => myLeaveRequests(filters),
  });

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['leave-requests-pending', filters],
    queryFn: () => pendingLeaveRequests(filters),
    enabled: canDecide,
  });

  const { data: reviewed = [], isLoading: reviewedLoading } = useQuery({
    queryKey: ['leave-requests-reviewed', filters, reviewedStatus, requestedEmployee],
    queryFn: () => reviewedLeaveRequests({ ...filters, status: reviewedStatus || undefined, employee: requestedEmployee || undefined }),
    enabled: canReviewHistory,
  });

  const { data: myBalances = [] } = useQuery({
    queryKey: ['leave-balance-me', currentYear],
    queryFn: () => myLeaveBalance(currentYear),
  });

  const { data: balanceEmployeeOptions } = useQuery({
    queryKey: ['leave-balance-employee-options'],
    queryFn: () => listEmployees({ page: 1, limit: 200, status: 'active' }),
    enabled: canViewBalances,
  });

  const { data: selectedBalances = [], isLoading: balanceLoading } = useQuery({
    queryKey: ['leave-balance-employee', balanceEmployee, currentYear],
    queryFn: () => employeeLeaveBalance(balanceEmployee, currentYear),
    enabled: canViewBalances && Boolean(balanceEmployee),
  });

  const { data: leaveTypes = [], isLoading: leaveTypesLoading } = useQuery({
    queryKey: ['leave-types'],
    queryFn: listLeaveTypes,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests-mine'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance-me'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance-employee'] });
      setCancelling(null);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => deleteLeaveType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      setDeletingLeaveType(null);
    },
  });

  const mineColumns: Column<LeaveRequest>[] = [
    { header: 'Leave type', render: leaveTypeName },
    { header: 'Dates', render: dateRange },
    { header: 'Reason', render: (r) => r.reason ?? '—' },
    { header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
    {
      header: '',
      className: 'text-right',
      render: (r) => r.status === 'pending' ? (
        <Button variant="ghost" size="sm" onClick={() => setCancelling(r)}>Cancel</Button>
      ) : null,
    },
  ];

  const approvalColumns: Column<LeaveRequest>[] = [
    { header: 'Employee', render: employeeName },
    { header: 'Leave type', render: leaveTypeName },
    { header: 'Dates', render: dateRange },
    { header: 'Reason', render: (r) => r.reason ?? '—' },
    {
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canReject && <Button variant="secondary" size="sm" onClick={() => setDecisionTarget({ request: r, decision: 'reject' })}>
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>}
          {canApprove && <Button size="sm" onClick={() => setDecisionTarget({ request: r, decision: 'approve' })}>
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>}
        </div>
      ),
    },
  ];

  const reviewedColumns: Column<LeaveRequest>[] = [
    { header: 'Employee', render: employeeName },
    { header: 'Leave type', render: leaveTypeName },
    { header: 'Dates', render: dateRange },
    { header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
    { header: 'Decision note', render: (r) => r.decisionNote ?? '—' },
    { header: 'Decided', render: (r) => r.decidedAt ? new Date(r.decidedAt).toLocaleString() : '—' },
  ];

  const typeColumns: Column<LeaveType>[] = [
    { header: 'Leave type', render: (t) => <span className="font-medium text-heading">{t.name}</span> },
    { header: 'Days / year', render: (t) => t.defaultDaysPerYear },
    { header: 'Description', render: (t) => t.description || '—' },
    {
      header: '',
      className: 'text-right',
      render: (t) => (
        <div className="flex justify-end gap-1">
          <IconButton onClick={() => { setEditingLeaveType(t); setLeaveTypeModalOpen(true); }} aria-label="Edit leave type"><Pencil className="h-4 w-4" /></IconButton>
          <IconButton onClick={() => setDeletingLeaveType(t)} aria-label="Delete leave type"><Trash2 className="h-4 w-4" /></IconButton>
        </div>
      ),
    },
  ];

  const showDateFilters = tab !== 'types' && tab !== 'balances';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
          <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>My Requests</TabButton>
          {canDecide && <TabButton active={tab === 'approvals'} onClick={() => setTab('approvals')}>
            Approvals {pending.length > 0 && <Badge tone="warning">{pending.length}</Badge>}
          </TabButton>}
          {canReviewHistory && <TabButton active={tab === 'reviewed'} onClick={() => setTab('reviewed')}>Approved / Rejected</TabButton>}
          {canViewBalances && <TabButton active={tab === 'balances'} onClick={() => setTab('balances')}>Leave Balances</TabButton>}
          {isAdmin && <TabButton active={tab === 'types'} onClick={() => setTab('types')}>Leave Types</TabButton>}
        </div>
        <div className="flex gap-2">
          {isAdmin && tab === 'types' && (
            <Button variant="secondary" onClick={() => { setEditingLeaveType(null); setLeaveTypeModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Leave Type
            </Button>
          )}
          {tab === 'mine' && <Button onClick={() => setRequestModalOpen(true)}><Plus className="h-4 w-4" /> Request Leave</Button>}
        </div>
      </div>

      {showDateFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-panel">
          <div><label className="mb-1 block text-xs font-medium text-faint">Leave start / overlaps from</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="mb-1 block text-xs font-medium text-faint">Leave end / overlaps to</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          {tab === 'reviewed' && <div><label className="mb-1 block text-xs font-medium text-faint">Decision</label><Select value={reviewedStatus} onChange={(e) => setReviewedStatus(e.target.value as '' | 'approved' | 'rejected')}><option value="">Approved & rejected</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Select></div>}
          {(from || to || reviewedStatus) && <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setReviewedStatus(''); }}>Clear filters</Button>}
        </div>
      )}

      {tab === 'mine' && <>
        <BalanceGrid balances={myBalances} />
        <TableCard><DataTable columns={mineColumns} rows={myRequests} isLoading={mineLoading} rowKey={(r) => r._id} emptyLabel="You haven't requested any leave in this range" /></TableCard>
      </>}
      {tab === 'balances' && canViewBalances && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-panel">
            <label className="mb-1 block text-xs font-medium text-subtle">Employee</label>
            <Select className="w-full max-w-sm" value={balanceEmployee} onChange={(e) => setBalanceEmployee(e.target.value)}>
              <option value="">Select employee</option>
              {(balanceEmployeeOptions?.items ?? []).map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName ?? ''}</option>)}
            </Select>
          </div>
          {balanceLoading ? <div className="py-10 text-center text-subtle">Loading balance…</div> : balanceEmployee ? <BalanceGrid balances={selectedBalances} /> : <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-subtle">Choose an employee to view leave balances.</div>}
        </div>
      )}
      {tab === 'approvals' && canDecide && <TableCard><DataTable columns={approvalColumns} rows={pending} isLoading={pendingLoading} rowKey={(r) => r._id} emptyLabel="No leave requests waiting on you" /></TableCard>}
      {tab === 'reviewed' && canReviewHistory && <TableCard><DataTable columns={reviewedColumns} rows={reviewed} isLoading={reviewedLoading} rowKey={(r) => r._id} emptyLabel="No approved or rejected leave requests in this range" /></TableCard>}
      {tab === 'types' && isAdmin && <TableCard><DataTable columns={typeColumns} rows={leaveTypes} isLoading={leaveTypesLoading} rowKey={(t) => t._id} emptyLabel="No leave types created" /></TableCard>}

      <LeaveRequestModal isOpen={requestModalOpen} onClose={() => setRequestModalOpen(false)} />
      <LeaveTypeModal isOpen={leaveTypeModalOpen} onClose={() => { setLeaveTypeModalOpen(false); setEditingLeaveType(null); }} leaveType={editingLeaveType} />
      <LeaveDecisionModal request={decisionTarget?.request ?? null} decision={decisionTarget?.decision ?? null} onClose={() => setDecisionTarget(null)} />

      <ConfirmDialog isOpen={Boolean(cancelling)} title="Cancel leave request" message="Cancel this pending leave request?" confirmLabel="Cancel Request" isLoading={cancelMutation.isPending} onConfirm={() => cancelling && cancelMutation.mutate(cancelling._id)} onCancel={() => setCancelling(null)} />
      <ConfirmDialog isOpen={Boolean(deletingLeaveType)} title="Delete leave type" message={`Delete "${deletingLeaveType?.name}"? Existing leave history will be preserved.`} confirmLabel="Delete" isLoading={deleteTypeMutation.isPending} onConfirm={() => deletingLeaveType && deleteTypeMutation.mutate(deletingLeaveType._id)} onCancel={() => setDeletingLeaveType(null)} />
    </div>
  );
}

function BalanceGrid({ balances }: { balances: LeaveBalanceItem[] }) {
  if (balances.length === 0) return <div className="rounded-2xl border border-dashed border-line bg-surface p-6 text-center text-subtle">No active leave types configured.</div>;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{balances.map((balance) => (
    <div key={balance.leaveTypeId} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="font-semibold text-heading">{balance.leaveTypeName}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-lg font-bold text-heading">{balance.entitlement}</p><p className="text-[11px] text-subtle">Yearly</p></div>
        <div><p className="text-lg font-bold text-heading">{balance.approvedDays}</p><p className="text-[11px] text-subtle">Taken</p></div>
        <div><p className="text-lg font-bold text-primary-600">{balance.balanceDays}</p><p className="text-[11px] text-subtle">Available</p></div>
      </div>
      {balance.pendingDays > 0 && <p className="mt-2 text-xs text-amber-600">{balance.pendingDays} day(s) pending and reserved</p>}
    </div>
  ))}</div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${active ? 'bg-surface text-heading shadow-sm' : 'text-subtle'}`} onClick={onClick}>{children}</button>;
}

function TableCard({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">{children}</div>;
}
