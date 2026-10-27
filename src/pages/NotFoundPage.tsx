import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/atoms/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-app px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
        <Compass className="h-7 w-7" />
      </div>
      <p className="text-3xl font-semibold text-heading">404</p>
      <p className="text-sm text-subtle">We couldn't find that page.</p>
      <Link to="/dashboard">
        <Button className="mt-2">Back to dashboard</Button>
      </Link>
    </div>
  );
}
