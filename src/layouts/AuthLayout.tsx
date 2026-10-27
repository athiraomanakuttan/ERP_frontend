import { Outlet } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

export function AuthLayout() {
  const companyName = useAppSelector((s) => s.theme.companyName);
  const logoDataUrl = useAppSelector((s) => s.theme.logoDataUrl);

  return (
    <div className="flex min-h-screen bg-app">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary-700 p-12 text-white md:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-primary-950/30 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt={companyName} className="h-9 w-9 rounded-lg bg-white/10 object-contain p-1" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-base font-bold">
              {companyName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-lg font-semibold">{companyName}</span>
        </div>

        <div className="relative max-w-sm">
          <p className="text-2xl font-semibold leading-snug">
            Everything your team needs, organized in one place.
          </p>
          <p className="mt-3 text-sm text-primary-100">
            Attendance, projects, tasks and leave — kept in sync so nobody has to chase updates.
          </p>
        </div>

        <p className="relative text-xs text-primary-200">© {new Date().getFullYear()} {companyName}</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt={companyName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-base font-bold text-white">
                {companyName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-lg font-semibold text-heading">{companyName}</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
