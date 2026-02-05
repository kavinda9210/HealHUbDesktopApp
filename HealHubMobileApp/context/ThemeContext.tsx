import React, { createContext, useContext, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

type ThemePalette = {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  danger: string;
};

type ThemeContextType = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  colors: ThemePalette;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  const colors = useMemo<ThemePalette>(() => {
    if (mode === 'dark') {
      return {
        background: '#0b1220',
        card: '#0f172a',
        text: '#e5e7eb',
        subtext: '#a3b3c2',
        border: '#223044',
        // Muted accents for dark mode (avoid neon/luminous colors)
        primary: '#2B7A57',
        danger: '#b91c1c',
      };
    }

    return {
      background: '#ffffff',
      card: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      primary: '#2E8B57',
      danger: '#dc2626',
    };
  }, [mode]);

  const value = useMemo<ThemeContextType>(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
      colors,
    }),
    [mode, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
