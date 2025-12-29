/**
 * Filter Autocomplete using Trie
 *
 * Provides fast autocomplete suggestions for column filters.
 */

import { Trie } from '@zengrid/shared/data-structures/trie';

/**
 * FilterAutocomplete - Column filter autocomplete using Trie
 *
 * Indexes unique column values for fast prefix-based autocomplete.
 *
 * @example
 * ```typescript
 * const autocomplete = new FilterAutocomplete();
 *
 * // Index column 0 with product names
 * autocomplete.indexColumn(0, [
 *   'Apple iPhone 14',
 *   'Apple MacBook Pro',
 *   'Samsung Galaxy S23'
 * ]);
 *
 * // Get suggestions as user types
 * const suggestions = autocomplete.getSuggestions(0, 'app');
 * // ['apple iphone 14', 'apple macbook pro']
 * ```
 */
export class FilterAutocomplete {
  private columnTries: Map<number, Trie> = new Map();

  /**
   * Index all unique values in a column for autocomplete
   *
   * @param col - Column index
   * @param values - All values in the column
   */
  indexColumn(col: number, values: any[]): void {
    const trie = new Trie({
      caseSensitive: false,
      maxSuggestions: 10,
    });

    // Add unique values to trie
    const uniqueValues = new Set(values.map(v => String(v ?? '')));
    uniqueValues.forEach(value => {
      if (value) trie.insert(value);
    });

    this.columnTries.set(col, trie);
  }

  /**
   * Get autocomplete suggestions as user types
   *
   * @param col - Column index
   * @param prefix - User's input prefix
   * @param maxResults - Maximum number of suggestions
   * @returns Array of suggestions
   */
  getSuggestions(col: number, prefix: string, maxResults: number = 10): string[] {
    const trie = this.columnTries.get(col);
    if (!trie || !prefix) return [];

    return trie.autocomplete(prefix, maxResults);
  }

  /**
   * Check if value exists in column (for validation)
   *
   * @param col - Column index
   * @param value - Value to check
   * @returns true if value exists
   */
  hasValue(col: number, value: string): boolean {
    const trie = this.columnTries.get(col);
    return trie?.search(value) ?? false;
  }

  /**
   * Get all unique values in a column
   *
   * @param col - Column index
   * @returns Array of all unique values
   */
  getAllValues(col: number): string[] {
    const trie = this.columnTries.get(col);
    return trie?.getAllWords() ?? [];
  }

  /**
   * Clear column index
   *
   * @param col - Column index
   */
  clearColumn(col: number): void {
    this.columnTries.delete(col);
  }

  /**
   * Clear all column indexes
   */
  clearAll(): void {
    this.columnTries.clear();
  }

  /**
   * Get statistics about indexed columns
   */
  getStats(): { col: number; uniqueValues: number }[] {
    const stats: { col: number; uniqueValues: number }[] = [];

    for (const [col, trie] of this.columnTries.entries()) {
      stats.push({
        col,
        uniqueValues: trie.size(),
      });
    }

    return stats;
  }
}
