/**
 * IndexMap interfaces for ZenGrid
 * Provides O(1) bidirectional lookup: key → value, index → entry, and optionally value → key
 */

/**
 * Entry in the IndexMap containing both key and value
 */
export interface IndexMapEntry<K, V> {
  key: K;
  value: V;
  index: number;
}

/**
 * IndexMap interface
 *
 * A data structure that combines the benefits of Map and Array:
 * - O(1) key → value lookup (like Map)
 * - O(1) index → entry lookup (like Array)
 * - O(1) key → index lookup
 * - Maintains insertion order
 * - Optional O(1) value → key reverse lookup
 *
 * Use cases:
 * - Column/row mappings where you need both name and index access
 * - Ordered collections with fast lookup by both key and position
 * - Maintaining insertion order while allowing random access
 */
export interface IIndexMap<K, V> {
  /**
   * Set a key-value pair
   * If key exists, updates the value without changing index
   * If key is new, appends to the end
   * @param key - The key
   * @param value - The value
   * @returns The index of the entry
   * @complexity O(1)
   */
  set(key: K, value: V): number;

  /**
   * Get value by key
   * @param key - The key to look up
   * @returns The value or undefined if not found
   * @complexity O(1)
   */
  get(key: K): V | undefined;

  /**
   * Get entry by index
   * @param index - The index (0-based)
   * @returns The entry or undefined if out of bounds
   * @complexity O(1)
   */
  getByIndex(index: number): IndexMapEntry<K, V> | undefined;

  /**
   * Get key by index
   * @param index - The index (0-based)
   * @returns The key or undefined if out of bounds
   * @complexity O(1)
   */
  getKeyByIndex(index: number): K | undefined;

  /**
   * Get value by index
   * @param index - The index (0-based)
   * @returns The value or undefined if out of bounds
   * @complexity O(1)
   */
  getValueByIndex(index: number): V | undefined;

  /**
   * Get the index of a key
   * @param key - The key to look up
   * @returns The index or -1 if not found
   * @complexity O(1)
   */
  indexOf(key: K): number;

  /**
   * Get the key(s) for a given value (reverse lookup)
   * Only available when enableReverseMapping is true
   * @param value - The value to find
   * @returns Array of keys that map to this value (empty if not found or reverse mapping disabled)
   * @complexity O(1) if reverse mapping enabled, O(n) if disabled
   */
  getKeysByValue(value: V): K[];

  /**
   * Check if a key exists
   * @param key - The key to check
   * @complexity O(1)
   */
  has(key: K): boolean;

  /**
   * Check if a value exists
   * @param value - The value to check
   * @complexity O(1) if reverse mapping enabled, O(n) if disabled
   */
  hasValue(value: V): boolean;

  /**
   * Delete an entry by key
   * Reindexes all subsequent entries
   * @param key - The key to delete
   * @returns true if the entry existed and was deleted
   * @complexity O(n) due to reindexing
   */
  delete(key: K): boolean;

  /**
   * Delete an entry by index
   * Reindexes all subsequent entries
   * @param index - The index to delete
   * @returns true if the index was valid and entry was deleted
   * @complexity O(n) due to reindexing
   */
  deleteByIndex(index: number): boolean;

  /**
   * Clear all entries
   * @complexity O(1)
   */
  clear(): void;

  /**
   * Get all keys in insertion order
   * @returns Array of keys
   * @complexity O(n)
   */
  keys(): K[];

  /**
   * Get all values in insertion order
   * @returns Array of values
   * @complexity O(n)
   */
  values(): V[];

  /**
   * Get all entries in insertion order
   * @returns Array of [key, value] tuples
   * @complexity O(n)
   */
  entries(): [K, V][];

  /**
   * Iterate over entries
   * @param callback - Function to call for each entry
   * @complexity O(n)
   */
  forEach(callback: (value: V, key: K, index: number) => void): void;

  /**
   * Find the first key that satisfies a predicate
   * @param predicate - Test function
   * @returns The key or undefined
   * @complexity O(n)
   */
  find(predicate: (value: V, key: K, index: number) => boolean): K | undefined;

  /**
   * Filter entries by a predicate
   * @param predicate - Test function
   * @returns New IndexMap with entries that pass the test
   * @complexity O(n)
   */
  filter(predicate: (value: V, key: K, index: number) => boolean): IIndexMap<K, V>;

  /**
   * Map values to a new IndexMap
   * @param mapper - Transform function
   * @returns New IndexMap with transformed values
   * @complexity O(n)
   */
  map<U>(mapper: (value: V, key: K, index: number) => U): IIndexMap<K, U>;

  /**
   * Number of entries
   */
  readonly size: number;

  /**
   * Whether reverse value → key mapping is enabled
   */
  readonly hasReverseMapping: boolean;
}

/**
 * Options for creating an IndexMap
 */
export interface IndexMapOptions {
  /**
   * Enable bidirectional value → key lookup
   * Maintains a reverse map for O(1) value → key queries
   * Increases memory usage but enables fast reverse lookups
   * @default false
   */
  enableReverseMapping?: boolean;

  /**
   * Initial capacity hint for optimization
   * @default 16
   */
  initialCapacity?: number;
}
