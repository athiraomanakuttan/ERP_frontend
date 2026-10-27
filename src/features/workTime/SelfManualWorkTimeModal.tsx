import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { createSelfManualWorkSession, listMyWorkSessions } from './workTimeService';
import { Task } from '@/types/entities';
import axios from 'axios';
import { scrollToFirstError } from '@/utils/validation';

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
  return error instanceof Error ? error.message : 'Unable to add manual work time';
}

function formatSessionDuration(seconds?: number | null) {
  const value = Math.max(0, seconds ?? 0);
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function endReasonLabel(reason?: string) {
  const labels: Record<string, string> = {
    manual_pause: 'Paused',
    checkout: 'Checkout',
    break_start: 'Break',
    task_completed: 'Task completed',
    manual_entry: 'Manual entry',
    logout: 'Logout (legacy)',
  };
  return reason ? labels[reason] ?? reason : 'Running';
}

export function SelfManualWorkTimeModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['my-work-sessions', task?._id],
    queryFn: () => listMyWorkSessions({ task: task!._id, page: 1, limit: 8 }),
    enabled: Boolean(task),
  });

  const mutation = useMutation({
    mutationFn: () => createSelfManualWorkSession({
      taskId: task!._id,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      reason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-total-time'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['work-time'] });
      queryClient.invalidateQueries({ queryKey: ['my-work-sessions', task?._id] });
      setStartTime(''); setEndTime(''); setReason(''); setLocalError('');
      onClose();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setLocalError('');
    if (!startTime || !endTime) { setLocalError('Start and end time are required.'); scrollToFirstError(); return; }
    if (new Date(endTime) <= new Date(startTime)) { setLocalError('End time must be after start time.'); scrollToFirstError(); return; }
    if (new Date(endTime) > new Date()) { setLocalError('End time cannot be in the future.'); scrollToFirstError(); return; }
    if (reason.trim().length < 5) { setLocalError('Please provide a reason with at least 5 characters.'); scrollToFirstError(); return; }
    mutation.mutate();
  }

  return (
    <Modal isOpen={Boolean(task)} onClose={onClose} title={`Add Manual Time${task ? ` — ${task.title}` : ''}`}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-faint">Use this when you worked on the task but forgot to start the timer. The entry is recorded as manual and remains visible in the work-time audit history.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 block text-sm font-medium text-body">Start time <span className="text-red-500">*</span></label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div><label className="mb-1 block text-sm font-medium text-body">End time <span className="text-red-500">*</span></label><Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <div className="rounded-xl border border-line bg-muted/30 p-3">
          <div className="mb-2">
            <p className="text-sm font-semibold text-heading">Recent timer history for this task</p>
            <p className="text-xs text-faint">Use these recorded start/pause times as a reference before entering a missed period.</p>
          </div>
          {sessionsLoading ? (
            <p className="text-xs text-faint">Loading recent sessions…</p>
          ) : (recentSessions?.items?.length ?? 0) === 0 ? (
            <p className="text-xs text-faint">No previous work sessions recorded for this task.</p>
          ) : (
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {recentSessions!.items.map((session) => (
                <div key={session._id} className="grid gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs sm:grid-cols-[1fr_1fr_auto]">
                  <div><span className="text-faint">Started</span><p className="font-medium text-heading">{new Date(session.startTime).toLocaleString()}</p></div>
                  <div><span className="text-faint">{session.endTime ? 'Paused / ended' : 'Status'}</span><p className="font-medium text-heading">{session.endTime ? new Date(session.endTime).toLocaleString() : 'Still running'}</p></div>
                  <div className="sm:text-right"><span className="text-faint">Duration</span><p className="font-medium text-heading">{session.endTime ? formatSessionDuration(session.durationSeconds) : endReasonLabel(session.endReason)}</p><p className="text-[10px] text-faint">{endReasonLabel(session.endReason)}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div><label className="mb-1 block text-sm font-medium text-body">Reason <span className="text-red-500">*</span></label><textarea className="min-h-24 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body outline-none focus:border-primary-500" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Example: Forgot to start the timer before beginning work" maxLength={500} /></div>
        {(localError || mutation.error) && <p data-field-error="true" className="text-sm text-red-600">{localError || errorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" isLoading={mutation.isPending}>Save Time</Button></div>
      </form>
    </Modal>
  );
}
