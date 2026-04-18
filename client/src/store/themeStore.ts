/**
 * Theme store — manages dark/light mode via Zustand.
 * Persists preference to localStorage.
 * Applies CSS custom properties on <html> for global theming.
 */

import { create } from 'zustand';
import { THEMES, type ThemeMode } from '../config';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

function applyTheme(mode: ThemeMode) {
  const t = THEMES[mode];
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.setProperty('--color-bg', t.bg);
  root.style.setProperty('--color-bg-card', t.bgCard);
  root.style.setProperty('--color-bg-elevated', t.bgElevated);
  root.style.setProperty('--color-bg-hover', t.bgHover);
  root.style.setProperty('--color-border', t.border);
  root.style.setProperty('--color-border-light', t.borderLight);
  root.style.setProperty('--color-text', t.text);
  root.style.setProperty('--color-text-muted', t.textMuted);
  root.style.setProperty('--color-text-dim', t.textDim);
  root.style.setProperty('--shadow-card', t.cardShadow);
  root.style.setProperty('--shadow-elevated', t.elevatedShadow);
}

const savedTheme = (localStorage.getItem('mp_theme') as ThemeMode) || 'dark';
applyTheme(savedTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: savedTheme,

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('mp_theme', next);
      applyTheme(next);
      return { theme: next };
    }),

  setTheme: (theme) => {
    localStorage.setItem('mp_theme', theme);
    applyTheme(theme);
    set({ theme });
  },
}));
