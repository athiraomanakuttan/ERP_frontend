import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/organisms/Sidebar';
import { Topbar } from '@/components/organisms/Topbar';

const TITLES: Record<string, string> = {
  '/dashboard':'Dashboard','/employees':'Employees','/client-companies':'Client Companies','/projects':'Projects','/tasks':'Tasks','/attendance':'Attendance','/leaves':'Leaves','/holidays':'Holidays','/announcements':'Announcements','/reports':'Reports','/roles':'Roles & Permissions','/branches':'Branches','/settings':'Settings',
};

export function DashboardLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const title = TITLES[location.pathname] ?? 'EMS';
  return (
    <div className="flex min-h-screen bg-app">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onOpenMenu={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-7"><div className="mx-auto w-full max-w-[1600px]"><Outlet /></div></main>
      </div>
    </div>
  );
}
