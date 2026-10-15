'use client';

import { useCallback, useEffect, useState } from 'react';
import { THEME_STORAGE_KEY, type Theme, type ThemePref } from '@/lib/theme';

const query = '(prefers-color-scheme: dark)';

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // storage blocked: follow the system
  }
  return 'system';
}

/** Theme preference (system/light/dark), persisted per browser. Client-only. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readPref);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme: Theme = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemePref) => {
    setPref(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // won't persist; fine
    }
  }, []);

  return { pref, theme, setTheme };
}
