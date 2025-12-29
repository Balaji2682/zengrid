import { SparseMatrix } from './sparse-matrix';

describe('SparseMatrix', () => {
  describe('Basic Operations', () => {
    it('should set and get values', () => {
      const matrix = new SparseMatrix<string>();
      matrix.set(0, 0, 'A1');
      matrix.set(10, 20, 'B1');

      expect(matrix.get(0, 0)).toBe('A1');
      expect(matrix.get(10, 20)).toBe('B1');
      expect(matrix.get(1, 1)).toBeUndefined();
    });

    it('should handle null/undefined as delete', () => {
      const matrix = new SparseMatrix<string | null>();
      matrix.set(0, 0, 'A1');
      expect(matrix.has(0, 0)).toBe(true);

      matrix.set(0, 0, null);
      expect(matrix.has(0, 0)).toBe(false);
      expect(matrix.get(0, 0)).toBeUndefined();
    });

    it('should delete values', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(5, 5, 42);
      expect(matrix.has(5, 5)).toBe(true);

      const deleted = matrix.delete(5, 5);
      expect(deleted).toBe(true);
      expect(matrix.has(5, 5)).toBe(false);

      const deleted2 = matrix.delete(5, 5);
      expect(deleted2).toBe(false);
    });

    it('should clear all values', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 1);
      matrix.set(1, 1, 2);
      matrix.set(2, 2, 3);
      expect(matrix.size).toBe(3);

      matrix.clear();
      expect(matrix.size).toBe(0);
      expect(matrix.get(0, 0)).toBeUndefined();
    });

    it('should track size correctly', () => {
      const matrix = new SparseMatrix<number>();
      expect(matrix.size).toBe(0);

      matrix.set(0, 0, 1);
      expect(matrix.size).toBe(1);

      matrix.set(1, 1, 2);
      expect(matrix.size).toBe(2);

      matrix.set(0, 0, 10); // Update existing
      expect(matrix.size).toBe(2);

      matrix.delete(0, 0);
      expect(matrix.size).toBe(1);
    });
  });

  describe('Row Operations', () => {
    it('should get row values', () => {
      const matrix = new SparseMatrix<string>();
      matrix.set(0, 0, 'A');
      matrix.set(0, 1, 'B');
      matrix.set(0, 5, 'C');
      matrix.set(1, 0, 'D'); // Different row

      const row0 = matrix.getRow(0);
      expect(row0.size).toBe(3);
      expect(row0.get(0)).toBe('A');
      expect(row0.get(1)).toBe('B');
      expect(row0.get(5)).toBe('C');

      const row1 = matrix.getRow(1);
      expect(row1.size).toBe(1);
      expect(row1.get(0)).toBe('D');
    });

    it('should set multiple values in a row', () => {
      const matrix = new SparseMatrix<number>();
      const values = new Map([
        [0, 10],
        [1, 20],
        [2, 30],
      ]);

      matrix.setRow(5, values);
      expect(matrix.get(5, 0)).toBe(10);
      expect(matrix.get(5, 1)).toBe(20);
      expect(matrix.get(5, 2)).toBe(30);
      expect(matrix.size).toBe(3);
    });

    it('should delete entire row', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 1);
      matrix.set(0, 1, 2);
      matrix.set(0, 2, 3);
      matrix.set(1, 0, 4); // Different row

      const deleted = matrix.deleteRow(0);
      expect(deleted).toBe(3);
      expect(matrix.size).toBe(1);
      expect(matrix.get(0, 0)).toBeUndefined();
      expect(matrix.get(1, 0)).toBe(4);
    });
  });

  describe('Column Operations', () => {
    it('should get column values', () => {
      const matrix = new SparseMatrix<string>();
      matrix.set(0, 0, 'A');
      matrix.set(1, 0, 'B');
      matrix.set(5, 0, 'C');
      matrix.set(0, 1, 'D'); // Different column

      const col0 = matrix.getColumn(0);
      expect(col0.size).toBe(3);
      expect(col0.get(0)).toBe('A');
      expect(col0.get(1)).toBe('B');
      expect(col0.get(5)).toBe('C');

      const col1 = matrix.getColumn(1);
      expect(col1.size).toBe(1);
      expect(col1.get(0)).toBe('D');
    });

    it('should delete entire column', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 1);
      matrix.set(1, 0, 2);
      matrix.set(2, 0, 3);
      matrix.set(0, 1, 4); // Different column

      const deleted = matrix.deleteColumn(0);
      expect(deleted).toBe(3);
      expect(matrix.size).toBe(1);
      expect(matrix.get(0, 0)).toBeUndefined();
      expect(matrix.get(0, 1)).toBe(4);
    });
  });

  describe('Iteration', () => {
    it('should iterate over all values', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 1);
      matrix.set(1, 2, 2);
      matrix.set(5, 10, 3);

      const entries = Array.from(matrix);
      expect(entries).toHaveLength(3);

      // Sort for consistent ordering
      entries.sort((a, b) => a[2] - b[2]);

      expect(entries[0]).toEqual([0, 0, 1]);
      expect(entries[1]).toEqual([1, 2, 2]);
      expect(entries[2]).toEqual([5, 10, 3]);
    });

    it('should work with for...of', () => {
      const matrix = new SparseMatrix<string>();
      matrix.set(0, 0, 'A');
      matrix.set(1, 1, 'B');

      const values: string[] = [];
      for (const [, , value] of matrix) {
        values.push(value);
      }

      expect(values).toContain('A');
      expect(values).toContain('B');
    });
  });

  describe('Custom Options', () => {
    it('should handle initial capacity hint', () => {
      const matrix = new SparseMatrix<number>({
        initialCapacity: 100,
      });

      for (let i = 0; i < 50; i++) {
        matrix.set(i, i, i * 2);
      }

      expect(matrix.size).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle large row/col indices', () => {
      const matrix = new SparseMatrix<string>();
      matrix.set(1000000, 2000000, 'huge');

      expect(matrix.get(1000000, 2000000)).toBe('huge');
      expect(matrix.size).toBe(1);
    });

    it('should handle negative indices', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(-5, -10, 42);

      expect(matrix.get(-5, -10)).toBe(42);
    });

    it('should handle empty row/column operations', () => {
      const matrix = new SparseMatrix<number>();
      const emptyRow = matrix.getRow(999);
      expect(emptyRow.size).toBe(0);

      const deleted = matrix.deleteRow(999);
      expect(deleted).toBe(0);
    });
  });

  describe('Dense Array Conversion', () => {
    it('should convert to dense 2D array', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 1);
      matrix.set(0, 2, 3);
      matrix.set(1, 1, 5);

      const dense = matrix.toDenseArray(1, 2, 0);
      expect(dense).toEqual([
        [1, 0, 3],
        [0, 5, 0],
      ]);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large sparse matrices efficiently', () => {
      const matrix = new SparseMatrix<number>();
      const rowCount = 10000;
      const colsPerRow = 10;

      // Fill sparse matrix: 10K rows, 10 cells per row = 100K cells total
      const startFill = performance.now();
      for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < colsPerRow; col++) {
          matrix.set(row, col, row * colsPerRow + col);
        }
      }
      const fillTime = performance.now() - startFill;

      expect(matrix.size).toBe(rowCount * colsPerRow);
      expect(fillTime).toBeLessThan(500); // Should complete in < 500ms
    });

    it('should have O(1) row access', () => {
      const matrix = new SparseMatrix<number>();
      const rowCount = 1000;
      const colsPerRow = 100;

      // Fill matrix
      for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < colsPerRow; col++) {
          matrix.set(row, col, row * colsPerRow + col);
        }
      }

      // Test row access performance - should be O(1), not O(total cells)
      const startGetRow = performance.now();
      for (let i = 0; i < 100; i++) {
        const row = matrix.getRow(500);
        expect(row.size).toBe(colsPerRow);
      }
      const getRowTime = performance.now() - startGetRow;

      // 100 row accesses should be extremely fast (< 10ms)
      // Old implementation would scan all 100K cells 100 times!
      expect(getRowTime).toBeLessThan(10);
    });

    it('should have efficient column access', () => {
      const matrix = new SparseMatrix<number>();
      const rowCount = 1000;
      const colsPerRow = 100;

      // Fill matrix
      for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < colsPerRow; col++) {
          matrix.set(row, col, row * colsPerRow + col);
        }
      }

      // Test column access - O(rows with data), not O(total cells)
      const startGetCol = performance.now();
      const col = matrix.getColumn(50);
      const getColTime = performance.now() - startGetCol;

      expect(col.size).toBe(rowCount); // 1000 cells in this column
      // Should iterate only 1000 rows, not 100K cells
      expect(getColTime).toBeLessThan(10);
    });

    it('should have O(1) row deletion', () => {
      const matrix = new SparseMatrix<number>();
      const rowCount = 1000;
      const colsPerRow = 100;

      // Fill matrix
      for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < colsPerRow; col++) {
          matrix.set(row, col, row * colsPerRow + col);
        }
      }

      // Test row deletion - should be O(1)
      const startDelete = performance.now();
      const deleted = matrix.deleteRow(500);
      const deleteTime = performance.now() - startDelete;

      expect(deleted).toBe(colsPerRow);
      expect(matrix.size).toBe(rowCount * colsPerRow - colsPerRow);
      expect(deleteTime).toBeLessThan(1); // Should be instant
    });

    it('should efficiently handle very sparse data', () => {
      const matrix = new SparseMatrix<number>();

      // Very sparse: 1 million potential cells, only 1000 filled
      // Scattered across different rows
      const cellCount = 1000;
      for (let i = 0; i < cellCount; i++) {
        const row = i * 1000; // Rows: 0, 1000, 2000, ...
        const col = i;
        matrix.set(row, col, i);
      }

      expect(matrix.size).toBe(cellCount);

      // Access should still be fast even though row indices are large
      const value = matrix.get(500000, 500);
      expect(value).toBe(500);

      // Row access should be instant
      const row = matrix.getRow(500000);
      expect(row.size).toBe(1);
    });
  });
});
