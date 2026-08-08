import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemeMode, GlassIntensity } from '@/types';

export type { ThemeMode, GlassIntensity };
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  glass: boolean;
  glassIntensity: GlassIntensity;
  setMode: (m: ThemeMode) => void;
  setGlassIntensity: (i: GlassIntensity) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);
const STORAGE_KEY = 'vexora-theme';
const INTENSITY_KEY = 'vexora-glass-intensity';

const INTENSITY_VALUES: Record<GlassIntensity, { blur: string; sat: string; glow: string }> = {
  soft: { blur: '12px', sat: '120%', glow: '0 0 12px -6px' },
  medium: { blur: '22px', sat: '160%', glow: '0 0 20px -6px' },
  intense: { blur: '36px', sat: '180%', glow: '0 0 32px -4px' },
};

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  if (mode === 'glass' || mode === 'system') return systemTheme;
  return mode;
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'glass') return stored;
  if (stored === 'custom') return 'system';
  return 'system';
}

function getInitialIntensity(): GlassIntensity {
  if (typeof window === 'undefined') return 'medium';
  const stored = localStorage.getItem(INTENSITY_KEY);
  if (stored === 'soft' || stored === 'medium' || stored === 'intense') return stored;
  return 'medium';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [glassIntensity, setGlassIntensityState] = useState<GlassIntensity>(getInitialIntensity);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const resolved: ResolvedTheme = resolveTheme(mode, systemTheme);
  const glass = mode === 'glass';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.classList.toggle('vex-glass', glass);
    root.style.colorScheme = resolved;
  }, [resolved, glass]);

  useEffect(() => {
    const root = document.documentElement;
    const vals = INTENSITY_VALUES[glassIntensity];
    root.style.setProperty('--vex-glass-blur', vals.blur);
    root.style.setProperty('--vex-glass-sat', vals.sat);
    localStorage.setItem(INTENSITY_KEY, glassIntensity);
  }, [glassIntensity]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const setGlassIntensity = useCallback((i: GlassIntensity) => {
    setGlassIntensityState(i);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    mode, resolved, glass, glassIntensity, setMode, setGlassIntensity, toggle,
  }), [mode, resolved, glass, glassIntensity, setMode, setGlassIntensity, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
