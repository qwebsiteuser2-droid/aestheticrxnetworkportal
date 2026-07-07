'use client';

import { ShareIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { copyProductShareLink } from '@/lib/productShareLink';

/** Daraz-style share accent (marketplace orange) */
const DARAZ_SHARE_ORANGE = '#f85606';

interface ShareLinkButtonProps {
  entityId: string;
  label?: string;
  className?: string;
  variant?: 'compact' | 'prominent';
}

export function ShareLinkButton({
  entityId,
  label = 'Share',
  className = '',
  variant = 'prominent',
}: ShareLinkButtonProps) {
  const handleClick = async () => {
    try {
      await copyProductShareLink(entityId);
      toast.success('Link copied! Share it with anyone.');
    } catch {
      toast.error('Could not copy link. Please try again.');
    }
  };

  const icon = (
    <ShareIcon
      className={variant === 'prominent' ? 'w-6 h-6' : 'w-5 h-5'}
      style={{ color: DARAZ_SHARE_ORANGE }}
      aria-hidden
    />
  );

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-orange-50 hover:border-orange-200 transition-colors ${className}`}
        title="Copy link to this product"
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 text-base font-semibold rounded-xl border-2 bg-white text-gray-900 shadow-sm hover:bg-orange-50 transition-all ${className}`}
      style={{ borderColor: DARAZ_SHARE_ORANGE }}
      title="Copy link to this product"
    >
      {icon}
      <span style={{ color: DARAZ_SHARE_ORANGE }}>{label}</span>
    </button>
  );
}
