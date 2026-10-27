import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Menu, Settings, Search, ChevronDown } from 'lucide-react';
import { IconButton } from '@/components/atoms/IconButton';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/features/auth/authSlice';
import { logoutRequest } from '@/features/auth/authService';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

export function Topbar({ title, onOpenMenu }: { title: string; onOpenMenu: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const employee = useAppSelector((s) => s.auth.employee);

  async function handleLogout() {
    try {
      await logoutRequest();
    } finally {
      dispatch(logout());
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-line bg-surface/95 px-4 backdrop-blur-xl sm:px-6 lg:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <IconButton onClick={onOpenMenu} aria-label="Open menu" className="lg:hidden"><Menu className="h-5 w-5" /></IconButton>
        <h1 className="hidden text-base font-bold text-heading xl:block">{title}</h1>
        <div className="relative hidden w-full max-w-md sm:block xl:ml-6">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <button onClick={() => navigate('/employees')} className="h-10 w-full rounded-xl border border-line bg-muted/60 pl-10 pr-4 text-left text-sm text-faint transition hover:border-primary-300 hover:bg-surface">
            Search employees, projects, tasks…
          </button>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        {employee?.isAdmin && <Link to="/settings"><IconButton aria-label="Settings" className="hidden rounded-full sm:inline-flex"><Settings className="h-[18px] w-[18px]" /></IconButton></Link>}
        <div className="mx-1 hidden h-7 w-px bg-line sm:block" />
        <button className="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-muted" onClick={() => navigate('/settings')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">{employee?.firstName?.slice(0, 1) ?? 'U'}</div>
          <div className="hidden min-w-0 md:block"><p className="max-w-[120px] truncate text-sm font-semibold text-heading">{employee?.firstName} {employee?.lastName ?? ''}</p><p className="text-[11px] text-faint">{employee?.isAdmin ? 'Administrator' : 'Employee'}</p></div>
          <ChevronDown className="hidden h-4 w-4 text-faint md:block" />
        </button>
        <IconButton onClick={handleLogout} aria-label="Log out" className="rounded-full"><LogOut className="h-[18px] w-[18px]" /></IconButton>
      </div>
    </header>
  );
}
