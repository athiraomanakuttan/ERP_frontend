import { Sun, Moon } from 'lucide-react';
import { IconButton } from '@/components/atoms/IconButton';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleMode } from '@/theme/themeSlice';

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.theme.mode);
  const systemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  return (
    <IconButton onClick={() => dispatch(toggleMode())} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} className="rounded-full border border-line bg-surface shadow-sm">
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </IconButton>
  );
}
