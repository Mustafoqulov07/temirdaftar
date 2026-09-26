import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

/** Light/Dark/System temalarni aylantiruvchi tugma */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();

  const nextTheme: Record<string, 'dark' | 'system' | 'light'> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  };

  const Icon = theme === 'dark' ? MoonIcon : theme === 'light' ? SunIcon : ComputerDesktopIcon;
  const label =
    theme === 'dark' ? 'Tungi rejim' : theme === 'light' ? 'Kunduzgi rejim' : 'Tizim rejimi';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme[theme])}
      className={`p-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
      title={label}
      aria-label={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

export default ThemeToggle;
