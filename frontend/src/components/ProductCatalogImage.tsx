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
 * Product thumbnail with proxy URL + skeleton while loading (never blocks page chrome).
 */
export function ProductCatalogImage({
  productId,
  alt,
  view = 'front',
  className = 'w-full h-full object-cover',
}: ProductCatalogImageProps) {
  const [failed, setFailed] = useState(false);
  const [tryMain, setTryMain] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
    <div className="relative w-full h-full bg-gray-100">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-100 to-gray-200" aria-hidden />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        loading="lazy"
        decoding="async"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!tryMain && view !== 'main') {
            setTryMain(true);
            setLoaded(false);
            return;
          }
          setFailed(true);
        }}
      />
    </div>
  );
}
