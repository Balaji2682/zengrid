/**
 * Skip List interfaces for ZenGrid
 * Probabilistic data structure for efficient sorted data management
 */

import type { Comparator } from '../../types';

/**
 * Skip List Node representing a key-value pair at a specific level
 */
export interface SkipListNode<K, V> {
  key: K;
  value: V;
  forward: Array<SkipListNode<K, V> | null>;
}

/**
 * Range query result
 */
export interface RangeResult<K, V> {
  key: K;
  value: V;
}

/**
 * Skip List statistics
 */
export interface SkipListStats {
  /** Total number of entries */
  size: number;
  /** Current maximum level */
  level: number;
  /** Maximum allowed levels */
  maxLevel: number;
  /** Average level of nodes */
  averageLevel: number;
  /** Memory usage estimate in bytes */
  memoryBytes: number;
}

/**
 * Skip List interface
 *
 * A probabilistic alternative to balanced trees that maintains sorted data.
 * Uses multiple levels of linked lists with exponentially decreasing probability.
 *
 * Use cases:
 * - Sorted column data in grids
 * - Maintaining sorted indices
 * - Range queries on sorted data
 * - Finding kth smallest/largest element
 * - Ordered iteration
 * - Implementing sorted maps/sets
 *
 * Performance:
 * - Search: O(log n) average, O(n) worst case
 * - Insert: O(log n) average, O(n) worst case
 * - Delete: O(log n) average, O(n) worst case
 * - Range query: O(log n + k) where k = results
 * - Space: O(n log n) average
 *
 * Advantages over balanced trees:
 * - Simpler implementation (no rotations)
 * - Better cache locality
 * - Lock-free concurrent implementation possible
 * - Predictable performance (no worst-case rebalancing)
 */
export interface ISkipList<K, V> {
  /**
   * Insert or update a key-value pair
   * @param key - The key to insert
   * @param value - The value to associate with the key
   * @returns The previous value if key existed, undefined otherwise
   * @complexity O(log n) average
   */
  set(key: K, value: V): V | undefined;

  /**
   * Get the value associated with a key
   * @param key - The key to search for
   * @returns The value if found, undefined otherwise
   * @complexity O(log n) average
   */
  get(key: K): V | undefined;

  /**
   * Check if a key exists in the skip list
   * @param key - The key to check
   * @complexity O(log n) average
   */
  has(key: K): boolean;

  /**
   * Delete a key-value pair
   * @param key - The key to delete
   * @returns true if the key was found and deleted
   * @complexity O(log n) average
   */
  delete(key: K): boolean;

  /**
   * Get all entries in sorted order
   * @returns Array of [key, value] tuples
   * @complexity O(n)
   */
  entries(): Array<[K, V]>;

  /**
   * Get all keys in sorted order
   * @returns Array of keys
   * @complexity O(n)
   */
  keys(): K[];

  /**
   * Get all values in sorted order by key
   * @returns Array of values
   * @complexity O(n)
   */
  values(): V[];

  /**
   * Get range of entries between two keys (inclusive)
   * @param startKey - Start of range (inclusive)
   * @param endKey - End of range (inclusive)
   * @returns Array of entries in range
   * @complexity O(log n + k) where k = results
   */
  range(startKey: K, endKey: K): RangeResult<K, V>[];

  /**
   * Get the minimum (first) entry
   * @returns The minimum entry or undefined if empty
   * @complexity O(1)
   */
  min(): RangeResult<K, V> | undefined;

  /**
   * Get the maximum (last) entry
   * @returns The maximum entry or undefined if empty
   * @complexity O(log n)
   */
  max(): RangeResult<K, V> | undefined;

  /**
   * Get the kth smallest entry (0-indexed)
   * @param k - Index (0 = smallest)
   * @returns The kth entry or undefined if k >= size
   * @complexity O(k) - could be improved to O(log n) with span tracking
   */
  getKth(k: number): RangeResult<K, V> | undefined;

  /**
   * Count entries in a range
   * @param startKey - Start of range (inclusive)
   * @param endKey - End of range (inclusive)
   * @complexity O(log n + k) where k = count
   */
  countRange(startKey: K, endKey: K): number;

  /**
   * Find the closest key less than or equal to the given key
   * @param key - The key to search for
   * @returns The floor entry or undefined if no such key exists
   * @complexity O(log n)
   */
  floor(key: K): RangeResult<K, V> | undefined;

  /**
   * Find the closest key greater than or equal to the given key
   * @param key - The key to search for
   * @returns The ceiling entry or undefined if no such key exists
   * @complexity O(log n)
   */
  ceiling(key: K): RangeResult<K, V> | undefined;

  /**
   * Iterate over all entries in sorted order
   * @param callback - Function to call for each entry
   * @complexity O(n)
   */
  forEach(callback: (value: V, key: K) => void): void;

  /**
   * Clear all entries
   * @complexity O(1)
   */
  clear(): void;

  /**
   * Get statistics about the skip list
   */
  getStats(): SkipListStats;

  /**
   * Number of entries in the skip list
   */
  readonly size: number;

  /**
   * Whether the skip list is empty
   */
  readonly isEmpty: boolean;
}

/**
 * Options for creating a Skip List
 */
export interface SkipListOptions<K> {
  /**
   * Custom comparator function
   * Defaults to natural ordering for numbers/strings
   */
  comparator?: Comparator<K>;

  /**
   * Maximum number of levels
   * @default 32 (supports ~4 billion elements efficiently)
   */
  maxLevel?: number;

  /**
   * Probability for level increase
   * @default 0.5 (standard Skip List probability)
   */
  probability?: number;
}

/**
 * Default comparator for common types
 */
export function defaultComparator<K>(a: K, b: K): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Utility functions for Skip List
 */
export const SkipListUtils = {
  /**
   * Calculate expected maximum level for n elements
   */
  expectedMaxLevel(n: number, probability: number = 0.5): number {
    return Math.ceil(Math.log(n) / Math.log(1 / probability));
  },

  /**
   * Calculate expected number of nodes at level i
   */
  expectedNodesAtLevel(n: number, level: number, probability: number = 0.5): number {
    return n * Math.pow(probability, level);
  },

  /**
   * Calculate expected memory usage
   */
  estimateMemory(n: number, _maxLevel: number, probability: number = 0.5): number {
    // Node overhead + average pointers per node
    const avgPointersPerNode = 1 / (1 - probability);
    const bytesPerPointer = 8; // 64-bit pointer
    const bytesPerNode = 32; // key, value, metadata
    return n * (bytesPerNode + avgPointersPerNode * bytesPerPointer);
  },
};
