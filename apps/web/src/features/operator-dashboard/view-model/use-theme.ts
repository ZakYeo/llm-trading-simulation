import { useEffect, useState } from 'react';
import type { ThemePreference } from '../model/workspace';

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem('simulation-theme');
      return saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function apply() {
      document.documentElement.dataset.theme =
        preference === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : preference;
    }
    apply();
    try {
      localStorage.setItem('simulation-theme', preference);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);
  return { preference, setPreference };
}
