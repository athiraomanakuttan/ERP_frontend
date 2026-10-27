import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

export function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink to={to} className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${isActive ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/25' : 'text-subtle hover:bg-muted hover:text-heading'}`}>
      {({ isActive }) => <><Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-faint group-hover:text-heading'}`} /><span className="truncate">{label}</span></>}
    </NavLink>
  );
}
