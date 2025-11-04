/**
 * FastPassLogo Component
 *
 * Official FastPass brand logo with ticket-style design.
 * Logo sits directly on page background with subtle neon glow effect.
 *
 * Brand Standards Implementation:
 * - No card wrapper - transparent background
 * - Glow: Neon Vert (#5cffb0) with subtle opacity
 * - Logo blends naturally with page background
 * - Hover: Enhanced glow effect
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface FastPassLogoProps {
  /**
   * Size variant
   * - sm: 200px width (nav/compact areas)
   * - md: 280px width (standard usage)
   * - lg: 360px width (hero/prominent areas)
   * - xl: 440px width (extra large/landing page)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Show glow effect
   * Default: true
   */
  showGlow?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Optional click handler
   */
  onClick?: () => void;
}

const sizeConfig = {
  sm: {
    logo: 'w-[200px]',
  },
  md: {
    logo: 'w-[280px]',
  },
  lg: {
    logo: 'w-[360px]',
  },
  xl: {
    logo: 'w-[440px]',
  },
};

export const FastPassLogo: React.FC<FastPassLogoProps> = ({
  size = 'md',
  showGlow = true,
  className,
  onClick,
}) => {
  const { logo } = sizeConfig[size];

  return (
    <img
      src="/logo-final-optimized.png"
      alt="FastPass.email - Get Paid to Answer Fast"
      onClick={onClick}
      className={cn(
        // Size based on variant
        logo,
        'h-auto',
        'object-contain',

        // Prevent image stretching
        'max-w-full',

        // Smooth transitions for interactive states
        'transition-all duration-300 ease-out',

        // Cursor pointer if clickable
        onClick && 'cursor-pointer',

        // Subtle scale on hover if clickable
        onClick && 'hover:scale-105',

        // Neon glow effect - drop shadow for transparent PNG
        showGlow && [
          'drop-shadow-[0_0_20px_rgba(92,255,176,0.4)]',
          'hover:drop-shadow-[0_0_30px_rgba(92,255,176,0.6)]',
        ],

        className
      )}
      style={{
        // Additional glow using filter for stronger effect
        filter: showGlow
          ? 'drop-shadow(0 0 15px rgba(92, 255, 176, 0.3))'
          : 'none',
      }}
      onMouseEnter={(e) => {
        if (showGlow) {
          e.currentTarget.style.filter = 'drop-shadow(0 0 25px rgba(92, 255, 176, 0.5))';
        }
      }}
      onMouseLeave={(e) => {
        if (showGlow) {
          e.currentTarget.style.filter = 'drop-shadow(0 0 15px rgba(92, 255, 176, 0.3))';
        }
      }}
    />
  );
};

export default FastPassLogo;
