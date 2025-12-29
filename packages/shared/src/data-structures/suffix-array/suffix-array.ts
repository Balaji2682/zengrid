import type {
  ISuffixArray,
  SuffixArrayOptions,
  SuffixSearchResult,
  SuffixArrayStats,
} from './suffix-array.interface';

/**
 * Suffix Array - Efficient substring search data structure
 *
 * A suffix array is a sorted array of all suffixes of a string.
 * It enables fast substring search in O(m log n) time.
 *
 * **Time Complexity:**
 * - Construction: O(n log² n) where n = text length
 * - Search: O(m log n) where m = pattern length
 * - Count: O(m log n)
 * - Contains: O(m log n)
 *
 * **Space Complexity:** O(n)
 *
 * **Use Cases in Grid:**
 * - Substring search: Find cells containing "phone" (matches "iPhone")
 * - Filter by contains: Show rows where column contains pattern
 * - Autocomplete: Find all values containing typed text
 * - Fuzzy search: Find similar values
 *
 * @example Basic Usage
 * ```typescript
 * const sa = new SuffixArray("banana");
 *
 * // Search for pattern
 * const positions = sa.search("ana");
 * console.log(positions); // [1, 3] - "banana" has "ana" at positions 1 and 3
 *
 * // Check if contains
 * console.log(sa.contains("nan")); // true
 * console.log(sa.contains("xyz")); // false
 *
 * // Count occurrences
 * console.log(sa.count("ana")); // 2
 * ```
 *
 * @example Grid Integration
 * ```typescript
 * // Index a column for substring search
 * const columnData = grid.getColumn(0); // ["Apple iPhone", "Samsung Galaxy", ...]
 * const combinedText = columnData.join("\0"); // Use null separator
 * const sa = new SuffixArray(combinedText);
 *
 * // Find all cells containing "phone"
 * const positions = sa.search("phone");
 * // Convert positions back to row indices
 * ```
 */
export class SuffixArray implements ISuffixArray {
  private text: string;
  private suffixArray: number[];
  private lcp: number[] | null = null;
  private options: Required<SuffixArrayOptions>;

  constructor(text: string, options: SuffixArrayOptions = {}) {
    this.options = {
      caseSensitive: options.caseSensitive ?? false,
      buildLCP: options.buildLCP ?? true,
    };

    // Normalize text if case-insensitive
    this.text = this.options.caseSensitive ? text : text.toLowerCase();

    // Build suffix array
    this.suffixArray = this.buildSuffixArray();

    // Build LCP array if requested
    if (this.options.buildLCP) {
      this.lcp = this.buildLCPArray();
    }
  }

  /**
   * Search for a pattern in the text
   */
  search(pattern: string): number[] {
    if (!pattern) return [];

    const normalizedPattern = this.options.caseSensitive ? pattern : pattern.toLowerCase();
    const range = this.findRange(normalizedPattern);

    if (range === null) return [];

    const positions: number[] = [];
    for (let i = range.left; i <= range.right; i++) {
      positions.push(this.suffixArray[i]);
    }

    return positions.sort((a, b) => a - b);
  }

  /**
   * Search with context
   */
  searchWithContext(pattern: string, contextLength: number = 20): SuffixSearchResult[] {
    const positions = this.search(pattern);
    const results: SuffixSearchResult[] = [];

    for (const pos of positions) {
      const start = Math.max(0, pos - contextLength);
      const end = Math.min(this.text.length, pos + pattern.length + contextLength);
      const context = this.text.substring(start, end);

      results.push({
        position: pos,
        match: this.text.substring(pos, pos + pattern.length),
        context,
      });
    }

    return results;
  }

  /**
   * Count occurrences of a pattern
   */
  count(pattern: string): number {
    if (!pattern) return 0;

    const normalizedPattern = this.options.caseSensitive ? pattern : pattern.toLowerCase();
    const range = this.findRange(normalizedPattern);

    if (range === null) return 0;

    return range.right - range.left + 1;
  }

  /**
   * Check if pattern exists
   */
  contains(pattern: string): boolean {
    if (!pattern) return false;

    const normalizedPattern = this.options.caseSensitive ? pattern : pattern.toLowerCase();
    return this.findRange(normalizedPattern) !== null;
  }

  /**
   * Find the longest repeated substring using LCP array
   */
  longestRepeatedSubstring(): string {
    if (!this.lcp || this.lcp.length === 0) {
      this.lcp = this.buildLCPArray();
    }

    let maxLen = 0;
    let maxPos = 0;

    for (let i = 0; i < this.lcp.length; i++) {
      if (this.lcp[i] > maxLen) {
        maxLen = this.lcp[i];
        maxPos = this.suffixArray[i];
      }
    }

    return this.text.substring(maxPos, maxPos + maxLen);
  }

  /**
   * Get all unique substrings of a given length
   */
  uniqueSubstrings(length: number): string[] {
    if (length <= 0 || length > this.text.length) return [];

    const substrings = new Set<string>();

    for (let i = 0; i <= this.text.length - length; i++) {
      substrings.add(this.text.substring(i, i + length));
    }

    return Array.from(substrings);
  }

  /**
   * Get statistics
   */
  getStats(): SuffixArrayStats {
    const textBytes = this.text.length * 2; // ~2 bytes per char in UTF-16
    const suffixArrayBytes = this.suffixArray.length * 4; // 4 bytes per int
    const lcpBytes = this.lcp ? this.lcp.length * 4 : 0;

    return {
      textLength: this.text.length,
      suffixCount: this.suffixArray.length,
      memoryBytes: textBytes + suffixArrayBytes + lcpBytes,
      hasLCP: this.lcp !== null,
    };
  }

  /**
   * Clear the suffix array
   */
  clear(): void {
    this.text = '';
    this.suffixArray = [];
    this.lcp = null;
  }

  // ==================== Private Methods ====================

  /**
   * Build suffix array using simple O(n log² n) algorithm
   */
  private buildSuffixArray(): number[] {
    const n = this.text.length;
    const suffixes: number[] = [];

    // Create array of suffix indices
    for (let i = 0; i < n; i++) {
      suffixes.push(i);
    }

    // Sort suffixes lexicographically
    suffixes.sort((a, b) => {
      return this.text.substring(a).localeCompare(this.text.substring(b));
    });

    return suffixes;
  }

  /**
   * Build LCP (Longest Common Prefix) array using Kasai's algorithm
   * Time: O(n)
   */
  private buildLCPArray(): number[] {
    const n = this.text.length;
    const lcp = new Array(n).fill(0);
    const rank = new Array(n).fill(0);

    // Build rank array (inverse of suffix array)
    for (let i = 0; i < n; i++) {
      rank[this.suffixArray[i]] = i;
    }

    let h = 0;
    for (let i = 0; i < n; i++) {
      if (rank[i] > 0) {
        const j = this.suffixArray[rank[i] - 1];

        // Calculate LCP between suffix i and suffix j
        while (i + h < n && j + h < n && this.text[i + h] === this.text[j + h]) {
          h++;
        }

        lcp[rank[i]] = h;

        if (h > 0) h--;
      }
    }

    return lcp;
  }

  /**
   * Binary search to find range of suffixes that start with pattern
   */
  private findRange(pattern: string): { left: number; right: number } | null {
    const n = this.suffixArray.length;
    const m = pattern.length;

    // Find leftmost occurrence
    let left = 0;
    let right = n - 1;
    let leftBound = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const suffix = this.text.substring(this.suffixArray[mid], this.suffixArray[mid] + m);

      if (suffix >= pattern) {
        if (suffix === pattern) leftBound = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    if (leftBound === -1) return null;

    // Find rightmost occurrence
    left = 0;
    right = n - 1;
    let rightBound = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const suffix = this.text.substring(this.suffixArray[mid], this.suffixArray[mid] + m);

      if (suffix <= pattern) {
        if (suffix === pattern) rightBound = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return { left: leftBound, right: rightBound };
  }
}
