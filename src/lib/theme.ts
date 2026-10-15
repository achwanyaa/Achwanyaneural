export type ThemePref = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'achwanya.theme';

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * Must match useTheme's resolution logic.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

/** Canvas colors for the chart (canvas can't read CSS variables). Keep in sync with globals.css. */
export const CHART_COLORS: Record<Theme, { text: string; grid: string; border: string; up: string; down: string; upVolume: string; downVolume: string; crosshair: string }> = {
  light: {
    text: '#5b6070',
    grid: '#f0f1f3',
    border: '#e3e5e9',
    up: '#089981',
    down: '#f23645',
    upVolume: 'rgba(8,153,129,0.28)',
    downVolume: 'rgba(242,54,69,0.28)',
    crosshair: '#8d92a0',
  },
  dark: {
    text: '#9a9ca3',
    grid: '#1d1e21',
    border: '#2a2c31',
    up: '#22ab94',
    down: '#f7525f',
    upVolume: 'rgba(34,171,148,0.3)',
    downVolume: 'rgba(247,82,95,0.3)',
    crosshair: '#686b73',
  },
};
