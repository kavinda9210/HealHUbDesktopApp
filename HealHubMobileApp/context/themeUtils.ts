import { ThemePalette, useTheme } from './ThemeContext';

export type PartialColors = Partial<ThemePalette> & Record<string, string | undefined>;

// Merge a caller-provided colors object with the app theme, filling missing tokens.
export function useResolvedColors(provided?: PartialColors) {
  const { colors: themeColors } = useTheme();
  return { ...themeColors, ...(provided || {}) } as ThemePalette;
}

// Helper when you don't have access to hooks (pure merge)
export function mergeColors(themeColors: ThemePalette, provided?: PartialColors) {
  return { ...themeColors, ...(provided || {}) } as ThemePalette;
}