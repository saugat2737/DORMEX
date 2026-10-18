import React from 'react';

export type LogoTheme = 'primary' | 'white' | 'stacked' | 'symbol' | 'monochrome';

interface LogoProps {
  theme?: LogoTheme;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  alt?: string;
}

const THEME_IMAGE_MAP: Record<LogoTheme, string> = {
  primary: '/assets/brand-logo-primary-transparent.png',
  white: '/assets/brand-logo-white-transparent.png',
  stacked: '/assets/brand-logo-stacked-transparent.png',
  symbol: '/assets/brand-symbol-icon-transparent.png',
  monochrome: '/assets/brand-logo-monochrome-transparent.png',
};

const HEIGHT_SCALE: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'h-8 sm:h-9',
  md: 'h-10 sm:h-12',
  lg: 'h-14 sm:h-16',
  xl: 'h-20 sm:h-24',
};

/**
 * Authentic DORMEX Brand Logo Component
 * Cropped directly with transparency from `docs/DORMEX Hostel Brand Identity Board.png`
 * Supports 5 themes:
 * - 'primary': Full color horizontal logo with tagline on light backgrounds
 * - 'white': Crisp white horizontal version on dark navy backgrounds (#203653)
 * - 'stacked': Vertical stacked logo (Box 02)
 * - 'symbol': Geometric D building logomark only (Box 03)
 * - 'monochrome': Solid navy monochrome version (Box 04)
 */
export const DormexLogo: React.FC<LogoProps> = ({
  theme = 'primary',
  size = 'md',
  className = '',
  alt = 'DORMEX Hostel Allocation Platform'
}) => {
  const imgSrc = THEME_IMAGE_MAP[theme] || THEME_IMAGE_MAP.primary;
  const heightClass = size === 'custom' ? '' : HEIGHT_SCALE[size];

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`object-contain select-none transition-transform ${heightClass} ${className}`}
      loading="eager"
    />
  );
};
