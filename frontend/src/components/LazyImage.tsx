'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  placeholderColor?: string;
  showSkeleton?: boolean;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  placeholderColor = '#f3f4f6',
  showSkeleton = true,
  priority = false,
  onLoad,
  onError,
  fallbackSrc,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imageRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.01,
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const currentSrc = hasError && fallbackSrc ? fallbackSrc : src;

  return (
    <div
      ref={imageRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: !isLoaded ? placeholderColor : 'transparent',
        width: fill ? '100%' : width,
        height: fill ? '100%' : height,
      }}
    >
      {/* Skeleton loader */}
      {showSkeleton && !isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      )}

      {/* Actual image */}
      {isInView && (
        <Image
          src={currentSrc}
          alt={alt}
          fill={fill}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${fill ? 'object-cover' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
        />
      )}

      {/* Error fallback */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Avatar with lazy loading and initials fallback
interface LazyAvatarProps {
  src?: string | null;
  alt: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LazyAvatar({ src, alt, name, size = 'md', className = '' }: LazyAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  const initials = name
    ? name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const showImage = src && !hasError;

  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium ${sizeClasses[size]} ${className}`}
    >
      {/* Initials fallback */}
      <span className={`${showImage && isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        {initials}
      </span>

      {/* Image overlay */}
      {showImage && (
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          sizes={`${parseInt(sizeClasses[size].split(' ')[0].replace('w-', '')) * 4}px`}
        />
      )}
    </div>
  );
}

// Product image with placeholder
interface ProductImageProps {
  src?: string | null;
  alt: string;
  aspectRatio?: 'square' | '4:3' | '16:9';
  className?: string;
  priority?: boolean;
}

export function ProductImage({ 
  src, 
  alt, 
  aspectRatio = 'square', 
  className = '',
  priority = false 
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const aspectClasses = {
    'square': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
  };

  return (
    <div className={`relative ${aspectClasses[aspectRatio]} bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {/* Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
      )}

      {/* Image */}
      {src && !hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}

