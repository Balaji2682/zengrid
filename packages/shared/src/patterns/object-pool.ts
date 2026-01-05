/**
 * Generic Object Pooling Pattern
 *
 * Maintains a pool of reusable objects to avoid expensive creation/destruction.
 * Useful for any frequently created/destroyed objects (DOM elements, data structures, etc.)
 *
 * @example
 * ```typescript
 * // Example 1: DOM Element Pool
 * const divPool = new ObjectPool(
 *   () => document.createElement('div'),
 *   (div) => {
 *     div.innerHTML = '';
 *     div.className = '';
 *     div.removeAttribute('style');
 *   },
 *   { initialSize: 50, maxSize: 200 }
 * );
 *
 * const div = divPool.acquire();
 * div.textContent = 'Hello';
 * // ... use div ...
 * divPool.release(div);
 *
 * // Example 2: Data Structure Pool
 * const arrayPool = new ObjectPool(
 *   () => [],
 *   (arr) => arr.length = 0,  // Reset
 *   { initialSize: 10, maxSize: 100 }
 * );
 *
 * const arr = arrayPool.acquire();
 * arr.push(1, 2, 3);
 * // ... use arr ...
 * arrayPool.release(arr);
 * ```
 */

export interface ObjectPoolOptions {
  /** Initial number of objects to create */
  initialSize?: number;
  /** Maximum number of objects to keep in pool */
  maxSize?: number;
}

export interface ObjectPoolStats {
  /** Number of objects currently in use */
  active: number;
  /** Number of objects available in pool */
  available: number;
  /** Total objects created (active + available) */
  total: number;
  /** Maximum pool size */
  maxSize: number;
}

export interface IObjectPool<T> {
  /** Acquire an object from the pool */
  acquire(): T;
  /** Release an object back to the pool */
  release(obj: T): void;
  /** Release all objects back to the pool */
  releaseAll(): void;
  /** Clear the pool and destroy all objects */
  clear(): void;
  /** Get pool statistics */
  readonly stats: ObjectPoolStats;
}

/**
 * Generic object pool implementation
 *
 * @typeParam T - The type of objects to pool
 */
export class ObjectPool<T> implements IObjectPool<T> {
  private available: T[] = [];
  private active = new Set<T>();
  private readonly maxSize: number;
  private readonly factory: () => T;
  private readonly reset: (obj: T) => void;
  private readonly destroy?: (obj: T) => void;

  /**
   * Create a new object pool
   *
   * @param factory - Function to create new objects
   * @param reset - Function to reset objects before releasing back to pool
   * @param options - Pool configuration options
   * @param destroy - Optional function to clean up objects when pool is cleared
   */
  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    options: ObjectPoolOptions = {},
    destroy?: (obj: T) => void
  ) {
    this.factory = factory;
    this.reset = reset;
    this.destroy = destroy;
    this.maxSize = options.maxSize ?? 500;

    // Pre-create initial pool
    const initialSize = options.initialSize ?? 0;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  /**
   * Acquire an object from the pool
   *
   * If the pool is empty, a new object will be created.
   *
   * @returns An object from the pool
   */
  acquire(): T {
    let obj = this.available.pop();

    if (!obj) {
      obj = this.factory();
    }

    this.active.add(obj);
    return obj;
  }

  /**
   * Release an object back to the pool
   *
   * The object will be reset before being returned to the pool.
   * If the pool is at max capacity, the object will be destroyed.
   *
   * @param obj - The object to release
   */
  release(obj: T): void {
    if (!this.active.has(obj)) {
      console.warn('ObjectPool: Attempting to release object that is not active');
      return;
    }

    // Remove from active
    this.active.delete(obj);

    // Reset object
    this.reset(obj);

    // Return to pool or destroy if pool is full
    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    } else {
      this.destroy?.(obj);
    }
  }

  /**
   * Release all active objects back to the pool
   */
  releaseAll(): void {
    const activeObjects = Array.from(this.active);
    for (const obj of activeObjects) {
      this.release(obj);
    }
  }

  /**
   * Clear the pool and destroy all objects
   */
  clear(): void {
    // Destroy all available objects
    for (const obj of this.available) {
      this.destroy?.(obj);
    }
    this.available = [];

    // Destroy all active objects
    for (const obj of this.active) {
      this.destroy?.(obj);
    }
    this.active.clear();
  }

  /**
   * Get pool statistics
   */
  get stats(): ObjectPoolStats {
    return {
      active: this.active.size,
      available: this.available.length,
      total: this.active.size + this.available.length,
      maxSize: this.maxSize,
    };
  }
}

/**
 * Keyed object pool - maintains mapping of keys to pooled objects
 *
 * Useful when you need to track objects by a unique identifier.
 *
 * @example
 * ```typescript
 * const cellPool = new KeyedObjectPool(
 *   () => document.createElement('div'),
 *   (div) => { div.innerHTML = ''; },
 *   { maxSize: 200 }
 * );
 *
 * const cell = cellPool.acquire('cell-0-0');
 * // ... use cell ...
 * cellPool.release('cell-0-0');
 * ```
 */
export class KeyedObjectPool<T, K = string> {
  private pool: ObjectPool<T>;
  private keyMap = new Map<K, T>();

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    options: ObjectPoolOptions = {},
    destroy?: (obj: T) => void
  ) {
    this.pool = new ObjectPool(factory, reset, options, destroy);
  }

  /**
   * Acquire an object by key
   *
   * If an object with this key already exists, it will be returned.
   * Otherwise, a new object will be acquired from the pool.
   *
   * @param key - Unique identifier for the object
   * @returns The object associated with this key
   */
  acquire(key: K): T {
    // Return existing if already active
    if (this.keyMap.has(key)) {
      return this.keyMap.get(key)!;
    }

    // Acquire from pool
    const obj = this.pool.acquire();
    this.keyMap.set(key, obj);
    return obj;
  }

  /**
   * Release an object by key
   *
   * @param key - The key of the object to release
   */
  release(key: K): void {
    const obj = this.keyMap.get(key);
    if (!obj) return;

    this.keyMap.delete(key);
    this.pool.release(obj);
  }

  /**
   * Release all objects except those with the specified keys
   *
   * @param activeKeys - Set of keys to keep active
   */
  releaseExcept(activeKeys: Set<K>): void {
    const keysToRelease: K[] = [];

    for (const key of this.keyMap.keys()) {
      if (!activeKeys.has(key)) {
        keysToRelease.push(key);
      }
    }

    for (const key of keysToRelease) {
      this.release(key);
    }
  }

  /**
   * Check if a key exists in the active set
   */
  has(key: K): boolean {
    return this.keyMap.has(key);
  }

  /**
   * Get an object by key without acquiring
   */
  get(key: K): T | undefined {
    return this.keyMap.get(key);
  }

  /**
   * Get pool statistics
   */
  get stats(): ObjectPoolStats {
    return this.pool.stats;
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.keyMap.clear();
    this.pool.clear();
  }
}
