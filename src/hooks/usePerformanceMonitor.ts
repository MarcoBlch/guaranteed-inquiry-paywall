import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  mountTime: number;
  renderCount: number;
  lastRenderDuration: number;
}

/**
 * Performance monitoring hook for tracking component lifecycle and render performance.
 * Only active in development mode to avoid production overhead.
 *
 * Usage:
 * ```tsx
 * const Dashboard = () => {
 *   usePerformanceMonitor('Dashboard', { trackRenders: true });
 *   // ... component code
 * }
 * ```
 */
export const usePerformanceMonitor = (
  componentName: string,
  options: {
    trackRenders?: boolean;
    trackEffects?: boolean;
    logThreshold?: number; // Only log if render takes longer than this (ms)
  } = {}
) => {
  const {
    trackRenders = true,
    trackEffects = false,
    logThreshold = 16, // Default to 16ms (60fps threshold)
  } = options;

  const renderCount = useRef(0);
  const mountTime = useRef<number>(0);
  const lastRenderStart = useRef<number>(0);
  const effectTimings = useRef<{ [key: string]: number }>({});

  // Only run in development mode
  const isDev = import.meta.env.DEV;

  // Track component mount
  useEffect(() => {
    if (!isDev) return;

    mountTime.current = performance.now();
    console.log(`[Perf] ${componentName} mounted at ${mountTime.current.toFixed(2)}ms`);

    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTime.current;
      console.log(`[Perf] ${componentName} unmounted. Lifetime: ${lifetime.toFixed(2)}ms, Total renders: ${renderCount.current}`);
    };
  }, [componentName, isDev]);

  // Track renders
  useEffect(() => {
    if (!isDev || !trackRenders) return;

    const renderEnd = performance.now();
    const renderDuration = renderEnd - lastRenderStart.current;

    renderCount.current += 1;

    if (renderDuration > logThreshold) {
      console.warn(
        `[Perf] ${componentName} render #${renderCount.current} took ${renderDuration.toFixed(2)}ms (threshold: ${logThreshold}ms)`
      );
    }
  });

  // Mark render start (called before React commit phase)
  if (isDev && trackRenders) {
    lastRenderStart.current = performance.now();
  }

  return {
    /**
     * Measure a specific operation (like data fetching)
     */
    measure: (label: string, callback: () => void | Promise<void>) => {
      if (!isDev) {
        if (typeof callback === 'function') {
          const result = callback();
          if (result instanceof Promise) {
            return result;
          }
        }
        return;
      }

      const start = performance.now();
      const result = callback();

      if (result instanceof Promise) {
        return result.then((data) => {
          const duration = performance.now() - start;
          console.log(`[Perf] ${componentName}.${label} took ${duration.toFixed(2)}ms`);
          return data;
        });
      } else {
        const duration = performance.now() - start;
        console.log(`[Perf] ${componentName}.${label} took ${duration.toFixed(2)}ms`);
      }
    },

    /**
     * Mark the start of a user journey for end-to-end timing
     */
    markStart: (journeyName: string) => {
      if (!isDev) return;
      performance.mark(`${componentName}-${journeyName}-start`);
    },

    /**
     * Mark the end of a user journey and log duration
     */
    markEnd: (journeyName: string) => {
      if (!isDev) return;

      const startMark = `${componentName}-${journeyName}-start`;
      const endMark = `${componentName}-${journeyName}-end`;

      performance.mark(endMark);

      try {
        performance.measure(
          `${componentName}-${journeyName}`,
          startMark,
          endMark
        );

        const measure = performance.getEntriesByName(`${componentName}-${journeyName}`)[0];
        console.log(
          `[Perf Journey] ${componentName}.${journeyName} completed in ${measure.duration.toFixed(2)}ms`
        );

        // Clean up marks
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(`${componentName}-${journeyName}`);
      } catch (error) {
        console.warn(`[Perf] Could not measure ${journeyName}:`, error);
      }
    },

    /**
     * Get current performance metrics
     */
    getMetrics: (): PerformanceMetrics => ({
      componentName,
      mountTime: mountTime.current,
      renderCount: renderCount.current,
      lastRenderDuration: performance.now() - lastRenderStart.current,
    }),
  };
};

/**
 * Hook to track query performance (for detecting N+1 queries)
 *
 * Usage:
 * ```tsx
 * const queryMonitor = useQueryPerformanceMonitor('Dashboard');
 *
 * // Track a query
 * queryMonitor.trackQuery('fetchMessages', async () => {
 *   return await supabase.from('messages').select('*');
 * });
 * ```
 */
export const useQueryPerformanceMonitor = (componentName: string) => {
  const queryTimes = useRef<Map<string, number[]>>(new Map());
  const isDev = import.meta.env.DEV;

  return {
    /**
     * Track a database query and detect potential N+1 issues
     */
    trackQuery: async <T,>(queryName: string, queryFn: () => Promise<T>): Promise<T> => {
      if (!isDev) {
        return queryFn();
      }

      const start = performance.now();
      const result = await queryFn();
      const duration = performance.now() - start;

      // Store query timing
      const times = queryTimes.current.get(queryName) || [];
      times.push(duration);
      queryTimes.current.set(queryName, times);

      // Detect N+1: if same query runs multiple times in quick succession
      if (times.length > 3) {
        const recentTimes = times.slice(-3);
        const avgTime = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;

        console.warn(
          `[Perf N+1?] ${componentName}.${queryName} called ${times.length} times. ` +
          `Latest: ${duration.toFixed(2)}ms, Avg: ${avgTime.toFixed(2)}ms. ` +
          `Consider batching or using Promise.all()`
        );
      } else {
        console.log(`[Perf Query] ${componentName}.${queryName} took ${duration.toFixed(2)}ms`);
      }

      return result;
    },

    /**
     * Get query statistics
     */
    getQueryStats: () => {
      if (!isDev) return {};

      const stats: Record<string, { count: number; totalTime: number; avgTime: number }> = {};

      queryTimes.current.forEach((times, queryName) => {
        const totalTime = times.reduce((a, b) => a + b, 0);
        stats[queryName] = {
          count: times.length,
          totalTime,
          avgTime: totalTime / times.length,
        };
      });

      return stats;
    },

    /**
     * Reset query tracking
     */
    reset: () => {
      queryTimes.current.clear();
    },
  };
};
