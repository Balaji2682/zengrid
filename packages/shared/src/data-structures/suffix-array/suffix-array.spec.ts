import { SuffixArray } from './suffix-array';

describe('SuffixArray', () => {
  describe('Basic Operations', () => {
    it('should find substring occurrences', () => {
      const sa = new SuffixArray('banana');
      const positions = sa.search('ana');

      expect(positions).toEqual([1, 3]);
    });

    it('should handle case-insensitive search by default', () => {
      const sa = new SuffixArray('BaNaNa');
      const positions = sa.search('ana');

      expect(positions.length).toBe(2);
    });

    it('should handle case-sensitive search when specified', () => {
      const sa = new SuffixArray('BaNaNa', { caseSensitive: true });
      const positions = sa.search('aNa');

      expect(positions).toEqual([1]);
    });

    it('should return empty array for non-existent pattern', () => {
      const sa = new SuffixArray('banana');
      const positions = sa.search('xyz');

      expect(positions).toEqual([]);
    });

    it('should find single character', () => {
      const sa = new SuffixArray('banana');
      const positions = sa.search('a');

      expect(positions).toEqual([1, 3, 5]);
    });
  });

  describe('Contains', () => {
    it('should return true for existing pattern', () => {
      const sa = new SuffixArray('banana');

      expect(sa.contains('ana')).toBe(true);
      expect(sa.contains('ban')).toBe(true);
      expect(sa.contains('nana')).toBe(true);
    });

    it('should return false for non-existing pattern', () => {
      const sa = new SuffixArray('banana');

      expect(sa.contains('xyz')).toBe(false);
      expect(sa.contains('apple')).toBe(false);
    });

    it('should handle empty pattern', () => {
      const sa = new SuffixArray('banana');

      expect(sa.contains('')).toBe(false);
    });
  });

  describe('Count', () => {
    it('should count occurrences correctly', () => {
      const sa = new SuffixArray('banana');

      expect(sa.count('ana')).toBe(2);
      expect(sa.count('a')).toBe(3);
      expect(sa.count('ban')).toBe(1);
    });

    it('should return 0 for non-existent pattern', () => {
      const sa = new SuffixArray('banana');

      expect(sa.count('xyz')).toBe(0);
    });
  });

  describe('Search with Context', () => {
    it('should return results with context', () => {
      const sa = new SuffixArray('The quick brown fox jumps over the lazy dog');
      const results = sa.searchWithContext('fox', 5);

      expect(results).toHaveLength(1);
      expect(results[0].position).toBe(16);
      expect(results[0].match).toBe('fox');
      expect(results[0].context).toContain('fox');
    });

    it('should handle multiple occurrences with context', () => {
      const sa = new SuffixArray('banana');
      const results = sa.searchWithContext('ana', 2);

      expect(results).toHaveLength(2);
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(3);
    });
  });

  describe('Longest Repeated Substring', () => {
    it('should find longest repeated substring', () => {
      const sa = new SuffixArray('banana');
      const longest = sa.longestRepeatedSubstring();

      expect(longest).toBe('ana');
    });

    it('should handle text with no repetitions', () => {
      const sa = new SuffixArray('abcdefg');
      const longest = sa.longestRepeatedSubstring();

      expect(longest).toBe('');
    });

    it('should find repeated pattern', () => {
      const sa = new SuffixArray('abcabcabc');
      const longest = sa.longestRepeatedSubstring();

      expect(longest.length).toBeGreaterThan(0);
    });
  });

  describe('Unique Substrings', () => {
    it('should find unique substrings of given length', () => {
      const sa = new SuffixArray('banana');
      const unique = sa.uniqueSubstrings(2);

      expect(unique).toContain('ba');
      expect(unique).toContain('an');
      expect(unique).toContain('na');
      expect(unique.length).toBe(3); // 'ba', 'an', 'na'
    });

    it('should handle length 1', () => {
      const sa = new SuffixArray('banana');
      const unique = sa.uniqueSubstrings(1);

      expect(unique).toContain('b');
      expect(unique).toContain('a');
      expect(unique).toContain('n');
      expect(unique.length).toBe(3);
    });

    it('should return empty for invalid length', () => {
      const sa = new SuffixArray('banana');

      expect(sa.uniqueSubstrings(0)).toEqual([]);
      expect(sa.uniqueSubstrings(10)).toEqual([]);
    });
  });

  describe('Grid Use Cases', () => {
    it('should search in product names (case-insensitive)', () => {
      const text = 'Apple iPhone 14\0Samsung Galaxy S23\0Microsoft Surface Pro';
      const sa = new SuffixArray(text);

      // Search for "phone" should find "iPhone"
      const positions = sa.search('phone');
      expect(positions.length).toBeGreaterThan(0);
      expect(sa.contains('phone')).toBe(true);
    });

    it('should handle multiple column values', () => {
      const columnData = ['Apple iPhone', 'Samsung Phone', 'Google Pixel'];
      const text = columnData.join('\0');
      const sa = new SuffixArray(text);

      expect(sa.contains('phone')).toBe(true);
      expect(sa.count('phone')).toBe(2); // iPhone + Phone
    });

    it('should perform fast substring filtering', () => {
      const data = Array.from({ length: 100 }, (_, i) => `Product ${i}`).join('\0');
      const sa = new SuffixArray(data);

      const start = performance.now();
      const contains = sa.contains('Product 50');
      const end = performance.now();

      expect(contains).toBe(true);
      expect(end - start).toBeLessThan(10); // Should be very fast
    });
  });

  describe('Statistics', () => {
    it('should return correct stats', () => {
      const sa = new SuffixArray('banana');
      const stats = sa.getStats();

      expect(stats.textLength).toBe(6);
      expect(stats.suffixCount).toBe(6);
      expect(stats.hasLCP).toBe(true);
      expect(stats.memoryBytes).toBeGreaterThan(0);
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      const sa = new SuffixArray('banana');
      sa.clear();

      const stats = sa.getStats();
      expect(stats.textLength).toBe(0);
      expect(stats.suffixCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const sa = new SuffixArray('');

      expect(sa.search('a')).toEqual([]);
      expect(sa.contains('a')).toBe(false);
      expect(sa.count('a')).toBe(0);
    });

    it('should handle single character text', () => {
      const sa = new SuffixArray('a');

      expect(sa.search('a')).toEqual([0]);
      expect(sa.contains('a')).toBe(true);
      expect(sa.count('a')).toBe(1);
    });

    it('should handle pattern longer than text', () => {
      const sa = new SuffixArray('abc');

      expect(sa.search('abcdef')).toEqual([]);
      expect(sa.contains('abcdef')).toBe(false);
    });
  });
});
