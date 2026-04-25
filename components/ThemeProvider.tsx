'use client';
import { useEffect } from 'react';

export default function ThemeProvider() {
  useEffect(() => {
    const saved = localStorage.getItem('mk_theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved ?? (systemDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);
  return null;
}
