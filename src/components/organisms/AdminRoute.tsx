import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

export function AdminRoute() {
  const isAdmin = useAppSelector((s) => s.auth.employee?.isAdmin);
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
