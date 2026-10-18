import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark' | 'symbol-only' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

/**
 * Authentic DORMEX Brand Symbol SVG vector
 * Derived from official Brand Identity Board:
 * Deep Navy D-arc (#203653) encasing architectural building structure
 * with Teal (#2C8279) and Sandstone Gold (#D4B779) roof/room blocks.
 */
export const DormexSymbol: React.FC<{ size?: number; className?: string; isDark?: boolean }> = ({
  size = 36,
  className = '',
  isDark = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Outer D-shape arch */}
      <path
        d="M20 12 H58 C78 12 92 26 92 50 C92 74 78 88 58 88 H20 V12 Z"
        fill={isDark ? '#FFFFFF' : '#203653'}
      />
      {/* Architectural Inner Cutout */}
      <path
        d="M36 28 H54 C66 28 75 37 75 50 C75 63 66 72 54 72 H36 V28 Z"
        fill={isDark ? '#203653' : '#F7F6F1'}
      />
      {/* Tall High-Rise Building Tower */}
      <path
        d="M36 34 L52 26 V72 H36 V34 Z"
        fill={isDark ? '#FFFFFF' : '#203653'}
      />
      {/* Tower side angle shadow */}
      <path
        d="M52 26 L56 29 V72 H52 V26 Z"
        fill="#17283B"
      />
      {/* Middle Muted Teal Hostel Module */}
      <rect
        x="56"
        y="42"
        width="22"
        height="18"
        fill="#2C8279"
      />
      {/* Window Highlight in Teal Module */}
      <rect
        x="64"
        y="46"
        width="6"
        height="10"
        fill="#E7F2ED"
      />
      {/* Lower Sandstone Gold Base Block */}
      <rect
        x="56"
        y="60"
        width="22"
        height="12"
        fill="#D4B779"
      />
    </svg>
  );
};

export const DormexLogo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const isDark = variant === 'dark';

  // Dimension scaling
  const symbolSize = size === 'sm' ? 28 : size === 'md' ? 36 : size === 'lg' ? 44 : 54;
  const titleSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : size === 'lg' ? 'text-xl' : 'text-2xl';
  const subtitleSize = size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[9px]' : 'text-[10px]';

  if (variant === 'symbol-only') {
    return <DormexSymbol size={symbolSize} className={className} isDark={isDark} />;
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <DormexSymbol size={symbolSize} isDark={isDark} />
      <div className="flex flex-col">
        <div className="flex items-center gap-2 leading-none">
          <span
            className={`font-black tracking-tight font-sans ${titleSize} ${
              isDark ? 'text-white' : 'text-[#203653]'
            }`}
          >
            DORMEX
          </span>
        </div>
        {showSubtitle && (
          <div className="mt-0.5">
            <span
              className={`block font-bold tracking-widest uppercase ${subtitleSize} ${
                isDark ? 'text-[#84d5ca]' : 'text-[#2C8279]'
              }`}
            >
              HOSTEL ALLOCATION PLATFORM
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-[0.5px] w-3 bg-[#D4B779] opacity-75" />
              <span
                className={`font-semibold tracking-widest uppercase text-[7.5px] ${
                  isDark ? 'text-slate-300' : 'text-[#627084]'
                }`}
              >
                SIT • TUMAKURU
              </span>
              <span className="h-[0.5px] w-3 bg-[#D4B779] opacity-75" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
