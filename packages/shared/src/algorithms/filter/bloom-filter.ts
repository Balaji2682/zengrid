/**
 * Bloom Filter - Probabilistic Data Structure
 *
 * A space-efficient probabilistic data structure for testing set membership.
 * May have false positives but never false negatives.
 *
 * **Time Complexity:**
 * - Add: O(k) where k = number of hash functions
 * - Check: O(k)
 *
 * **Space Complexity:** O(m) where m = bit array size
 *
 * **Use Cases:**
 * - Quick "definitely not in set" checks (e.g., "does this filter value exist?")
 * - Cache optimization (avoid expensive lookups for non-existent items)
 * - Duplicate detection in large datasets
 * - Spell checkers
 *
 * @example
 * ```typescript
 * const filter = new BloomFilter(1000, 3); // 1000 bits, 3 hash functions
 *
 * // Add some items
 * filter.add('apple');
 * filter.add('banana');
 * filter.add('cherry');
 *
 * filter.contains('apple');   // true (definitely in set)
 * filter.contains('grape');   // false (definitely NOT in set)
 * filter.contains('apples');  // might be true (false positive possible)
 * ```
 *
 * @example Grid Filter Optimization
 * ```typescript
 * // Quickly check if a filter value might exist before scanning column
 * class ColumnFilter {
 *   private bloomFilter = new BloomFilter(10000, 4);
 *
 *   indexColumn(values: any[]): void {
 *     values.forEach(v => this.bloomFilter.add(String(v)));
 *   }
 *
 *   mightContain(value: string): boolean {
 *     return this.bloomFilter.contains(value);
 *   }
 * }
 * ```
 */
export class BloomFilter {
  private bitArray: boolean[];
  private size: number;
  private hashCount: number;

  /**
   * Create a new Bloom Filter
   *
   * @param size - Size of the bit array (larger = fewer false positives)
   * @param hashCount - Number of hash functions (more = fewer false positives, slower)
   */
  constructor(size: number, hashCount: number = 3) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Array(size).fill(false);
  }

  /**
   * Add an item to the filter
   *
   * @param item - Item to add
   */
  add(item: string): void {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      this.bitArray[hash] = true;
    }
  }

  /**
   * Check if an item might be in the set
   *
   * @param item - Item to check
   * @returns true if item might be in set, false if definitely NOT in set
   */
  contains(item: string): boolean {
    const hashes = this.getHashes(item);

    for (const hash of hashes) {
      if (!this.bitArray[hash]) {
        return false; // Definitely not in set
      }
    }

    return true; // Might be in set (could be false positive)
  }

  /**
   * Clear the filter
   */
  clear(): void {
    this.bitArray.fill(false);
  }

  /**
   * Get the false positive probability
   *
   * P(false positive) ≈ (1 - e^(-kn/m))^k
   * where k = hash functions, n = items added, m = bit array size
   *
   * @param itemCount - Number of items added
   * @returns Estimated false positive probability
   */
  getFalsePositiveRate(itemCount: number): number {
    const k = this.hashCount;
    const m = this.size;
    const n = itemCount;

    return Math.pow(1 - Math.exp((-k * n) / m), k);
  }

  /**
   * Calculate optimal bit array size for desired false positive rate
   *
   * m = -(n * ln(p)) / (ln(2)^2)
   *
   * @param itemCount - Expected number of items
   * @param falsePositiveRate - Desired false positive rate (e.g., 0.01 for 1%)
   * @returns Optimal bit array size
   */
  static optimalSize(itemCount: number, falsePositiveRate: number): number {
    return Math.ceil(-(itemCount * Math.log(falsePositiveRate)) / Math.pow(Math.log(2), 2));
  }

  /**
   * Calculate optimal number of hash functions
   *
   * k = (m/n) * ln(2)
   *
   * @param bitArraySize - Size of bit array
   * @param itemCount - Expected number of items
   * @returns Optimal number of hash functions
   */
  static optimalHashCount(bitArraySize: number, itemCount: number): number {
    return Math.ceil((bitArraySize / itemCount) * Math.log(2));
  }

  // ==================== Private Methods ====================

  /**
   * Generate multiple hash values for an item
   */
  private getHashes(item: string): number[] {
    const hashes: number[] = [];

    // Use double hashing: h_i(x) = h1(x) + i * h2(x)
    const hash1 = this.hashFunc1(item);
    const hash2 = this.hashFunc2(item);

    for (let i = 0; i < this.hashCount; i++) {
      const hash = (hash1 + i * hash2) % this.size;
      hashes.push(Math.abs(hash));
    }

    return hashes;
  }

  /**
   * First hash function (simple polynomial hash)
   */
  private hashFunc1(str: string): number {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % this.size;
    }

    return hash;
  }

  /**
   * Second hash function (FNV-1a variant)
   */
  private hashFunc2(str: string): number {
    let hash = 2166136261; // FNV offset basis

    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) % this.size; // FNV prime
    }

    return hash;
  }
}
