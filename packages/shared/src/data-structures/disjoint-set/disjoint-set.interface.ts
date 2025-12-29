/**
 * Disjoint Set (Union-Find) interfaces for ZenGrid
 * Efficient data structure for managing merged cells and connected components
 */

/**
 * Disjoint Set statistics
 */
export interface DisjointSetStats {
  /** Total number of elements */
  totalElements: number;
  /** Number of disjoint sets */
  numSets: number;
  /** Size of the largest set */
  largestSetSize: number;
  /** Average set size */
  averageSetSize: number;
  /** Memory usage estimate in bytes */
  memoryBytes: number;
}

/**
 * Disjoint Set interface (Union-Find)
 *
 * A data structure for tracking a partition of elements into disjoint sets.
 * Uses path compression and union by rank for near-constant time operations.
 *
 * Use cases:
 * - Managing merged cells in spreadsheets
 * - Tracking connected components in graphs
 * - Detecting cycles in undirected graphs
 * - Kruskal's minimum spanning tree algorithm
 * - Image segmentation
 * - Network connectivity
 *
 * Performance:
 * - makeSet: O(1)
 * - find: O(α(n)) amortized, where α is inverse Ackermann function (effectively O(1))
 * - union: O(α(n)) amortized
 * - connected: O(α(n)) amortized
 * - Space: O(n)
 *
 * Optimizations:
 * - Path compression: Makes find operations extremely fast
 * - Union by rank: Keeps trees shallow for better performance
 * - Both optimizations together give near-constant time complexity
 */
export interface IDisjointSet<T> {
  /**
   * Create a new set containing only the given element
   * If element already exists, this is a no-op
   * @param element - The element to create a set for
   * @complexity O(1)
   */
  makeSet(element: T): void;

  /**
   * Find the representative (root) of the set containing the element
   * Uses path compression to optimize future queries
   * @param element - The element to find
   * @returns The representative element, or undefined if element doesn't exist
   * @complexity O(α(n)) amortized
   */
  find(element: T): T | undefined;

  /**
   * Unite the sets containing two elements
   * Uses union by rank to keep trees shallow
   * @param element1 - First element
   * @param element2 - Second element
   * @returns true if sets were merged, false if already in same set or element doesn't exist
   * @complexity O(α(n)) amortized
   */
  union(element1: T, element2: T): boolean;

  /**
   * Check if two elements are in the same set
   * @param element1 - First element
   * @param element2 - Second element
   * @returns true if both elements exist and are in the same set
   * @complexity O(α(n)) amortized
   */
  connected(element1: T, element2: T): boolean;

  /**
   * Get the size of the set containing the element
   * @param element - The element to query
   * @returns Size of the set, or 0 if element doesn't exist
   * @complexity O(α(n)) amortized
   */
  getSetSize(element: T): number;

  /**
   * Get all disjoint sets
   * @returns Map from representative element to array of all elements in that set
   * @complexity O(n)
   */
  getSets(): Map<T, T[]>;

  /**
   * Get all elements in the same set as the given element
   * @param element - The element to query
   * @returns Array of all elements in the same set, or empty array if element doesn't exist
   * @complexity O(n) - needs to scan all elements
   */
  getSet(element: T): T[];

  /**
   * Check if an element exists in the data structure
   * @param element - The element to check
   * @complexity O(1)
   */
  has(element: T): boolean;

  /**
   * Remove an element from the data structure
   * Note: This is not a standard operation for Disjoint Set and has O(n) complexity
   * @param element - The element to remove
   * @returns true if element was found and removed
   * @complexity O(n)
   */
  remove(element: T): boolean;

  /**
   * Clear all sets
   * @complexity O(1)
   */
  clear(): void;

  /**
   * Get all elements
   * @returns Array of all elements
   * @complexity O(n)
   */
  elements(): T[];

  /**
   * Get statistics about the disjoint set
   */
  getStats(): DisjointSetStats;

  /**
   * Number of elements in the data structure
   */
  readonly size: number;

  /**
   * Number of disjoint sets
   */
  readonly numSets: number;

  /**
   * Whether the data structure is empty
   */
  readonly isEmpty: boolean;
}

/**
 * Options for creating a Disjoint Set
 */
export interface DisjointSetOptions<T> {
  /**
   * Custom hash function for elements
   * If not provided, uses JSON.stringify for objects or toString for primitives
   */
  hashFn?: (element: T) => string | number;

  /**
   * Custom equality function
   * If not provided, uses strict equality (===)
   */
  equalityFn?: (a: T, b: T) => boolean;

  /**
   * Initial elements to create sets for
   */
  initialElements?: T[];
}

/**
 * Utility functions for Disjoint Set
 */
export const DisjointSetUtils = {
  /**
   * Calculate expected memory usage
   * @param n - Number of elements
   * @returns Estimated memory in bytes
   */
  estimateMemory(n: number): number {
    // parent map + rank map + size map
    const bytesPerEntry = 32; // approximate overhead per map entry
    const maps = 3;
    return n * bytesPerEntry * maps;
  },

  /**
   * Check if operations are effectively O(1)
   * For practical purposes, α(n) ≤ 4 for any realistic n
   */
  inverseAckermann(n: number): number {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    if (n <= 3) return 2;
    if (n <= 7) return 3;
    // For n > 7, α(n) = 4
    // For n > 2^2047 (astronomical number), α(n) = 5
    return 4;
  },

  /**
   * Create a grid coordinate hash function for merged cells
   * Useful for grid applications where elements are [row, col] coordinates
   */
  gridHashFn(element: [number, number]): string {
    return `${element[0]},${element[1]}`;
  },

  /**
   * Create equality function for grid coordinates
   */
  gridEqualityFn(a: [number, number], b: [number, number]): boolean {
    return a[0] === b[0] && a[1] === b[1];
  },
};
