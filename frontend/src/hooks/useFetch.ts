'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { withRetry, apiCache } from '@/lib/networkUtils';

interface UseFetchOptions<T> {
  // Initial data before fetch completes
  initialData?: T;
  // Cache key (if provided, results will be cached)
  cacheKey?: string;
  // Cache TTL in milliseconds (default 60000 = 1 minute)
  cacheTTL?: number;
  // Whether to fetch immediately on mount (default true)
  immediate?: boolean;
  // Number of retry attempts (default 2)
  retryCount?: number;
  // Dependencies that trigger refetch
  deps?: any[];
  // Transform the response data
  transform?: (data: any) => T;
  // Called on successful fetch
  onSuccess?: (data: T) => void;
  // Called on error
  onError?: (error: Error) => void;
}

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isRetrying: boolean;
  retryCount: number;
}

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    initialData,
    cacheKey,
    cacheTTL = 60000,
    immediate = true,
    retryCount = 2,
    deps = [],
    transform,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentRetryCount, setCurrentRetryCount] = useState(0);
  
  // Track if component is mounted
  const isMounted = useRef(true);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const executeFetch = useCallback(async () => {
    // Check cache first
    if (cacheKey) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached !== null) {
        setData(cached);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setCurrentRetryCount(0);

    try {
      const result = await withRetry(
        async () => {
          const response = await fetchRef.current();
          return transform ? transform(response) : response;
        },
        {
          maxRetries: retryCount,
          baseDelay: 1000,
          maxDelay: 5000,
        }
      );

      if (isMounted.current) {
        setData(result);
        setError(null);
        
        // Cache the result
        if (cacheKey) {
          apiCache.set(cacheKey, result, cacheTTL);
        }
        
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMounted.current) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsRetrying(false);
      }
    }
  }, [cacheKey, cacheTTL, retryCount, transform, onSuccess, onError]);

  // Refetch function for manual retries
  const refetch = useCallback(async () => {
    setIsRetrying(true);
    setCurrentRetryCount(prev => prev + 1);
    
    // Clear cache before refetch
    if (cacheKey) {
      apiCache.delete(cacheKey);
    }
    
    await executeFetch();
  }, [executeFetch, cacheKey]);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    if (immediate) {
      executeFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
    isRetrying,
    retryCount: currentRetryCount,
  };
}

// Simpler hook for paginated data
interface UsePaginatedFetchOptions<T> extends Omit<UseFetchOptions<T[]>, 'transform'> {
  pageSize?: number;
}

interface UsePaginatedFetchResult<T> extends Omit<UseFetchResult<T[]>, 'data'> {
  data: T[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  page: number;
  reset: () => void;
}

export function usePaginatedFetch<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options: UsePaginatedFetchOptions<T> = {}
): UsePaginatedFetchResult<T> {
  const { pageSize = 20, ...restOptions } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);

  const loadPage = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await withRetry(
        () => fetchFn(pageNum, pageSize),
        { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
      );

      if (isMounted.current) {
        if (append) {
          setData(prev => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }
        setHasMore(result.hasMore);
        setPage(pageNum);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [fetchFn, pageSize]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    await loadPage(page + 1, true);
  }, [hasMore, isLoadingMore, loadPage, page]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    loadPage(1, false);
  }, [loadPage]);

  const refetch = useCallback(async () => {
    await loadPage(1, false);
  }, [loadPage]);

  // Initial load
  useEffect(() => {
    if (restOptions.immediate !== false) {
      loadPage(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
    isRetrying: isLoadingMore,
    retryCount: 0,
    hasMore,
    loadMore,
    page,
    reset,
  };
}

