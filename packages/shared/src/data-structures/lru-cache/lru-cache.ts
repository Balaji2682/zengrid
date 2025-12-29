import type {
  ILRUCache,
  LRUCacheOptions,
  CacheEntry,
  CacheStats,
} from './lru-cache.interface';

/**
 * Doubly-linked list node for LRU tracking
 */
class LRUNode<K, V> {
  constructor(
    public key: K,
    public value: V,
    public createdAt: number = Date.now(),
    public lastAccessedAt: number = Date.now(),
    public accessCount: number = 0,
    public prev: LRUNode<K, V> | null = null,
    public next: LRUNode<K, V> | null = null
  ) {}
}

/**
 * LRU Cache - Least Recently Used Cache
 *
 * A cache with automatic eviction of least recently used entries.
 * Uses doubly-linked list + hash map for O(1) operations.
 *
 * **Time Complexity:**
 * - get: O(1)
 * - set: O(1)
 * - delete: O(1)
 * - has: O(1)
 * - clear: O(n)
 *
 * **Space Complexity:** O(n) where n = number of entries
 *
 * **Use Cases in Grid:**
 * - Cache rendered cells: Avoid re-rendering visible cells
 * - Cache formula results: =SUM(A1:A1000) computed once
 * - Cache formatted values: "$1,234.56" cached instead of re-formatting
 * - Cache API responses: Reduce server requests
 *
 * @example Cell Rendering Cache
 * ```typescript
 * const cellCache = new LRUCache<string, HTMLElement>({ capacity: 500 });
 *
 * function renderCell(row: number, col: number): HTMLElement {
 *   const key = `${row},${col}`;
 *   let element = cellCache.get(key);
 *
 *   if (!element) {
 *     element = createCellElement(row, col); // Expensive operation
 *     cellCache.set(key, element);
 *   }
 *
 *   return element;
 * }
 * ```
 *
 * @example Formula Cache
 * ```typescript
 * const formulaCache = new LRUCache<string, number>({
 *   capacity: 1000,
 *   ttl: 5000, // 5 seconds
 * });
 *
 * function evaluateFormula(formula: string): number {
 *   return formulaCache.get(formula) ?? computeFormula(formula);
 * }
 * ```
 */
export class LRUCache<K, V> implements ILRUCache<K, V> {
  private capacity: number;
  private ttl: number;
  private cache: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V> | null = null; // Most recently used
  private tail: LRUNode<K, V> | null = null; // Least recently used
  private onEvict?: (key: K, value: V) => void;
  private trackStats: boolean;

  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;
  private sets: number = 0;

  constructor(options: LRUCacheOptions = {}) {
    this.capacity = options.capacity ?? 1000;
    this.ttl = options.ttl ?? 0;
    this.onEvict = options.onEvict;
    this.trackStats = options.trackStats ?? false;
    this.cache = new Map();

    if (this.capacity <= 0) {
      throw new Error('Cache capacity must be greater than 0');
    }
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      if (this.trackStats) this.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(node)) {
      this.delete(key);
      if (this.trackStats) this.misses++;
      return undefined;
    }

    // Update access metadata
    node.lastAccessedAt = Date.now();
    node.accessCount++;

    // Move to head (most recently used)
    this.moveToHead(node);

    if (this.trackStats) this.hits++;
    return node.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    if (this.trackStats) this.sets++;

    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing entry
      existingNode.value = value;
      existingNode.lastAccessedAt = Date.now();
      existingNode.accessCount++;
      this.moveToHead(existingNode);
      return;
    }

    // Create new entry
    const newNode = new LRUNode(key, value);
    this.cache.set(key, newNode);
    this.addToHead(newNode);

    // Evict if over capacity
    if (this.cache.size > this.capacity) {
      this.evictLRU();
    }
  }

  /**
   * Check if a key exists
   */
  has(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    if (this.isExpired(node)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific entry
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(key);

    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;

    if (this.trackStats) {
      this.hits = 0;
      this.misses = 0;
      this.evictions = 0;
      this.sets = 0;
    }
  }

  /**
   * Get current size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    // Approximate memory usage
    const avgKeySize = 50; // bytes
    const avgValueSize = 100; // bytes
    const nodeOverhead = 64; // bytes (pointers, metadata)
    const memoryBytes = this.cache.size * (avgKeySize + avgValueSize + nodeOverhead);

    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      evictions: this.evictions,
      sets: this.sets,
      memoryBytes,
    };
  }

  /**
   * Get all keys (oldest to newest)
   */
  keys(): K[] {
    const keys: K[] = [];
    let current = this.tail;

    while (current) {
      keys.push(current.key);
      current = current.prev;
    }

    return keys;
  }

  /**
   * Get all values (oldest to newest)
   */
  values(): V[] {
    const values: V[] = [];
    let current = this.tail;

    while (current) {
      values.push(current.value);
      current = current.prev;
    }

    return values;
  }

  /**
   * Get all entries with metadata
   */
  entries(): Array<[K, CacheEntry<V>]> {
    const entries: Array<[K, CacheEntry<V>]> = [];
    let current = this.tail;

    while (current) {
      entries.push([
        current.key,
        {
          value: current.value,
          createdAt: current.createdAt,
          lastAccessedAt: current.lastAccessedAt,
          accessCount: current.accessCount,
        },
      ]);
      current = current.prev;
    }

    return entries;
  }

  /**
   * Peek without updating LRU order
   */
  peek(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) return undefined;

    if (this.isExpired(node)) {
      this.delete(key);
      return undefined;
    }

    return node.value;
  }

  /**
   * Resize cache capacity
   */
  resize(newCapacity: number): void {
    if (newCapacity <= 0) {
      throw new Error('Cache capacity must be greater than 0');
    }

    this.capacity = newCapacity;

    // Evict entries if new capacity is smaller
    while (this.cache.size > this.capacity) {
      this.evictLRU();
    }
  }

  // ==================== Private Methods ====================

  /**
   * Check if a node is expired
   */
  private isExpired(node: LRUNode<K, V>): boolean {
    if (this.ttl === 0) return false;
    return Date.now() - node.createdAt > this.ttl;
  }

  /**
   * Move node to head (most recently used)
   */
  private moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) return;

    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Add node to head
   */
  private addToHead(node: LRUNode<K, V>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove node from list
   */
  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (!this.tail) return;

    const evicted = this.tail;

    if (this.onEvict) {
      this.onEvict(evicted.key, evicted.value);
    }

    this.removeNode(evicted);
    this.cache.delete(evicted.key);

    if (this.trackStats) this.evictions++;
  }
}
