/**
 * @fileoverview Tests for timing utilities
 */

import { debounce, throttle, createRAFBatchScheduler, delay, timeout } from './timing';

// Mock timers
jest.useFakeTimers();

describe('debounce', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should debounce function calls', () => {
    const func = jest.fn();
    const debounced = debounce(func, 100);

    debounced();
    debounced();
    debounced();

    expect(func).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should call function with latest arguments', () => {
    const func = jest.fn();
    const debounced = debounce(func, 100);

    debounced(1);
    debounced(2);
    debounced(3);

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledWith(3);
  });

  it('should support leading edge execution', () => {
    const func = jest.fn();
    const debounced = debounce(func, 100, { leading: true, trailing: false });

    debounced();
    expect(func).toHaveBeenCalledTimes(1);

    debounced();
    debounced();
    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should support both leading and trailing', () => {
    const func = jest.fn();
    const debounced = debounce(func, 100, { leading: true, trailing: true });

    debounced();
    expect(func).toHaveBeenCalledTimes(1);

    debounced();
    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should support maxWait option', () => {
    const func = jest.fn();
    const debounced = debounce(func, 100, { maxWait: 150 });

    // First call
    debounced();
    expect(func).not.toHaveBeenCalled();

    // Keep calling every 60ms (before wait time)
    jest.advanceTimersByTime(60);
    debounced();
    expect(func).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60);
    debounced();
    expect(func).not.toHaveBeenCalled();

    // After 120ms from first call, still no invoke
    // But advancing more should hit maxWait
    jest.advanceTimersByTime(40); // Total 160ms from first call

    // Should have been invoked due to maxWait (150ms)
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should cancel pending invocations', () => {
    const func = jest.fn();
    const debounced = debounce(func, 100);

    debounced();
    debounced.cancel();

    jest.advanceTimersByTime(100);
    expect(func).not.toHaveBeenCalled();
  });

  it('should flush pending invocations', () => {
    const func = jest.fn(() => 'result');
    const debounced = debounce(func, 100);

    debounced();
    const result = debounced.flush();

    expect(func).toHaveBeenCalledTimes(1);
    expect(result).toBe('result');

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should report pending status', () => {
    const func = jest.fn();
    const debounced = debounce(func, 100);

    expect(debounced.pending()).toBe(false);

    debounced();
    expect(debounced.pending()).toBe(true);

    jest.advanceTimersByTime(100);
    expect(debounced.pending()).toBe(false);
  });

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      method: jest.fn(function (this: any) {
        return this.value;
      }),
    };

    const debounced = debounce(obj.method, 100);
    debounced.call(obj);

    jest.advanceTimersByTime(100);
    expect(obj.method).toHaveBeenCalled();
  });
});

describe('throttle', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should throttle function calls', () => {
    const func = jest.fn();
    const throttled = throttle(func, 100);

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    throttled();
    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should call function at most once per wait period', () => {
    const func = jest.fn();
    const throttled = throttle(func, 100);

    // First call - immediate
    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    // Calls within wait period - ignored
    jest.advanceTimersByTime(50);
    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    // After wait period - trailing call
    jest.advanceTimersByTime(50);
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should support leading: false', () => {
    const func = jest.fn();
    const throttled = throttle(func, 100, { leading: false });

    throttled();
    expect(func).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should support trailing: false', () => {
    const func = jest.fn();
    const throttled = throttle(func, 100, { trailing: false });

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    throttled();
    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1); // No trailing call
  });

  it('should cancel pending invocations', () => {
    const func = jest.fn();
    const throttled = throttle(func, 100);

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    throttled();
    throttled.cancel();

    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(1); // No trailing call
  });

  it('should report pending status', () => {
    const func = jest.fn();
    const throttled = throttle(func, 100);

    throttled();
    expect(throttled.pending()).toBe(true);

    jest.advanceTimersByTime(100);
    expect(throttled.pending()).toBe(false);
  });
});

describe('createRAFBatchScheduler', () => {
  let rafCallbacks: Array<FrameRequestCallback> = [];
  let rafIdCounter = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafIdCounter = 0;

    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafIdCounter;
    }) as any;

    global.cancelAnimationFrame = jest.fn((_id: number) => {
      // Simple cancel implementation
    }) as any;
  });

  afterEach(() => {
    delete (global as any).requestAnimationFrame;
    delete (global as any).cancelAnimationFrame;
  });

  it('should batch multiple callbacks into single RAF', () => {
    const scheduler = createRAFBatchScheduler();
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();

    scheduler.schedule(callback1);
    scheduler.schedule(callback2);
    scheduler.schedule(callback3);

    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(scheduler.getPendingCount()).toBe(3);

    // Execute RAF callbacks
    rafCallbacks.forEach((cb) => cb(0));

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback3).toHaveBeenCalledTimes(1);
    expect(scheduler.getPendingCount()).toBe(0);
  });

  it('should return cancel function', () => {
    const scheduler = createRAFBatchScheduler();
    const callback = jest.fn();

    const cancel = scheduler.schedule(callback);
    expect(scheduler.getPendingCount()).toBe(1);

    cancel();
    expect(scheduler.getPendingCount()).toBe(0);

    rafCallbacks.forEach((cb) => cb(0));
    expect(callback).not.toHaveBeenCalled();
  });

  it('should cancel RAF when all callbacks are removed', () => {
    const scheduler = createRAFBatchScheduler();
    const callback = jest.fn();

    const cancel = scheduler.schedule(callback);
    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);

    cancel();
    expect(global.cancelAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('should cancel all pending callbacks', () => {
    const scheduler = createRAFBatchScheduler();
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    scheduler.schedule(callback1);
    scheduler.schedule(callback2);

    scheduler.cancelAll();
    expect(scheduler.getPendingCount()).toBe(0);
    expect(global.cancelAnimationFrame).toHaveBeenCalledTimes(1);

    rafCallbacks.forEach((cb) => cb(0));
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should handle callback errors gracefully', () => {
    const scheduler = createRAFBatchScheduler();
    const errorCallback = jest.fn(() => {
      throw new Error('Test error');
    });
    const successCallback = jest.fn();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    scheduler.schedule(errorCallback);
    scheduler.schedule(successCallback);

    rafCallbacks.forEach((cb) => cb(0));

    expect(errorCallback).toHaveBeenCalled();
    expect(successCallback).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('RAF batch callback error:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should schedule new RAF for subsequent batches', () => {
    const scheduler = createRAFBatchScheduler();
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    scheduler.schedule(callback1);
    rafCallbacks.forEach((cb) => cb(0));
    rafCallbacks = [];

    scheduler.schedule(callback2);
    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });
});

describe('delay', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should delay execution', async () => {
    const promise = delay(1000);
    const callback = jest.fn();

    promise.then(callback);

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await Promise.resolve(); // Flush promises

    expect(callback).toHaveBeenCalled();
  });

  it('should resolve with undefined', async () => {
    const promise = delay(100);
    jest.advanceTimersByTime(100);

    const result = await promise;
    expect(result).toBeUndefined();
  });
});

describe('timeout', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should reject after specified time', async () => {
    const promise = timeout(1000);
    const onReject = jest.fn();

    promise.catch(onReject);

    expect(onReject).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await Promise.resolve(); // Flush promises

    expect(onReject).toHaveBeenCalled();
  });

  it('should reject with custom message', async () => {
    const promise = timeout(1000, 'Custom timeout message');

    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow('Custom timeout message');
  });

  it('should reject with default message', async () => {
    const promise = timeout(1000);

    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow('Timeout');
  });

  it('should work with Promise.race', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 2000));
    const timeoutPromise = timeout(1000);

    const race = Promise.race([slowPromise, timeoutPromise]);

    jest.advanceTimersByTime(1000);

    await expect(race).rejects.toThrow('Timeout');
  });
});
