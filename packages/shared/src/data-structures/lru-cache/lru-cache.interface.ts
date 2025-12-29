/**
 * LRU Cache Interface
 *
 * Used for:
 * - Caching rendered cells to avoid re-rendering
 * - Caching formula evaluation results
 * - Caching formatted values (numbers, dates)
 * - Caching API responses
 * - Memory-bounded caches with automatic eviction
 */

/**
 * Cache entry metadata
 */
export interface CacheEntry<V> {
  /**
   * The cached value
   */
  value: V;

  /**
   * Timestamp when entry was created
   */
  createdAt: number;

  /**
   * Timestamp when entry was last accessed
   */
  lastAccessedAt: number;

  /**
   * Number of times this entry has been accessed
   */
  accessCount: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /**
   * Current number of entries
   */
  size: number;

  /**
   * Maximum capacity
   */
  capacity: number;

  /**
   * Total number of get operations
   */
  hits: number;

  /**
   * Total number of failed get operations
   */
  misses: number;

  /**
   * Hit rate (hits / (hits + misses))
   */
  hitRate: number;

  /**
   * Total number of evictions
   */
  evictions: number;

  /**
   * Total number of set operations
   */
  sets: number;

  /**
   * Memory usage in bytes (approximate)
   */
  memoryBytes: number;
}

/**
 * LRU Cache options
 */
export interface LRUCacheOptions {
  /**
   * Maximum number of entries
   * @default 1000
   */
  capacity?: number;

  /**
   * Time-to-live in milliseconds (0 = infinite)
   * @default 0
   */
  ttl?: number;

  /**
   * Callback when an entry is evicted
   */
  onEvict?: <K, V>(key: K, value: V) => void;

  /**
   * Track access statistics
   * @default false
   */
  trackStats?: boolean;
}

/**
 * LRU Cache interface
 */
export interface ILRUCache<K, V> {
  /**
   * Get a value from the cache
   *
   * @param key - The key to look up
   * @returns The cached value or undefined if not found or expired
   */
  get(key: K): V | undefined;

  /**
   * Set a value in the cache
   *
   * @param key - The key to store
   * @param value - The value to cache
   */
  set(key: K, value: V): void;

  /**
   * Check if a key exists in the cache
   *
   * @param key - The key to check
   * @returns True if the key exists and is not expired
   */
  has(key: K): boolean;

  /**
   * Delete a specific entry
   *
   * @param key - The key to delete
   * @returns True if the entry existed and was deleted
   */
  delete(key: K): boolean;

  /**
   * Clear all entries from the cache
   */
  clear(): void;

  /**
   * Get the current size of the cache
   *
   * @returns Number of entries
   */
  size(): number;

  /**
   * Get cache statistics
   *
   * @returns Statistics object
   */
  getStats(): CacheStats;

  /**
   * Get all keys in the cache (in LRU order)
   *
   * @returns Array of keys, oldest first
   */
  keys(): K[];

  /**
   * Get all values in the cache (in LRU order)
   *
   * @returns Array of values, oldest first
   */
  values(): V[];

  /**
   * Get all entries with metadata
   *
   * @returns Array of entries with metadata
   */
  entries(): Array<[K, CacheEntry<V>]>;

  /**
   * Peek at a value without updating LRU order
   *
   * @param key - The key to peek at
   * @returns The cached value or undefined
   */
  peek(key: K): V | undefined;

  /**
   * Resize the cache capacity
   *
   * @param newCapacity - New maximum capacity
   */
  resize(newCapacity: number): void;
}
