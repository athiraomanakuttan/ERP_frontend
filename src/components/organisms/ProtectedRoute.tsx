import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setEmployee } from '@/features/auth/authSlice';
import { fetchCurrentEmployee } from '@/features/auth/authService';

export function ProtectedRoute() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const employee = useAppSelector((s) => s.auth.employee);

  // Re-validate the session on load: confirms the token still works and refreshes the
  // cached employee (name, admin flag, permissions) in case anything changed since last visit.
  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ['session', accessToken],
    queryFn: fetchCurrentEmployee,
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (data) dispatch(setEmployee(data));
  }, [data, dispatch]);

  // Logged out (manually, or forced by an expired refresh token): drop everything cached
  // so the next person to sign in on this browser can't see the previous user's data.
  useEffect(() => {
    if (!accessToken) queryClient.clear();
  }, [accessToken, queryClient]);

  if (!accessToken) return <Navigate to="/login" replace />;

  // Nothing cached yet (first load after an upgrade, or storage was cleared): wait for /auth/me
  // rather than rendering pages that would treat an admin as a regular user.
  if (!employee) {
    if (isError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-app px-6 text-center">
          <p className="text-sm text-subtle">We couldn't load your session. Check your connection and try again.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      );
    }
    if (isLoading || !data) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-app">
          <Spinner />
        </div>
      );
    }
  }

  return <Outlet />;
}
