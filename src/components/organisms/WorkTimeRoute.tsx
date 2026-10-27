import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

export function WorkTimeRoute() {
  const employee = useAppSelector((s) => s.auth.employee);
  const [searchParams] = useSearchParams();
  const permissions = employee?.permissionKeys ?? [];
  const canViewAllWorkTime = Boolean(
    employee?.isAdmin ||
      (permissions.includes('projects:view_all') && permissions.includes('tasks:view_all'))
  );
  const hasProjectView = Boolean(
    employee?.isAdmin ||
      permissions.some((key) => ['projects:view', 'projects:view_assigned', 'projects:view_all'].includes(key))
  );
  const hasTaskView = Boolean(
    employee?.isAdmin ||
      permissions.some((key) => ['tasks:view', 'tasks:view_assigned', 'tasks:view_all'].includes(key))
  );
  const hasScopedProject = Boolean(searchParams.get('project'));

  if (!canViewAllWorkTime && !(hasScopedProject && hasProjectView && hasTaskView)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
