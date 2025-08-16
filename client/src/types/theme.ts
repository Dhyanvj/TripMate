export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface Theme {
  name: string;
  id: string;
  colors: ThemeColors;
}

export interface ThemePreset {
  id: string;
  name: string;
  light: Theme;
  dark: Theme;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  presetId: string;
}