/**
 * StaticBackground Component
 *
 * Dark gradient background with floating orbs effect.
 * Matches the UI inspiration design - NO white sparkles/stars.
 *
 * Design Features:
 * - Dark gradient from teal/green to navy/purple
 * - Large floating circular orbs with blur effect
 * - Subtle animations for depth
 * - NO white stars or sparkles (removed)
 */

import React from 'react';

export const StaticBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient background - matching inspiration */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0d2626 0%, #1a1f3a 40%, #1e2640 70%, #1a1a2e 100%)',
        }}
      />

      {/* Floating orbs/bubbles - matching inspiration image */}
      <div className="absolute inset-0">
        {/* Large dark orb - top right (like in inspiration) */}
        <div
          className="absolute rounded-full opacity-40 blur-[100px]"
          style={{
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(20, 30, 40, 0.8) 0%, transparent 70%)',
            top: '-15%',
            right: '-10%',
            animation: 'float 20s ease-in-out infinite',
          }}
        />

        {/* Large dark orb - bottom left (like in inspiration) */}
        <div
          className="absolute rounded-full opacity-40 blur-[100px]"
          style={{
            width: '700px',
            height: '700px',
            background: 'radial-gradient(circle, rgba(15, 35, 35, 0.9) 0%, transparent 70%)',
            bottom: '-20%',
            left: '-15%',
            animation: 'float 25s ease-in-out infinite',
            animationDelay: '5s',
          }}
        />

        {/* Medium orb - right side */}
        <div
          className="absolute rounded-full opacity-30 blur-[80px]"
          style={{
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(25, 40, 50, 0.7) 0%, transparent 70%)',
            top: '30%',
            right: '5%',
            animation: 'float 30s ease-in-out infinite',
            animationDelay: '10s',
          }}
        />

        {/* Subtle green accent orb - top left */}
        <div
          className="absolute rounded-full opacity-15 blur-[60px]"
          style={{
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(92, 255, 176, 0.1) 0%, transparent 70%)',
            top: '15%',
            left: '10%',
            animation: 'float 28s ease-in-out infinite',
            animationDelay: '3s',
          }}
        />

        {/* Small accent orb - middle */}
        <div
          className="absolute rounded-full opacity-20 blur-[70px]"
          style={{
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(30, 50, 60, 0.6) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'float 35s ease-in-out infinite',
            animationDelay: '7s',
          }}
        />
      </div>

      {/* CSS Animation for floating effect */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.05);
          }
          66% {
            transform: translate(-30px, 30px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
};

export default StaticBackground;
