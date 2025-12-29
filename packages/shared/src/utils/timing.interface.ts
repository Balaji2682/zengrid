/**
 * @fileoverview Timing utilities interfaces for performance optimization
 * @module @zengrid/shared/utils/timing
 */

/**
 * Options for debounce function
 */
export interface DebounceOptions {
  /**
   * Call function on leading edge instead of trailing edge
   * @default false
   */
  leading?: boolean;

  /**
   * Maximum time function is allowed to be delayed before it's invoked
   */
  maxWait?: number;

  /**
   * Call function on trailing edge
   * @default true
   */
  trailing?: boolean;
}

/**
 * Options for throttle function
 */
export interface ThrottleOptions {
  /**
   * Call function on leading edge
   * @default true
   */
  leading?: boolean;

  /**
   * Call function on trailing edge
   * @default true
   */
  trailing?: boolean;
}

/**
 * A debounced function with cancel and flush methods
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  /**
   * Call the debounced function
   */
  (...args: Parameters<T>): void;

  /**
   * Cancel pending function invocations
   */
  cancel(): void;

  /**
   * Immediately invoke pending function calls
   */
  flush(): ReturnType<T> | undefined;

  /**
   * Check if there are pending invocations
   */
  pending(): boolean;
}

/**
 * A throttled function with cancel method
 */
export interface ThrottledFunction<T extends (...args: any[]) => any> {
  /**
   * Call the throttled function
   */
  (...args: Parameters<T>): void;

  /**
   * Cancel pending function invocations
   */
  cancel(): void;

  /**
   * Check if there are pending invocations
   */
  pending(): boolean;
}

/**
 * RAF batch scheduler for coalescing multiple updates
 */
export interface RAFBatchScheduler {
  /**
   * Schedule a callback to run in the next animation frame
   * @param callback - Function to execute
   * @returns Cancel function
   */
  schedule(callback: () => void): () => void;

  /**
   * Cancel all pending callbacks
   */
  cancelAll(): void;

  /**
   * Get number of pending callbacks
   */
  getPendingCount(): number;
}
