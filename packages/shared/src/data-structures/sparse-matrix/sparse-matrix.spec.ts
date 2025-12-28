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
    it('should use custom hash function', () => {
      const customHash = (row: number, col: number) => `r${row}c${col}`;
      const matrix = new SparseMatrix<number>({
        hashFunction: customHash,
      });

      matrix.set(10, 20, 42);
      expect(matrix.get(10, 20)).toBe(42);
      expect(matrix.size).toBe(1);
    });

    it('should handle initial capacity', () => {
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
});
