import { BRAND } from '@/lib/brandColors';

export const BRAND_TAGLINE =
  'Professional B2B platform for clinics. Connect, order, research, and grow together.';

type BrandTitleProps = {
  className?: string;
  /** xs = compact mobile header, sm = header, md = footer, lg = hero */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Light wordmark for dark backgrounds (footer) */
  variant?: 'default' | 'onDark';
  /** Show tagline under the wordmark (header / hero) */
  showTagline?: boolean;
  taglineClassName?: string;
};

const sizeClasses = {
  xs: 'text-[11px] sm:text-xs',
  sm: 'text-base lg:text-lg',
  md: 'text-xl',
  lg: 'text-2xl md:text-4xl',
};

const taglineSizeClasses = {
  sm: 'text-xs sm:text-sm lg:text-[15px] leading-snug max-w-[280px] lg:max-w-[360px] font-bold',
  md: 'text-sm lg:text-base leading-snug max-w-md font-bold',
  lg: 'text-base lg:text-lg leading-relaxed max-w-xl font-bold',
};

const neGradientStyle = {
  backgroundImage: `linear-gradient(90deg, ${BRAND.blue} 0%, ${BRAND.teal} 40%, ${BRAND.gold} 100%)`,
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

/**
 * Wordmark aligned with logo.svg nameGrad (AestheticRXNetwork):
 * - Aesthetic → blue | R → blue | X → light blue
 * - Ne → blue + gold blend | twork → gold
 */
export function BrandTitle({
  className = '',
  size = 'md',
  variant = 'default',
  showTagline = false,
  taglineClassName,
}: BrandTitleProps) {
  const onDark = variant === 'onDark';
  const aestheticColor = onDark ? BRAND.lightBlue : BRAND.blue;
  const rColor = onDark ? '#93C5FD' : BRAND.blue;
  const xColor = onDark ? '#BAE6FD' : BRAND.lightBlue;

  return (
    <div className={`inline-flex flex-col justify-center ${className}`}>
      <span
        className={`font-bold leading-none tracking-tight whitespace-nowrap ${sizeClasses[size]}`}
        style={{ fontFeatureSettings: '"kern" 1' }}
      >
        <span style={{ color: aestheticColor }}>Aesthetic</span>
        <span style={{ color: rColor }}>R</span>
        <span style={{ color: xColor }}>X</span>
        {onDark ? (
          <>
            <span style={{ color: BRAND.lightBlue }}> N</span>
            <span style={{ color: BRAND.gold }}>e</span>
          </>
        ) : (
          <span className="bg-clip-text text-transparent" style={neGradientStyle}>
            {' '}
            Ne
          </span>
        )}
        <span style={{ color: onDark ? BRAND.gold : BRAND.goldDark }}>twork</span>
      </span>
      {showTagline && (
        <p
          className={
            taglineClassName ??
            `text-gray-800 font-bold mt-2 ${taglineSizeClasses[size]}`
          }
        >
          {BRAND_TAGLINE}
        </p>
      )}
    </div>
  );
}
