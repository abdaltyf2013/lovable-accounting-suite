import React, { createContext, useContext, useState, useEffect } from 'react';

export type ColorTheme = 'emerald' | 'blue' | 'purple' | 'orange' | 'rose';
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  colorTheme: ColorTheme;
  themeMode: ThemeMode;
  setColorTheme: (theme: ColorTheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const colorThemes: Record<ColorTheme, { primary: string; glow: string; name: string }> = {
  emerald: {
    primary: '162 63% 41%',
    glow: '162 80% 50%',
    name: 'زمردي',
  },
  blue: {
    primary: '217 91% 60%',
    glow: '217 100% 65%',
    name: 'أزرق',
  },
  purple: {
    primary: '270 70% 55%',
    glow: '270 85% 65%',
    name: 'بنفسجي',
  },
  orange: {
    primary: '25 95% 53%',
    glow: '25 100% 60%',
    name: 'برتقالي',
  },
  rose: {
    primary: '346 77% 50%',
    glow: '346 90% 60%',
    name: 'وردي',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('emerald');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const savedColorTheme = localStorage.getItem('colorTheme') as ColorTheme | null;
    const savedThemeMode = localStorage.getItem('theme') as ThemeMode | null;
    
    if (savedColorTheme && colorThemes[savedColorTheme]) {
      setColorThemeState(savedColorTheme);
      applyColorTheme(savedColorTheme);
    }
    
    if (savedThemeMode) {
      setThemeModeState(savedThemeMode);
    }
  }, []);

  const applyColorTheme = (theme: ColorTheme) => {
    const root = document.documentElement;
    const themeConfig = colorThemes[theme];
    
    root.style.setProperty('--primary', themeConfig.primary);
    root.style.setProperty('--primary-glow', themeConfig.glow);
    root.style.setProperty('--accent', themeConfig.primary);
    root.style.setProperty('--ring', themeConfig.primary);
    root.style.setProperty('--sidebar-primary', themeConfig.glow);
    root.style.setProperty('--sidebar-ring', themeConfig.glow);
  };

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem('colorTheme', theme);
    applyColorTheme(theme);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('theme', mode);
    
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleThemeMode = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        colorTheme,
        themeMode,
        setColorTheme,
        setThemeMode,
        toggleThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { colorThemes };
