import { createIndexMap, createIdentityIndexMap } from './index-map';

describe('IndexMap', () => {
  describe('createIndexMap', () => {
    it('should create index map from array', () => {
      const indexMap = createIndexMap([3, 1, 4, 0, 2]);

      expect(indexMap.length).toBe(5);
      expect(indexMap.toDataIndex(0)).toBe(3);
      expect(indexMap.toDataIndex(1)).toBe(1);
      expect(indexMap.toDataIndex(2)).toBe(4);
      expect(indexMap.toDataIndex(3)).toBe(0);
      expect(indexMap.toDataIndex(4)).toBe(2);
    });

    it('should return -1 for out of bounds visual index', () => {
      const indexMap = createIndexMap([5, 2, 8]);

      expect(indexMap.toDataIndex(-1)).toBe(-1);
      expect(indexMap.toDataIndex(3)).toBe(-1);
      expect(indexMap.toDataIndex(100)).toBe(-1);
    });

    it('should create reverse mapping correctly', () => {
      const indexMap = createIndexMap([3, 1, 4, 0, 2]);

      expect(indexMap.toVisualIndex(0)).toBe(3);
      expect(indexMap.toVisualIndex(1)).toBe(1);
      expect(indexMap.toVisualIndex(2)).toBe(4);
      expect(indexMap.toVisualIndex(3)).toBe(0);
      expect(indexMap.toVisualIndex(4)).toBe(2);
    });

    it('should return -1 for data index not in map', () => {
      const indexMap = createIndexMap([3, 1, 4]);

      expect(indexMap.toVisualIndex(0)).toBe(-1);
      expect(indexMap.toVisualIndex(2)).toBe(-1);
      expect(indexMap.toVisualIndex(5)).toBe(-1);
    });

    it('should expose indices array', () => {
      const indices = [3, 1, 4, 0, 2];
      const indexMap = createIndexMap(indices);

      expect(indexMap.indices).toEqual(indices);
    });

    it('should be iterable', () => {
      const indexMap = createIndexMap([3, 1, 4]);

      const pairs = Array.from(indexMap);
      expect(pairs).toEqual([
        [0, 3],
        [1, 1],
        [2, 4],
      ]);
    });

    it('should handle empty index map', () => {
      const indexMap = createIndexMap([]);

      expect(indexMap.length).toBe(0);
      expect(indexMap.toDataIndex(0)).toBe(-1);
      expect(indexMap.toVisualIndex(0)).toBe(-1);
      expect(indexMap.indices).toEqual([]);
    });

    it('should handle filtered data (gaps in data indices)', () => {
      // Simulates filtering: only rows 1, 5, 9 are visible
      const indexMap = createIndexMap([1, 5, 9]);

      expect(indexMap.length).toBe(3);
      expect(indexMap.toDataIndex(0)).toBe(1);
      expect(indexMap.toDataIndex(1)).toBe(5);
      expect(indexMap.toDataIndex(2)).toBe(9);

      // Reverse mapping
      expect(indexMap.toVisualIndex(1)).toBe(0);
      expect(indexMap.toVisualIndex(5)).toBe(1);
      expect(indexMap.toVisualIndex(9)).toBe(2);

      // Filtered out data indices return -1
      expect(indexMap.toVisualIndex(0)).toBe(-1);
      expect(indexMap.toVisualIndex(2)).toBe(-1);
      expect(indexMap.toVisualIndex(3)).toBe(-1);
    });
  });

  describe('createIdentityIndexMap', () => {
    it('should create identity mapping', () => {
      const indexMap = createIdentityIndexMap(5);

      expect(indexMap.length).toBe(5);
      expect(indexMap.toDataIndex(0)).toBe(0);
      expect(indexMap.toDataIndex(1)).toBe(1);
      expect(indexMap.toDataIndex(2)).toBe(2);
      expect(indexMap.toDataIndex(3)).toBe(3);
      expect(indexMap.toDataIndex(4)).toBe(4);
    });

    it('should have matching reverse mapping', () => {
      const indexMap = createIdentityIndexMap(3);

      expect(indexMap.toVisualIndex(0)).toBe(0);
      expect(indexMap.toVisualIndex(1)).toBe(1);
      expect(indexMap.toVisualIndex(2)).toBe(2);
    });

    it('should return -1 for out of bounds indices', () => {
      const indexMap = createIdentityIndexMap(3);

      expect(indexMap.toDataIndex(-1)).toBe(-1);
      expect(indexMap.toDataIndex(3)).toBe(-1);
      expect(indexMap.toDataIndex(100)).toBe(-1);

      expect(indexMap.toVisualIndex(-1)).toBe(-1);
      expect(indexMap.toVisualIndex(3)).toBe(-1);
      expect(indexMap.toVisualIndex(100)).toBe(-1);
    });

    it('should create indices array lazily', () => {
      const indexMap = createIdentityIndexMap(5);

      expect(indexMap.indices).toEqual([0, 1, 2, 3, 4]);
    });

    it('should be iterable', () => {
      const indexMap = createIdentityIndexMap(3);

      const pairs = Array.from(indexMap);
      expect(pairs).toEqual([
        [0, 0],
        [1, 1],
        [2, 2],
      ]);
    });

    it('should handle zero row count', () => {
      const indexMap = createIdentityIndexMap(0);

      expect(indexMap.length).toBe(0);
      expect(indexMap.toDataIndex(0)).toBe(-1);
      expect(indexMap.toVisualIndex(0)).toBe(-1);
      expect(indexMap.indices).toEqual([]);
    });

    it('should throw on negative row count', () => {
      expect(() => createIdentityIndexMap(-1)).toThrow(RangeError);
      expect(() => createIdentityIndexMap(-100)).toThrow(RangeError);
    });

    it('should handle large row counts efficiently', () => {
      const indexMap = createIdentityIndexMap(100_000);

      expect(indexMap.length).toBe(100_000);
      expect(indexMap.toDataIndex(50_000)).toBe(50_000);
      expect(indexMap.toVisualIndex(99_999)).toBe(99_999);
    });
  });

  describe('Use Case: Sorting', () => {
    it('should represent sorted data', () => {
      // Original data: ['Charlie', 'Alice', 'Bob']
      // After sorting: ['Alice', 'Bob', 'Charlie']
      // IndexMap: [1, 2, 0] (visual 0 → data 1, visual 1 → data 2, visual 2 → data 0)
      const indexMap = createIndexMap([1, 2, 0]);

      expect(indexMap.toDataIndex(0)).toBe(1); // 'Alice' is at data index 1
      expect(indexMap.toDataIndex(1)).toBe(2); // 'Bob' is at data index 2
      expect(indexMap.toDataIndex(2)).toBe(0); // 'Charlie' is at data index 0

      // Reverse: where is data row 0 displayed?
      expect(indexMap.toVisualIndex(0)).toBe(2); // 'Charlie' (data 0) shown as visual row 2
      expect(indexMap.toVisualIndex(1)).toBe(0); // 'Alice' (data 1) shown as visual row 0
      expect(indexMap.toVisualIndex(2)).toBe(1); // 'Bob' (data 2) shown as visual row 1
    });
  });

  describe('Use Case: Filtering', () => {
    it('should represent filtered data', () => {
      // Original: 10 rows
      // After filtering: only rows 2, 5, 7 match
      const indexMap = createIndexMap([2, 5, 7]);

      expect(indexMap.length).toBe(3);

      // Visual rows
      expect(indexMap.toDataIndex(0)).toBe(2);
      expect(indexMap.toDataIndex(1)).toBe(5);
      expect(indexMap.toDataIndex(2)).toBe(7);

      // Filtered out rows return -1
      expect(indexMap.toVisualIndex(0)).toBe(-1);
      expect(indexMap.toVisualIndex(1)).toBe(-1);
      expect(indexMap.toVisualIndex(3)).toBe(-1);
    });
  });

  describe('Use Case: Sorting + Filtering', () => {
    it('should represent composed transformations', () => {
      // Step 1: Filter 10 rows to [2, 5, 7, 9]
      // Step 2: Sort by column, order becomes [9, 2, 7, 5]
      const indexMap = createIndexMap([9, 2, 7, 5]);

      expect(indexMap.length).toBe(4);

      expect(indexMap.toDataIndex(0)).toBe(9);
      expect(indexMap.toDataIndex(1)).toBe(2);
      expect(indexMap.toDataIndex(2)).toBe(7);
      expect(indexMap.toDataIndex(3)).toBe(5);
    });
  });

  describe('Performance', () => {
    it('should handle 100K indices efficiently', () => {
      // Create shuffled indices
      const indices = Array.from({ length: 100_000 }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      const start = performance.now();
      const indexMap = createIndexMap(indices);
      const createTime = performance.now() - start;

      expect(createTime).toBeLessThan(50); // Should create in < 50ms

      // Forward lookup (O(1))
      const forwardStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        indexMap.toDataIndex(i);
      }
      const forwardTime = performance.now() - forwardStart;
      expect(forwardTime).toBeLessThan(5); // 1000 lookups in < 5ms

      // Reverse lookup (builds map lazily)
      const reverseStart = performance.now();
      const firstReverse = indexMap.toVisualIndex(5000);
      const reverseTime = performance.now() - reverseStart;
      expect(reverseTime).toBeLessThan(100); // First lookup builds map, < 100ms

      expect(firstReverse).toBeDefined();

      // Subsequent reverse lookups should be O(1)
      const subsequentStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        indexMap.toVisualIndex(i);
      }
      const subsequentTime = performance.now() - subsequentStart;
      expect(subsequentTime).toBeLessThan(5); // Cached, < 5ms
    });
  });
});
