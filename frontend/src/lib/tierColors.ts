/**
 * Comprehensive tier color mapping utility
 * Supports all colors available in the tier configuration system
 */

export interface TierColorInfo {
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: string;
  hex: string;
}

export const TIER_COLOR_MAP: Record<string, TierColorInfo> = {
  'gray': {
    bgClass: 'bg-gray-500',
    textClass: 'text-gray-800',
    borderClass: 'border-gray-500',
    icon: '⚪',
    hex: '#6b7280'
  },
  'green': {
    bgClass: 'bg-green-500',
    textClass: 'text-green-800',
    borderClass: 'border-green-500',
    icon: '🟢',
    hex: '#059669'
  },
  'blue': {
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-500',
    icon: '🔵',
    hex: '#2563eb'
  },
  'purple': {
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-800',
    borderClass: 'border-purple-500',
    icon: '🟣',
    hex: '#7c3aed'
  },
  'red': {
    bgClass: 'bg-red-500',
    textClass: 'text-red-800',
    borderClass: 'border-red-500',
    icon: '🔴',
    hex: '#dc2626'
  },
  'yellow': {
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-800',
    borderClass: 'border-yellow-500',
    icon: '🟡',
    hex: '#d97706'
  },
  'orange': {
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-500',
    icon: '🟠',
    hex: '#ea580c'
  },
  'pink': {
    bgClass: 'bg-pink-500',
    textClass: 'text-pink-800',
    borderClass: 'border-pink-500',
    icon: '🩷',
    hex: '#db2777'
  },
  'indigo': {
    bgClass: 'bg-indigo-500',
    textClass: 'text-indigo-800',
    borderClass: 'border-indigo-500',
    icon: '🟦',
    hex: '#4338ca'
  },
  'teal': {
    bgClass: 'bg-teal-500',
    textClass: 'text-teal-800',
    borderClass: 'border-teal-500',
    icon: '🟢',
    hex: '#0d9488'
  },
  'cyan': {
    bgClass: 'bg-cyan-500',
    textClass: 'text-cyan-800',
    borderClass: 'border-cyan-500',
    icon: '🔵',
    hex: '#0891b2'
  },
  'lime': {
    bgClass: 'bg-lime-500',
    textClass: 'text-lime-800',
    borderClass: 'border-lime-500',
    icon: '🟢',
    hex: '#65a30d'
  },
  'amber': {
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-500',
    icon: '🟡',
    hex: '#d97706'
  },
  'emerald': {
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-500',
    icon: '💚',
    hex: '#047857'
  },
  'violet': {
    bgClass: 'bg-violet-500',
    textClass: 'text-violet-800',
    borderClass: 'border-violet-500',
    icon: '🟣',
    hex: '#7c2d12'
  },
  'rose': {
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-800',
    borderClass: 'border-rose-500',
    icon: '🌹',
    hex: '#be185d'
  },
  'sky': {
    bgClass: 'bg-sky-500',
    textClass: 'text-sky-800',
    borderClass: 'border-sky-500',
    icon: '☁️',
    hex: '#0284c7'
  },
  'slate': {
    bgClass: 'bg-slate-500',
    textClass: 'text-slate-800',
    borderClass: 'border-slate-500',
    icon: '⚫',
    hex: '#475569'
  },
  'zinc': {
    bgClass: 'bg-zinc-500',
    textClass: 'text-zinc-800',
    borderClass: 'border-zinc-500',
    icon: '⚫',
    hex: '#52525b'
  },
  'neutral': {
    bgClass: 'bg-neutral-500',
    textClass: 'text-neutral-800',
    borderClass: 'border-neutral-500',
    icon: '⚫',
    hex: '#525252'
  },
  'stone': {
    bgClass: 'bg-stone-500',
    textClass: 'text-stone-800',
    borderClass: 'border-stone-500',
    icon: '🪨',
    hex: '#57534e'
  }
};

/**
 * Get tier color information by color name
 */
export const getTierColorInfo = (colorName: string): TierColorInfo => {
  return TIER_COLOR_MAP[colorName] || TIER_COLOR_MAP['blue'];
};

/**
 * Get tier badge classes for display
 */
export const getTierBadgeClasses = (colorName: string): string => {
  const colorInfo = getTierColorInfo(colorName);
  return `${colorInfo.bgClass.replace('500', '100')} ${colorInfo.textClass.replace('800', '800')}`;
};

/**
 * Get tier icon by color name
 */
export const getTierIcon = (colorName: string): string => {
  return getTierColorInfo(colorName).icon;
};

/**
 * Get tier background class by color name
 */
export const getTierBgClass = (colorName: string): string => {
  return getTierColorInfo(colorName).bgClass;
};

/**
 * Get tier text class by color name
 */
export const getTierTextClass = (colorName: string): string => {
  return getTierColorInfo(colorName).textClass;
};

/**
 * Get tier border class by color name
 */
export const getTierBorderClass = (colorName: string): string => {
  return getTierColorInfo(colorName).borderClass;
};

/**
 * Get tier hex color by color name
 */
export const getTierHexColor = (colorName: string): string => {
  return getTierColorInfo(colorName).hex;
};
