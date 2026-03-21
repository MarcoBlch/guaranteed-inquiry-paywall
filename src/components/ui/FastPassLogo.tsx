/**
 * FastPassLogo Component
 *
 * Monospace wordmark: "fastpass.email" with green underline.
 * Supports light/dark mode via next-themes.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface FastPassLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeConfig = {
  sm: { text: 'text-sm', suffix: 'text-[10px]', bar: 'h-[1.5px]' },
  md: { text: 'text-base', suffix: 'text-xs', bar: 'h-[2px]' },
  lg: { text: 'text-lg', suffix: 'text-xs', bar: 'h-[2px]' },
  xl: { text: 'text-xl', suffix: 'text-sm', bar: 'h-[2.5px]' },
};

export const FastPassLogo: React.FC<FastPassLogoProps> = ({
  size = 'md',
  className,
  onClick,
}) => {
  const config = sizeConfig[size];

  return (
    <a
      href="/"
      onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}
      className={cn(
        'inline-flex flex-col no-underline',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <span className={cn(
        'font-mono font-semibold tracking-tight text-slate-900 dark:text-slate-100',
        config.text
      )}>
        fastpass
        <span className={cn('font-normal text-slate-400 dark:text-slate-500', config.suffix)}>
          .email
        </span>
      </span>
      <span className={cn('bg-green-500 rounded-full', config.bar)} />
    </a>
  );
};

export default FastPassLogo;
