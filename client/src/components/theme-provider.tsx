import { createContext, useContext, useEffect, useState } from "react";
import { ThemeConfig, ThemeMode, Theme } from "@/types/theme";
import { themePresets } from "@/lib/theme-presets";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeConfig;
  storageKey?: string;
};

type ThemeProviderState = {
  config: ThemeConfig;
  currentTheme: Theme;
  setMode: (mode: ThemeMode) => void;
  setPreset: (presetId: string) => void;
  setTheme: (config: ThemeConfig) => void;
  presets: typeof themePresets;
};

const defaultThemeConfig: ThemeConfig = {
  mode: "light",
  presetId: "ocean"
};

const initialState: ThemeProviderState = {
  config: defaultThemeConfig,
  currentTheme: themePresets[0].light,
  setMode: () => null,
  setPreset: () => null,
  setTheme: () => null,
  presets: themePresets,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getContrastColor(theme: Theme): string {
  // For dark themes, use light text on buttons
  // For light themes, use dark text on buttons
  const isDarkTheme = theme.id.includes('dark');
  return isDarkTheme ? '#FFFFFF' : '#000000';
}

function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  const contrastColor = getContrastColor(theme);
  const isDarkTheme = theme.id.includes('dark');
  const foregroundColor = isDarkTheme ? '#FFFFFF' : theme.colors.text;
  
  // Apply CSS custom properties
  root.style.setProperty('--background', hexToHsl(theme.colors.background));
  root.style.setProperty('--foreground', hexToHsl(foregroundColor));
  root.style.setProperty('--card', hexToHsl(theme.colors.surface));
  root.style.setProperty('--card-foreground', hexToHsl(foregroundColor));
  root.style.setProperty('--popover', hexToHsl(theme.colors.surface));
  root.style.setProperty('--popover-foreground', hexToHsl(foregroundColor));
  root.style.setProperty('--primary', hexToHsl(theme.colors.primary));
  root.style.setProperty('--primary-foreground', hexToHsl(contrastColor));
  root.style.setProperty('--secondary', hexToHsl(theme.colors.secondary));
  root.style.setProperty('--secondary-foreground', hexToHsl(contrastColor));
  root.style.setProperty('--muted', hexToHsl(theme.colors.surface));
  root.style.setProperty('--muted-foreground', hexToHsl(isDarkTheme ? '#D1D5DB' : theme.colors.textSecondary));
  root.style.setProperty('--accent', hexToHsl(theme.colors.accent));
  root.style.setProperty('--accent-foreground', hexToHsl(contrastColor));
  root.style.setProperty('--destructive', hexToHsl(theme.colors.error));
  root.style.setProperty('--destructive-foreground', hexToHsl(contrastColor));
  root.style.setProperty('--border', hexToHsl(theme.colors.border));
  root.style.setProperty('--input', hexToHsl(theme.colors.border));
  root.style.setProperty('--ring', hexToHsl(theme.colors.primary));
  
  // Sidebar colors
  root.style.setProperty('--sidebar-background', hexToHsl(theme.colors.surface));
  root.style.setProperty('--sidebar-foreground', hexToHsl(foregroundColor));
  root.style.setProperty('--sidebar-primary', hexToHsl(theme.colors.primary));
  root.style.setProperty('--sidebar-primary-foreground', hexToHsl(contrastColor));
  root.style.setProperty('--sidebar-accent', hexToHsl(theme.colors.accent));
  root.style.setProperty('--sidebar-accent-foreground', hexToHsl(foregroundColor));
  root.style.setProperty('--sidebar-border', hexToHsl(theme.colors.border));
  root.style.setProperty('--sidebar-ring', hexToHsl(theme.colors.primary));
}

export function ThemeProvider({
  children,
  defaultTheme = defaultThemeConfig,
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored) as ThemeConfig;
      } catch {
        return defaultTheme;
      }
    }
    return defaultTheme;
  });

  const getCurrentTheme = (config: ThemeConfig): Theme => {
    const preset = themePresets.find(p => p.id === config.presetId) || themePresets[0];
    let mode = config.mode;
    
    if (config.mode === "system") {
      mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    
    return mode === "dark" ? preset.dark : preset.light;
  };

  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getCurrentTheme(config));

  useEffect(() => {
    const newTheme = getCurrentTheme(config);
    setCurrentTheme(newTheme);
    applyThemeToDocument(newTheme);
    localStorage.setItem(storageKey, JSON.stringify(config));
  }, [config, storageKey]);

  const setMode = (mode: ThemeMode) => {
    setConfig(prev => ({ ...prev, mode }));
  };

  const setPreset = (presetId: string) => {
    setConfig(prev => ({ ...prev, presetId }));
  };

  const value = {
    config,
    currentTheme,
    setMode,
    setPreset,
    setTheme: setConfig,
    presets: themePresets,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};