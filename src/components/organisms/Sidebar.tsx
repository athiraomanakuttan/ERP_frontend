import {
  LayoutDashboard, Users, Building2, FolderKanban, ListChecks, Clock, CalendarDays,
  CalendarOff, Megaphone, BarChart3, ShieldCheck, Building, Settings as SettingsIcon,
  X, ChevronsLeft, TimerReset, ChevronDown, ChevronRight, UserRound, FileText, CreditCard, Plus, List,
} from 'lucide-react';
import { NavItem } from '@/components/molecules/NavItem';
import { useAppSelector } from '@/store/hooks';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users, permissions: ['employees:view', 'employees:view_assigned', 'employees:view_all'] },
  { to: '/branches', label: 'Branches', icon: Building, adminOnly: true },
  { to: '/client-companies', label: 'Client Companies', icon: Building2, permission: 'client-companies:view' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, permissions: ['projects:view', 'projects:view_assigned', 'projects:view_all'] },
  { to: '/tasks', label: 'Tasks', icon: ListChecks, permissions: ['tasks:view', 'tasks:view_assigned', 'tasks:view_all'] },
  { to: '/attendance', label: 'Attendance', icon: Clock },
  { to: '/leaves', label: 'Leave Management', icon: CalendarDays },
  { to: '/holidays', label: 'Holidays', icon: CalendarOff },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports:view' },
  { to: '/work-time', label: 'Work Time', icon: TimerReset, allPermissions: ['projects:view_all', 'tasks:view_all'] },
];

const ADMIN_ITEMS = [
  { to: '/roles', label: 'Roles & Permissions', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

interface SidebarProps { mobileOpen: boolean; onClose: () => void; }

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const employee = useAppSelector((s) => s.auth.employee);
  const companyName = useAppSelector((s) => s.theme.companyName);
  const logoDataUrl = useAppSelector((s) => s.theme.logoDataUrl);
  const permissions = employee?.permissionKeys ?? [];
  const location = useLocation();
  const [customersOpen, setCustomersOpen] = useState(location.pathname.startsWith('/customers'));
  const canSee = (item: (typeof NAV_ITEMS)[number]) => {
    if (employee?.isAdmin) return true;
    if (item.adminOnly) return false;
    if ('allPermissions' in item && item.allPermissions) return item.allPermissions.every((permission) => permissions.includes(permission));
    if ('permissions' in item && item.permissions) return item.permissions.some((permission) => permissions.includes(permission));
    return !('permission' in item) || !item.permission || permissions.includes(item.permission);
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 -translate-x-full flex-col border-r border-line bg-surface shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : ''}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-line px-5">
          <div className="flex min-w-0 items-center gap-3">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt={companyName} className="h-10 w-10 rounded-xl object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white shadow-sm shadow-primary-600/25">{companyName.slice(0, 1).toUpperCase()}</div>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight text-heading">{companyName}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-faint">Employee Management</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-faint hover:bg-muted hover:text-heading" aria-label="Close menu">
            <X className="h-5 w-5 lg:hidden" /><ChevronsLeft className="hidden h-4 w-4 lg:block" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {NAV_ITEMS.filter(canSee).map((item) => <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />)}
          </div>
          {employee?.isAdmin && (
            <>
              <div className="mt-5 border-t border-line pt-4">
                <button type="button" onClick={() => setCustomersOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-heading hover:bg-muted">
                  <Building2 className="h-4 w-4 text-primary-600" /><span className="flex-1 text-left">Customers</span>{customersOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                </button>
                {customersOpen && <div className="ml-4 mt-1 space-y-3 border-l border-line pl-3">
                  <div><p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-faint"><UserRound className="h-3.5 w-3.5"/>Customer</p><div className="space-y-1"><NavLink end to="/customers" className={({isActive})=>`block rounded-lg px-3 py-1.5 text-sm ${isActive?'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300':'text-subtle hover:bg-muted hover:text-heading'}`}><List className="mr-2 inline h-3.5 w-3.5"/>Customer List</NavLink><NavLink to="/customers/add" className={({isActive})=>`block rounded-lg px-3 py-1.5 text-sm ${isActive?'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300':'text-subtle hover:bg-muted hover:text-heading'}`}><Plus className="mr-2 inline h-3.5 w-3.5"/>Add Customer</NavLink></div></div>
                  <div><p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-faint"><FileText className="h-3.5 w-3.5"/>Invoices</p><div className="space-y-1"><NavLink to="/customers/invoices" className={({isActive})=>`block rounded-lg px-3 py-1.5 text-sm ${isActive?'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300':'text-subtle hover:bg-muted hover:text-heading'}`}>Invoice List</NavLink><NavLink to="/customers/invoices/create" className={({isActive})=>`block rounded-lg px-3 py-1.5 text-sm ${isActive?'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300':'text-subtle hover:bg-muted hover:text-heading'}`}>Create Invoice</NavLink></div></div>
                  <div><p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-faint"><CreditCard className="h-3.5 w-3.5"/>Payments</p><div className="space-y-1"><NavLink to="/customers/payments/pending" className={({isActive})=>`block rounded-lg px-3 py-1.5 text-sm ${isActive?'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300':'text-subtle hover:bg-muted hover:text-heading'}`}>Pending</NavLink><NavLink to="/customers/payments/completed" className={({isActive})=>`block rounded-lg px-3 py-1.5 text-sm ${isActive?'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300':'text-subtle hover:bg-muted hover:text-heading'}`}>Completed</NavLink></div></div>
                </div>}
              </div>
              <div className="mt-5 border-t border-line pt-4">
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Administration</p>
                <div className="space-y-1">{ADMIN_ITEMS.map((item) => <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />)}</div>
              </div>
            </>
          )}
        </nav>

        <div className="border-t border-line p-3">
          <div className="rounded-2xl bg-muted/70 p-3">
            <p className="truncate text-sm font-semibold text-heading">{employee?.firstName} {employee?.lastName ?? ''}</p>
            <p className="mt-0.5 truncate text-xs text-faint">{employee?.isAdmin ? 'System Administrator' : 'Employee'}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
