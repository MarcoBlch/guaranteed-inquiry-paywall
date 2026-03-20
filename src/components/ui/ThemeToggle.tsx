/**
 * ThemeToggle Component
 *
 * 32x18px pill toggle for light/dark mode.
 * Uses next-themes for persistence + system preference detection.
 */

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-[18px]" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className={cn(
        'relative w-8 h-[18px] rounded-full border-none cursor-pointer transition-colors duration-100',
        isDark ? 'bg-slate-600' : 'bg-slate-200',
        className
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full transition-transform duration-200',
          isDark
            ? 'translate-x-[14px] bg-slate-100'
            : 'translate-x-0 bg-slate-400'
        )}
      />
    </button>
  );
};

export default ThemeToggle;
