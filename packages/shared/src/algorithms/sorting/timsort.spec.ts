import { timsort, timsortIndices, isSorted } from './timsort';
import { numericComparator, stringComparator } from './comparators';

describe('Timsort', () => {
  describe('timsort', () => {
    it('should sort empty array', () => {
      const arr: number[] = [];
      timsort(arr, numericComparator());
      expect(arr).toEqual([]);
    });

    it('should sort single element', () => {
      const arr = [42];
      timsort(arr, numericComparator());
      expect(arr).toEqual([42]);
    });

    it('should sort two elements', () => {
      const arr = [2, 1];
      timsort(arr, numericComparator());
      expect(arr).toEqual([1, 2]);
    });

    it('should sort already sorted array', () => {
      const arr = [1, 2, 3, 4, 5];
      timsort(arr, numericComparator());
      expect(arr).toEqual([1, 2, 3, 4, 5]);
    });

    it('should sort reverse sorted array', () => {
      const arr = [5, 4, 3, 2, 1];
      timsort(arr, numericComparator());
      expect(arr).toEqual([1, 2, 3, 4, 5]);
    });

    it('should sort random numbers', () => {
      const arr = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
      timsort(arr, numericComparator());
      expect(arr).toEqual([1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]);
    });

    it('should be stable (preserve relative order of equal elements)', () => {
      interface Item {
        key: number;
        value: string;
      }

      const items: Item[] = [
        { key: 2, value: 'first-2' },
        { key: 1, value: 'first-1' },
        { key: 2, value: 'second-2' },
        { key: 1, value: 'second-1' },
      ];

      timsort(items, (a, b) => a.key - b.key);

      expect(items).toEqual([
        { key: 1, value: 'first-1' },
        { key: 1, value: 'second-1' },
        { key: 2, value: 'first-2' },
        { key: 2, value: 'second-2' },
      ]);
    });

    it('should sort strings', () => {
      const arr = ['Charlie', 'Alice', 'Bob', 'David'];
      timsort(arr, stringComparator());
      expect(arr).toEqual(['Alice', 'Bob', 'Charlie', 'David']);
    });

    it('should sort with custom comparator', () => {
      const arr = ['a', 'aaa', 'aa', 'aaaa'];
      timsort(arr, (a, b) => a.length - b.length);
      expect(arr).toEqual(['a', 'aa', 'aaa', 'aaaa']);
    });

    it('should handle arrays with duplicates', () => {
      const arr = [3, 3, 3, 1, 1, 2, 2, 2];
      timsort(arr, numericComparator());
      expect(arr).toEqual([1, 1, 2, 2, 2, 3, 3, 3]);
    });

    it('should handle large arrays (100 elements)', () => {
      const arr = Array.from({ length: 100 }, () => Math.floor(Math.random() * 100));
      const original = [...arr];

      timsort(arr, numericComparator());

      expect(arr.length).toBe(100);
      expect(isSorted(arr, numericComparator())).toBe(true);

      // Verify all original elements are present
      for (const val of original) {
        expect(arr).toContain(val);
      }
    });

    it('should handle arrays with custom minRun', () => {
      const arr = [5, 4, 3, 2, 1, 10, 9, 8, 7, 6];
      timsort(arr, numericComparator(), { minRun: 3 });
      expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe('timsortIndices', () => {
    it('should sort indices based on values', () => {
      const values = ['Charlie', 'Alice', 'Bob'];
      const indices = [0, 1, 2];

      const sorted = timsortIndices(
        indices,
        (i) => values[i],
        stringComparator()
      );

      expect(sorted).toEqual([1, 2, 0]); // Alice, Bob, Charlie
      expect(values[sorted[0]]).toBe('Alice');
      expect(values[sorted[1]]).toBe('Bob');
      expect(values[sorted[2]]).toBe('Charlie');
    });

    it('should not modify original values', () => {
      const values = [30, 10, 20];
      const indices = [0, 1, 2];

      timsortIndices(indices, (i) => values[i], numericComparator());

      expect(values).toEqual([30, 10, 20]); // Unchanged
    });

    it('should handle numeric values', () => {
      const values = [30, 10, 50, 20, 40];
      const indices = [0, 1, 2, 3, 4];

      const sorted = timsortIndices(
        indices,
        (i) => values[i],
        numericComparator()
      );

      expect(sorted).toEqual([1, 3, 0, 4, 2]); // 10, 20, 30, 40, 50
    });

    it('should be stable for equal values', () => {
      const values = [2, 1, 2, 1, 2];
      const indices = [0, 1, 2, 3, 4];

      const sorted = timsortIndices(
        indices,
        (i) => values[i],
        numericComparator()
      );

      // Values of 1 should appear at indices 1, 3 (in that order)
      expect(values[sorted[0]]).toBe(1);
      expect(values[sorted[1]]).toBe(1);
      expect(sorted[0]).toBe(1);
      expect(sorted[1]).toBe(3);
    });

    it('should handle sparse data access', () => {
      const sparseData = new Map<number, number>([
        [5, 100],
        [2, 50],
        [8, 150],
        [1, 25],
      ]);

      const indices = [1, 2, 5, 8];

      const sorted = timsortIndices(
        indices,
        (i) => sparseData.get(i) ?? 0,
        numericComparator()
      );

      expect(sorted).toEqual([1, 2, 5, 8]); // 25, 50, 100, 150
      expect(sparseData.get(sorted[0])).toBe(25);
      expect(sparseData.get(sorted[1])).toBe(50);
      expect(sparseData.get(sorted[2])).toBe(100);
      expect(sparseData.get(sorted[3])).toBe(150);
    });

    it('should handle large index arrays', () => {
      const values = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 1000));
      const indices = Array.from({ length: 1000 }, (_, i) => i);

      const sorted = timsortIndices(
        indices,
        (i) => values[i],
        numericComparator()
      );

      // Verify sorted order
      for (let i = 1; i < sorted.length; i++) {
        expect(values[sorted[i]]).toBeGreaterThanOrEqual(values[sorted[i - 1]]);
      }
    });
  });

  describe('isSorted', () => {
    it('should return true for sorted array', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(isSorted(arr, numericComparator())).toBe(true);
    });

    it('should return false for unsorted array', () => {
      const arr = [1, 3, 2, 4, 5];
      expect(isSorted(arr, numericComparator())).toBe(false);
    });

    it('should return true for empty array', () => {
      const arr: number[] = [];
      expect(isSorted(arr, numericComparator())).toBe(true);
    });

    it('should return true for single element', () => {
      const arr = [42];
      expect(isSorted(arr, numericComparator())).toBe(true);
    });

    it('should work with strings', () => {
      expect(isSorted(['Alice', 'Bob', 'Charlie'], stringComparator())).toBe(true);
      expect(isSorted(['Charlie', 'Alice', 'Bob'], stringComparator())).toBe(false);
    });

    it('should handle arrays with equal elements', () => {
      const arr = [1, 2, 2, 3, 3, 3, 4];
      expect(isSorted(arr, numericComparator())).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should sort 10K elements efficiently', () => {
      const arr = Array.from({ length: 10_000 }, () => Math.floor(Math.random() * 10_000));

      const start = performance.now();
      timsort(arr, numericComparator());
      const duration = performance.now() - start;

      expect(isSorted(arr, numericComparator())).toBe(true);
      expect(duration).toBeLessThan(500); // < 500ms for 10K elements
    });

    it('should handle already sorted array efficiently (best case)', () => {
      const arr = Array.from({ length: 10_000 }, (_, i) => i);

      const start = performance.now();
      timsort(arr, numericComparator());
      const duration = performance.now() - start;

      expect(isSorted(arr, numericComparator())).toBe(true);
      expect(duration).toBeLessThan(100); // Best case O(n)
    });

    it('should handle reverse sorted array efficiently', () => {
      const arr = Array.from({ length: 10_000 }, (_, i) => 10_000 - i);

      const start = performance.now();
      timsort(arr, numericComparator());
      const duration = performance.now() - start;

      expect(isSorted(arr, numericComparator())).toBe(true);
      expect(duration).toBeLessThan(500);
    });

    it('should sort indices for 10K elements efficiently', () => {
      const values = Array.from({ length: 10_000 }, () => Math.floor(Math.random() * 10_000));
      const indices = Array.from({ length: 10_000 }, (_, i) => i);

      const start = performance.now();
      const sorted = timsortIndices(indices, (i) => values[i], numericComparator());
      const duration = performance.now() - start;

      // Verify sorted
      for (let i = 1; i < sorted.length; i++) {
        expect(values[sorted[i]]).toBeGreaterThanOrEqual(values[sorted[i - 1]]);
      }

      expect(duration).toBeLessThan(500);
    });
  });
});
