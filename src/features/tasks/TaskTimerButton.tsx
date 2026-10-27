import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { getTotalTime, startTimer, pauseTimer } from './taskService';
import { CurrentTimer, TaskStatus } from '@/types/entities';

function formatSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
  return error instanceof Error ? error.message : 'Unable to update timer';
}

export function TaskTimerButton({
  taskId,
  employeeId,
  currentTimer,
  status,
}: {
  taskId: string;
  employeeId: string;
  currentTimer: CurrentTimer | null | undefined;
  status: TaskStatus;
}) {
  const queryClient = useQueryClient();
  const isRunningHere = currentTimer?.taskId === taskId;
  const isRunningElsewhere = Boolean(currentTimer) && !isRunningHere;
  const [errorMessage, setErrorMessage] = useState('');
  const [, forceTick] = useState(0);

  const { data: totalData } = useQuery({
    queryKey: ['task-total-time', taskId, employeeId],
    queryFn: () => getTotalTime(taskId, employeeId),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!isRunningHere) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunningHere]);

  const refreshTimerData = () => {
    queryClient.invalidateQueries({ queryKey: ['current-timer'] });
    queryClient.invalidateQueries({ queryKey: ['task-total-time', taskId, employeeId] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['work-time'] });
  };

  const startMutation = useMutation({
    mutationFn: () => startTimer(taskId),
    onMutate: () => setErrorMessage(''),
    onSuccess: refreshTimerData,
    onError: (error) => setErrorMessage(apiErrorMessage(error)),
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseTimer(taskId),
    onMutate: () => setErrorMessage(''),
    onSuccess: refreshTimerData,
    onError: (error) => setErrorMessage(apiErrorMessage(error)),
  });

  const completedSeconds = isRunningHere
    ? (currentTimer?.completedSeconds ?? totalData?.totalSeconds ?? 0)
    : (totalData?.totalSeconds ?? 0);
  const liveSeconds = isRunningHere && currentTimer
    ? Math.max(0, Math.floor((Date.now() - new Date(currentTimer.startTime).getTime()) / 1000))
    : 0;
  const displayedTotal = completedSeconds + liveSeconds;
  const timerClosed = ['pending_approval', 'completed', 'cancelled'].includes(status);

  if (!isRunningHere && timerClosed) {
    return <span className="text-xs tabular-nums text-faint">{completedSeconds > 0 ? formatSeconds(completedSeconds) : 'Closed'}</span>;
  }

  return (
    <div className="flex min-w-[118px] flex-col items-start gap-1">
      {isRunningHere ? (
        <Button
          variant="secondary"
          size="sm"
          className="tabular-nums"
          onClick={() => pauseMutation.mutate()}
          isLoading={pauseMutation.isPending}
          title="Total task time including previous sessions"
        >
          <Pause className="h-3.5 w-3.5 fill-current" /> {formatSeconds(displayedTotal)}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startMutation.mutate()}
            isLoading={startMutation.isPending}
            disabled={isRunningElsewhere}
            title={isRunningElsewhere ? 'Pause your current task first' : 'Start working on this task'}
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Start
          </Button>
          {completedSeconds > 0 && <span className="text-[11px] tabular-nums text-faint">{formatSeconds(completedSeconds)}</span>}
        </div>
      )}
      {errorMessage && <span className="max-w-[180px] text-[10px] leading-tight text-red-600">{errorMessage}</span>}
    </div>
  );
}
