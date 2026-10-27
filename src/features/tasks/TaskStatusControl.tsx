import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { changeTaskStatus, decideTaskApproval } from './taskService';
import { Task, TaskStatus } from '@/types/entities';

const STATUS_TONE: Record<TaskStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  to_do: 'neutral',
  in_progress: 'info',
  on_hold: 'warning',
  pending_approval: 'warning',
  completed: 'success',
  cancelled: 'danger',
  reopened: 'danger',
};

const SELECTABLE_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'to_do', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Mark Complete' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function TaskStatusControl({ task, canEdit = false, canApprove = false, canReject = false, currentEmployeeId, isAdmin = false }: { task: Task; canEdit?: boolean; canApprove?: boolean; canReject?: boolean; currentEmployeeId?: string; isAdmin?: boolean }) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) => changeTaskStatus(task._id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const approvalMutation = useMutation({
    mutationFn: (decision: 'approve' | 'reopen') => decideTaskApproval(task._id, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const pendingApproverId = typeof task.pendingApprover === 'string' ? task.pendingApprover : task.pendingApprover?._id;
  const submittedById = typeof task.submittedBy === 'string' ? task.submittedBy : task.submittedBy?._id;
  const workedOnTask = Boolean(currentEmployeeId && task.assignees.some((a) => (typeof a === 'string' ? a : a._id) === currentEmployeeId));
  const isSelfApproval = Boolean(currentEmployeeId && (workedOnTask || submittedById === currentEmployeeId));
  const isCurrentApprover = !isSelfApproval && (isAdmin || Boolean(currentEmployeeId && pendingApproverId === currentEmployeeId));

  // Pending Approval is a system-driven state - only the approver decides what happens next
  // (spec section 8), so no free-form status dropdown here.
  if (task.status === 'pending_approval') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warning">Pending Approval</Badge>
        {isCurrentApprover && canApprove && (
          <Button variant="secondary" size="sm" onClick={() => approvalMutation.mutate('approve')} isLoading={approvalMutation.isPending}>
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
        )}
        {isCurrentApprover && canReject && (
          <Button variant="ghost" size="sm" onClick={() => approvalMutation.mutate('reopen')} isLoading={approvalMutation.isPending}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reopen
          </Button>
        )}
      </div>
    );
  }

  if (!canEdit) return <Badge tone={STATUS_TONE[task.status]}>{task.status.replace('_', ' ')}</Badge>;

  return (
    <div className="flex items-center gap-2">
      <Badge tone={STATUS_TONE[task.status]}>{task.status.replace('_', ' ')}</Badge>
      <Select
        value=""
        onChange={(e) => e.target.value && statusMutation.mutate(e.target.value as TaskStatus)}
        className="w-36 text-xs"
      >
        <option value="">Change status…</option>
        {SELECTABLE_STATUSES.filter((s) => s.value !== task.status).map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
