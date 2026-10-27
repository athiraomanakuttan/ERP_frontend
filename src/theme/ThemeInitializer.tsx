import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setBranding } from './themeSlice';
import { generateShadeRamp } from './color';
import { getSettings } from '@/features/settings/settingsService';

function applyPrimaryColor(hex: string) {
  const ramp = generateShadeRamp(hex);
  const root = document.documentElement;
  for (const [shade, rgb] of Object.entries(ramp)) root.style.setProperty(`--color-primary-${shade}`, rgb);
}

export function ThemeInitializer() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.theme.mode);
  const primaryColor = useAppSelector((s) => s.theme.primaryColor);

  useEffect(() => { applyPrimaryColor(primaryColor); }, [primaryColor]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyMode = () => {
      const shouldBeDark = mode === 'dark' || (mode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    };
    applyMode();
    media.addEventListener('change', applyMode);
    return () => media.removeEventListener('change', applyMode);
  }, [mode]);

  const { data } = useQuery({ queryKey: ['app-settings'], queryFn: getSettings, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (!data) return;
    applyPrimaryColor(data.themeColor);
    dispatch(setBranding({ primaryColor: data.themeColor, companyName: data.companyName, logoDataUrl: data.logoDataUrl }));
  }, [data, dispatch]);

  return null;
}
