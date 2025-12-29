/**
 * Suffix Array Interface
 *
 * Used for:
 * - Fast substring search in O(m log n) time where m = pattern length, n = text length
 * - Pattern matching in grid cell values
 * - "Contains" filtering without scanning all rows
 */

/**
 * Search result from suffix array
 */
export interface SuffixSearchResult {
  /**
   * Starting position of the match in the original text
   */
  position: number;

  /**
   * The matched substring
   */
  match: string;

  /**
   * Context around the match (if available)
   */
  context?: string;
}

/**
 * Suffix Array options
 */
export interface SuffixArrayOptions {
  /**
   * Case-sensitive search
   * @default false
   */
  caseSensitive?: boolean;

  /**
   * Build LCP (Longest Common Prefix) array for advanced queries
   * @default true
   */
  buildLCP?: boolean;
}

/**
 * Suffix Array statistics
 */
export interface SuffixArrayStats {
  /**
   * Length of the original text
   */
  textLength: number;

  /**
   * Number of suffixes
   */
  suffixCount: number;

  /**
   * Memory usage in bytes (approximate)
   */
  memoryBytes: number;

  /**
   * Whether LCP array is built
   */
  hasLCP: boolean;
}

/**
 * Suffix Array interface
 */
export interface ISuffixArray {
  /**
   * Search for a pattern in the text
   *
   * @param pattern - Pattern to search for
   * @returns Array of positions where pattern occurs
   */
  search(pattern: string): number[];

  /**
   * Search for a pattern and return detailed results
   *
   * @param pattern - Pattern to search for
   * @param contextLength - Number of characters to include before/after match
   * @returns Array of search results with context
   */
  searchWithContext(pattern: string, contextLength?: number): SuffixSearchResult[];

  /**
   * Count occurrences of a pattern
   *
   * @param pattern - Pattern to count
   * @returns Number of occurrences
   */
  count(pattern: string): number;

  /**
   * Check if pattern exists in the text
   *
   * @param pattern - Pattern to check
   * @returns True if pattern exists
   */
  contains(pattern: string): boolean;

  /**
   * Find the longest repeated substring
   *
   * @returns The longest repeated substring
   */
  longestRepeatedSubstring(): string;

  /**
   * Get all unique substrings of a given length
   *
   * @param length - Length of substrings
   * @returns Array of unique substrings
   */
  uniqueSubstrings(length: number): string[];

  /**
   * Get statistics about the suffix array
   */
  getStats(): SuffixArrayStats;

  /**
   * Clear the suffix array
   */
  clear(): void;
}
