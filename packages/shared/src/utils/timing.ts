/**
 * @fileoverview Timing utilities for performance optimization
 * @module @zengrid/shared/utils/timing
 */

import type {
  DebounceOptions,
  DebouncedFunction,
  ThrottleOptions,
  ThrottledFunction,
  RAFBatchScheduler,
} from './timing.interface';

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param options - Options object
 * @returns Debounced function with cancel and flush methods
 *
 * @example
 * ```typescript
 * const handleResize = debounce(() => {
 *   console.log('Window resized');
 * }, 250);
 *
 * window.addEventListener('resize', handleResize);
 *
 * // Cancel pending invocations
 * handleResize.cancel();
 *
 * // Immediately invoke
 * handleResize.flush();
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { leading = false, maxWait, trailing = true } = options;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let maxTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: any;
  let result: ReturnType<T> | undefined;

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result as ReturnType<T>;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime ?? 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : (result as ReturnType<T> | undefined);
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - (lastCallTime ?? 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
    } else {
      timeoutId = setTimeout(timerExpired, remainingWait(time));
    }
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeoutId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    lastThis = undefined;
    return result as ReturnType<T> | undefined;
  }

  function cancel(): void {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== undefined) {
      clearTimeout(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = undefined;
    lastThis = undefined;
    timeoutId = undefined;
    maxTimeoutId = undefined;
  }

  function flush(): ReturnType<T> | undefined {
    if (timeoutId === undefined) {
      return result;
    }
    return trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timeoutId !== undefined;
  }

  function debounced(this: any, ...args: Parameters<T>): void {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === undefined) {
        leadingEdge(lastCallTime);
      } else if (maxWait !== undefined) {
        // Handle invocations in a tight loop
        timeoutId = setTimeout(timerExpired, wait);
        invokeFunc(lastCallTime);
      }
    } else if (timeoutId === undefined) {
      timeoutId = setTimeout(timerExpired, wait);
    }
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced as DebouncedFunction<T>;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @param options - Options object
 * @returns Throttled function with cancel method
 *
 * @example
 * ```typescript
 * const handleScroll = throttle(() => {
 *   console.log('Scrolling');
 * }, 100);
 *
 * window.addEventListener('scroll', handleScroll);
 *
 * // Cancel pending invocation
 * handleScroll.cancel();
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: ThrottleOptions = {}
): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;

  return debounce(func, wait, {
    leading,
    trailing,
    maxWait: wait,
  }) as unknown as ThrottledFunction<T>;
}

/**
 * Creates a RAF (RequestAnimationFrame) batch scheduler that coalesces multiple
 * updates into a single animation frame.
 *
 * Useful for optimizing frequent DOM updates by batching them together.
 *
 * @returns RAF batch scheduler
 *
 * @example
 * ```typescript
 * const scheduler = createRAFBatchScheduler();
 *
 * // Multiple calls in same frame will be batched
 * scheduler.schedule(() => console.log('Update 1'));
 * scheduler.schedule(() => console.log('Update 2'));
 * scheduler.schedule(() => console.log('Update 3'));
 * // All three will run in the same animation frame
 *
 * // Cancel all pending
 * scheduler.cancelAll();
 * ```
 */
export function createRAFBatchScheduler(): RAFBatchScheduler {
  let rafId: number | null = null;
  const callbacks = new Set<() => void>();

  function executeBatch(): void {
    rafId = null;
    const toExecute = Array.from(callbacks);
    callbacks.clear();

    for (const callback of toExecute) {
      try {
        callback();
      } catch (error) {
        console.error('RAF batch callback error:', error);
      }
    }
  }

  function schedule(callback: () => void): () => void {
    callbacks.add(callback);

    if (rafId === null) {
      rafId = requestAnimationFrame(executeBatch);
    }

    // Return cancel function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0 && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }

  function cancelAll(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    callbacks.clear();
  }

  function getPendingCount(): number {
    return callbacks.size;
  }

  return {
    schedule,
    cancelAll,
    getPendingCount,
  };
}

/**
 * Delays execution for specified milliseconds. Returns a promise.
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await delay(1000); // Wait 1 second
 * console.log('1 second later');
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a timeout promise that rejects after specified milliseconds
 *
 * @param ms - Milliseconds before timeout
 * @param message - Error message
 * @returns Promise that rejects after timeout
 *
 * @example
 * ```typescript
 * const result = await Promise.race([
 *   fetchData(),
 *   timeout(5000, 'Request timeout')
 * ]);
 * ```
 */
export function timeout(ms: number, message = 'Timeout'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}
