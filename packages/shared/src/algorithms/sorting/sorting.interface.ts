/**
 * Position for null/undefined values in sort order
 */
export type NullPosition = 'first' | 'last' | 'natural';

/**
 * Options for Timsort algorithm
 */
export interface TimsortOptions {
  /**
   * Minimum run length for merge sort
   * Smaller values = more merges, larger values = more insertions
   * Default: 32 (optimal for most cases)
   */
  minRun?: number;

  /**
   * Whether to use stable sorting
   * Default: true
   */
  stable?: boolean;
}

/**
 * Result of a sort operation with metadata
 */
export interface SortMetadata {
  /**
   * Time taken in milliseconds
   */
  duration: number;

  /**
   * Number of comparisons performed
   */
  comparisons?: number;

  /**
   * Number of swaps/moves performed
   */
  swaps?: number;
}
