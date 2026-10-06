import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

/** Faqat Light/Dark rejimlarni almashtiruvchi tugma */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  const Icon = resolvedTheme === 'dark' ? MoonIcon : SunIcon;
  const label = resolvedTheme === 'dark' ? 'Qorongʻu rejim' : 'Yorugʻ rejim';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
      title={label}
      aria-label={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

export default ThemeToggle;
