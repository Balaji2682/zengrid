/**
 * IndexMap implementation
 * Provides O(1) bidirectional lookup with maintained insertion order
 */

import type { IIndexMap, IndexMapEntry, IndexMapOptions } from './index-map.interface';

/**
 * IndexMap - A hybrid data structure combining Map and Array benefits
 *
 * Features:
 * - O(1) key → value lookup
 * - O(1) index → entry lookup
 * - O(1) key → index lookup
 * - Optional O(1) value → key reverse lookup
 * - Maintains insertion order
 *
 * Implementation:
 * - Uses Map for key → {value, index} mapping
 * - Uses Array for index → {key, value} mapping
 * - Optional Map for value → key[] reverse mapping
 *
 * @example
 * ```typescript
 * const map = new IndexMap<string, number>();
 * map.set('a', 1); // index 0
 * map.set('b', 2); // index 1
 * map.set('c', 3); // index 2
 *
 * map.get('b');           // 2
 * map.getByIndex(1);      // { key: 'b', value: 2, index: 1 }
 * map.indexOf('c');       // 2
 * map.getValueByIndex(0); // 1
 * ```
 */
export class IndexMap<K, V> implements IIndexMap<K, V> {
  private keyToData: Map<K, { value: V; index: number }>;
  private indexToEntry: Array<{ key: K; value: V }>;
  private valueToKeys?: Map<V, Set<K>>;
  private readonly reverseMapping: boolean;

  constructor(options: IndexMapOptions = {}) {
    const { enableReverseMapping = false, initialCapacity = 16 } = options;

    this.reverseMapping = enableReverseMapping;
    this.keyToData = new Map();
    this.indexToEntry = [];

    if (this.reverseMapping) {
      this.valueToKeys = new Map();
    }

    // Pre-allocate array capacity if hint provided
    if (initialCapacity > 0) {
      this.indexToEntry.length = 0;
    }
  }

  /**
   * Set a key-value pair
   */
  set(key: K, value: V): number {
    const existing = this.keyToData.get(key);

    if (existing !== undefined) {
      // Key exists - update value without changing index
      const oldValue = existing.value;
      const index = existing.index;

      // Update key → data mapping
      this.keyToData.set(key, { value, index });

      // Update index → entry mapping
      this.indexToEntry[index] = { key, value };

      // Update reverse mapping if enabled
      if (this.reverseMapping && this.valueToKeys) {
        // Remove old value mapping
        const oldKeys = this.valueToKeys.get(oldValue);
        if (oldKeys) {
          oldKeys.delete(key);
          if (oldKeys.size === 0) {
            this.valueToKeys.delete(oldValue);
          }
        }

        // Add new value mapping
        if (!this.valueToKeys.has(value)) {
          this.valueToKeys.set(value, new Set());
        }
        this.valueToKeys.get(value)!.add(key);
      }

      return index;
    } else {
      // New key - append to end
      const index = this.indexToEntry.length;

      // Add to key → data mapping
      this.keyToData.set(key, { value, index });

      // Add to index → entry mapping
      this.indexToEntry.push({ key, value });

      // Add to reverse mapping if enabled
      if (this.reverseMapping && this.valueToKeys) {
        if (!this.valueToKeys.has(value)) {
          this.valueToKeys.set(value, new Set());
        }
        this.valueToKeys.get(value)!.add(key);
      }

      return index;
    }
  }

  /**
   * Get value by key
   */
  get(key: K): V | undefined {
    const data = this.keyToData.get(key);
    return data?.value;
  }

  /**
   * Get entry by index
   */
  getByIndex(index: number): IndexMapEntry<K, V> | undefined {
    if (index < 0 || index >= this.indexToEntry.length) {
      return undefined;
    }

    const entry = this.indexToEntry[index];
    return {
      key: entry.key,
      value: entry.value,
      index,
    };
  }

  /**
   * Get key by index
   */
  getKeyByIndex(index: number): K | undefined {
    if (index < 0 || index >= this.indexToEntry.length) {
      return undefined;
    }
    return this.indexToEntry[index].key;
  }

  /**
   * Get value by index
   */
  getValueByIndex(index: number): V | undefined {
    if (index < 0 || index >= this.indexToEntry.length) {
      return undefined;
    }
    return this.indexToEntry[index].value;
  }

  /**
   * Get the index of a key
   */
  indexOf(key: K): number {
    const data = this.keyToData.get(key);
    return data !== undefined ? data.index : -1;
  }

  /**
   * Reverse lookup: get key(s) by value
   */
  getKeysByValue(value: V): K[] {
    if (this.reverseMapping && this.valueToKeys) {
      const keys = this.valueToKeys.get(value);
      return keys ? Array.from(keys) : [];
    } else {
      // Fallback: O(n) linear search
      const result: K[] = [];
      for (const entry of this.indexToEntry) {
        if (entry.value === value) {
          result.push(entry.key);
        }
      }
      return result;
    }
  }

  /**
   * Check if a key exists
   */
  has(key: K): boolean {
    return this.keyToData.has(key);
  }

  /**
   * Check if a value exists
   */
  hasValue(value: V): boolean {
    if (this.reverseMapping && this.valueToKeys) {
      return this.valueToKeys.has(value);
    } else {
      // Fallback: O(n) linear search
      return this.indexToEntry.some((entry) => entry.value === value);
    }
  }

  /**
   * Delete an entry by key
   * Reindexes all subsequent entries
   */
  delete(key: K): boolean {
    const data = this.keyToData.get(key);
    if (data === undefined) {
      return false;
    }

    const { value, index } = data;

    // Remove from key → data mapping
    this.keyToData.delete(key);

    // Remove from index → entry mapping
    this.indexToEntry.splice(index, 1);

    // Update indices for all entries after the deleted one
    for (let i = index; i < this.indexToEntry.length; i++) {
      const entry = this.indexToEntry[i];
      const entryData = this.keyToData.get(entry.key);
      if (entryData) {
        this.keyToData.set(entry.key, { value: entryData.value, index: i });
      }
    }

    // Remove from reverse mapping if enabled
    if (this.reverseMapping && this.valueToKeys) {
      const keys = this.valueToKeys.get(value);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.valueToKeys.delete(value);
        }
      }
    }

    return true;
  }

  /**
   * Delete an entry by index
   */
  deleteByIndex(index: number): boolean {
    if (index < 0 || index >= this.indexToEntry.length) {
      return false;
    }

    const key = this.indexToEntry[index].key;
    return this.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.keyToData.clear();
    this.indexToEntry = [];
    if (this.reverseMapping && this.valueToKeys) {
      this.valueToKeys.clear();
    }
  }

  /**
   * Get all keys in insertion order
   */
  keys(): K[] {
    return this.indexToEntry.map((entry) => entry.key);
  }

  /**
   * Get all values in insertion order
   */
  values(): V[] {
    return this.indexToEntry.map((entry) => entry.value);
  }

  /**
   * Get all entries in insertion order
   */
  entries(): [K, V][] {
    return this.indexToEntry.map((entry) => [entry.key, entry.value]);
  }

  /**
   * Iterate over entries
   */
  forEach(callback: (value: V, key: K, index: number) => void): void {
    this.indexToEntry.forEach((entry, index) => {
      callback(entry.value, entry.key, index);
    });
  }

  /**
   * Find the first key that satisfies a predicate
   */
  find(predicate: (value: V, key: K, index: number) => boolean): K | undefined {
    for (let i = 0; i < this.indexToEntry.length; i++) {
      const entry = this.indexToEntry[i];
      if (predicate(entry.value, entry.key, i)) {
        return entry.key;
      }
    }
    return undefined;
  }

  /**
   * Filter entries by a predicate
   */
  filter(predicate: (value: V, key: K, index: number) => boolean): IIndexMap<K, V> {
    const result = new IndexMap<K, V>({
      enableReverseMapping: this.reverseMapping,
    });

    this.indexToEntry.forEach((entry, index) => {
      if (predicate(entry.value, entry.key, index)) {
        result.set(entry.key, entry.value);
      }
    });

    return result;
  }

  /**
   * Map values to a new IndexMap
   */
  map<U>(mapper: (value: V, key: K, index: number) => U): IIndexMap<K, U> {
    const result = new IndexMap<K, U>({
      enableReverseMapping: this.reverseMapping,
    });

    this.indexToEntry.forEach((entry, index) => {
      const newValue = mapper(entry.value, entry.key, index);
      result.set(entry.key, newValue);
    });

    return result;
  }

  /**
   * Number of entries
   */
  get size(): number {
    return this.indexToEntry.length;
  }

  /**
   * Whether reverse mapping is enabled
   */
  get hasReverseMapping(): boolean {
    return this.reverseMapping;
  }

  /**
   * Create IndexMap from an array of entries
   */
  static from<K, V>(
    entries: Iterable<[K, V]>,
    options?: IndexMapOptions
  ): IndexMap<K, V> {
    const map = new IndexMap<K, V>(options);
    for (const [key, value] of entries) {
      map.set(key, value);
    }
    return map;
  }

  /**
   * Create IndexMap from a regular Map
   */
  static fromMap<K, V>(
    source: Map<K, V>,
    options?: IndexMapOptions
  ): IndexMap<K, V> {
    return IndexMap.from(source.entries(), options);
  }

  /**
   * Create IndexMap from an object
   */
  static fromObject<V>(
    obj: Record<string, V>,
    options?: IndexMapOptions
  ): IndexMap<string, V> {
    const map = new IndexMap<string, V>(options);
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
    return map;
  }

  /**
   * Convert to a plain object (only works with string keys)
   */
  toObject(): Record<string, V> {
    const result: Record<string, V> = {};
    this.indexToEntry.forEach((entry) => {
      result[entry.key as unknown as string] = entry.value;
    });
    return result;
  }

  /**
   * Convert to a regular Map
   */
  toMap(): Map<K, V> {
    return new Map(this.entries());
  }

  /**
   * Get a string representation for debugging
   */
  toString(): string {
    return `IndexMap(${this.size}) { ${this.entries()
      .map(([k, v]) => `${String(k)}: ${String(v)}`)
      .join(', ')} }`;
  }
}
