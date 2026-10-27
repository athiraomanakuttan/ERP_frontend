import { useQuery } from '@tanstack/react-query';
import { getCurrentTimer } from './taskService';

/**
 * Single shared query for "what am I working on right now" - used by every row's
 * timer button so we make one request per poll interval, not one per task.
 */
export function useCurrentTimer() {
  return useQuery({
    queryKey: ['current-timer'],
    queryFn: getCurrentTimer,
    refetchInterval: 20_000, // keep it fresh if the person is working in another tab
  });
}
