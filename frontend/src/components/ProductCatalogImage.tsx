'use client';

import { useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { getProductImageSrc, type ProductImageView } from '@/lib/productImageUrl';

type ProductCatalogImageProps = {
  productId: string;
  alt: string;
  view?: ProductImageView;
  className?: string;
};

/**
 * Product thumbnail with proxy URL + graceful placeholder (never shows API error text).
 */
export function ProductCatalogImage({
  productId,
  alt,
  view = 'front',
  className = 'w-full h-full object-cover',
}: ProductCatalogImageProps) {
  const [failed, setFailed] = useState(false);
  const [tryMain, setTryMain] = useState(false);

  if (!productId || failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-2">
        <PhotoIcon className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden />
        <span className="text-[10px] sm:text-xs mt-1 text-center">No image</span>
      </div>
    );
  }

  const src = getProductImageSrc(productId, tryMain ? 'main' : view);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!tryMain && view !== 'main') {
          setTryMain(true);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
