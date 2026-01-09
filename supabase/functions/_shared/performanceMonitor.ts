/**
 * Performance monitoring utilities for Supabase Edge Functions
 *
 * Usage:
 * ```ts
 * import { PerformanceMonitor } from '../_shared/performanceMonitor.ts';
 *
 * const perf = new PerformanceMonitor('function-name');
 *
 * // Track the entire function
 * perf.start();
 * // ... function logic
 * perf.end(); // Logs duration
 *
 * // Track specific operations
 * await perf.measure('database-query', async () => {
 *   return await supabase.from('table').select('*');
 * });
 * ```
 */

export class PerformanceMonitor {
  private functionName: string;
  private startTime: number = 0;
  private measurements: Map<string, number[]> = new Map();

  constructor(functionName: string) {
    this.functionName = functionName;
  }

  /**
   * Start timing the entire function execution
   */
  start(): void {
    this.startTime = performance.now();
  }

  /**
   * End timing and log the total duration
   */
  end(): number {
    const duration = performance.now() - this.startTime;
    console.log(`[Perf] ${this.functionName} total execution: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Measure a specific operation
   */
  async measure<T>(label: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;

      // Store measurement
      const measurements = this.measurements.get(label) || [];
      measurements.push(duration);
      this.measurements.set(label, measurements);

      // Log with context
      console.log(`[Perf] ${this.functionName}.${label}: ${duration.toFixed(2)}ms`);

      // Warn if operation is slow
      if (duration > 1000) {
        console.warn(`[Perf Warning] ${this.functionName}.${label} took ${duration.toFixed(2)}ms (>1s)`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Perf Error] ${this.functionName}.${label} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * Measure a synchronous operation
   */
  measureSync<T>(label: string, operation: () => T): T {
    const start = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - start;

      console.log(`[Perf] ${this.functionName}.${label}: ${duration.toFixed(2)}ms`);

      if (duration > 100) {
        console.warn(`[Perf Warning] ${this.functionName}.${label} (sync) took ${duration.toFixed(2)}ms (>100ms)`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Perf Error] ${this.functionName}.${label} (sync) failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { count: number; total: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; total: number; avg: number; min: number; max: number }> = {};

    this.measurements.forEach((times, label) => {
      const total = times.reduce((a, b) => a + b, 0);
      summary[label] = {
        count: times.length,
        total,
        avg: total / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
      };
    });

    return summary;
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const summary = this.getSummary();
    console.log(`[Perf Summary] ${this.functionName}:`);
    Object.entries(summary).forEach(([label, stats]) => {
      console.log(
        `  ${label}: ${stats.count}x, avg: ${stats.avg.toFixed(2)}ms, ` +
        `min: ${stats.min.toFixed(2)}ms, max: ${stats.max.toFixed(2)}ms`
      );
    });
  }

  /**
   * Detect N+1 query patterns
   */
  detectN1Issues(): string[] {
    const issues: string[] = [];

    this.measurements.forEach((times, label) => {
      // If same operation runs more than 5 times
      if (times.length > 5) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        issues.push(
          `Potential N+1: "${label}" executed ${times.length} times (avg: ${avgTime.toFixed(2)}ms). ` +
          `Consider batching or using a single query.`
        );
      }
    });

    return issues;
  }
}

/**
 * Simple timer utility for one-off measurements
 */
export class Timer {
  private start: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.start = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.start;
    console.log(`[Timer] ${this.label}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}

/**
 * Decorator for measuring function execution time
 *
 * Usage:
 * ```ts
 * const result = await measureFunction('myOperation', async () => {
 *   return await someAsyncOperation();
 * });
 * ```
 */
export async function measureFunction<T>(
  label: string,
  fn: () => Promise<T>,
  options: { warnThreshold?: number } = {}
): Promise<T> {
  const { warnThreshold = 1000 } = options;
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    console.log(`[Measure] ${label}: ${duration.toFixed(2)}ms`);

    if (duration > warnThreshold) {
      console.warn(`[Measure Warning] ${label} exceeded threshold (${duration.toFixed(2)}ms > ${warnThreshold}ms)`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Measure Error] ${label} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}
