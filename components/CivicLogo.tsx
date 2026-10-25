'use client';

import React from 'react';

interface CivicLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only';
  theme?: 'light' | 'dark' | 'auto';
  appName?: string;
  className?: string;
}

export default function CivicLogo({
  size = 'md',
  variant = 'full',
  theme = 'light',
  appName = 'UrbaPlus',
  className = '',
}: CivicLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-10 h-10 sm:w-12 sm:h-12',
    xl: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  const titleSizes = {
    sm: 'text-sm font-black',
    md: 'text-base sm:text-lg font-black',
    lg: 'text-xl sm:text-2xl font-black',
    xl: 'text-2xl sm:text-3xl font-black',
  };

  const isDarkText = theme === 'light';

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none shrink-0 ${className}`}>
      {/* Geometric Municipal Shield & Beacon Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm transition-transform hover:scale-105 duration-200"
        >
          <defs>
            <linearGradient id="shieldGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="50%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id="emeraldGrad" x1="30" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="goldGrad" x1="40" y1="30" x2="70" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Outer Shield Shell */}
          <path
            d="M50 8L88 22V50C88 73 72 90 50 96C28 90 12 73 12 50V22L50 8Z"
            fill="url(#shieldGrad)"
            filter="url(#glow)"
          />

          {/* Inner Geometric Skyline / Ward Grid Structure */}
          <path
            d="M50 16L78 28V48C78 66 66 80 50 86C34 80 22 66 22 48V28L50 16Z"
            fill="#FFFFFF"
            fillOpacity="0.08"
            stroke="#93C5FD"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />

          {/* Municipal Arch & Pavement Geometry */}
          <path
            d="M32 64C38 52 62 52 68 64V76C63 80 57 82 50 84C43 82 37 80 32 76V64Z"
            fill="url(#emeraldGrad)"
            fillOpacity="0.9"
          />

          {/* Central AI Beacon Ray (Precision Pin) */}
          <circle cx="50" cy="40" r="10" fill="#FFFFFF" />
          <circle cx="50" cy="40" r="6" fill="#2563EB" />
          <circle cx="50" cy="40" r="3" fill="url(#goldGrad)" />

          {/* Radiant Civic Beam */}
          <path
            d="M50 20V26M50 54V60M36 40H30M70 40H64"
            stroke="#60A5FA"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Verification Checkpoint Star */}
          <path
            d="M48 24L50 21L52 24L55 24.5L53 27L53.5 30L50 28.5L46.5 30L47 27L45 24.5L48 24Z"
            fill="url(#goldGrad)"
          />
        </svg>

        {/* Live System Indicator Dot */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
        </span>
      </div>

      {/* Clean, Bold Brand Typography without Clutter */}
      {variant === 'full' && (
        <span
          className={`tracking-tight leading-none ${titleSizes[size]} ${
            isDarkText ? 'text-slate-950' : 'text-white'
          }`}
        >
          {appName}
        </span>
      )}
    </div>
  );
}
