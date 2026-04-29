export interface AppSettings {
  dailyGoalMinutes: number;
  newCardsPerDay: number;
  theme: 'dark' | 'light';
}

const DEFAULTS: AppSettings = {
  dailyGoalMinutes: 15,
  newCardsPerDay: 15,
  theme: 'dark',
};

const KEY = 'mk_settings';

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(s));
  // Sync theme immediately
  document.documentElement.setAttribute('data-theme', s.theme);
  localStorage.setItem('mk_theme', s.theme);
}
