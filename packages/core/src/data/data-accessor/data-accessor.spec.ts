import { SparseMatrix } from '@zengrid/shared';
import { ColumnStore } from '@zengrid/shared';
import {
  createSparseMatrixAccessor,
  createColumnStoreAccessor,
  createArrayAccessor,
} from './index';

describe('DataAccessor', () => {
  describe('SparseMatrixAccessor', () => {
    it('should access values from sparse matrix', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 10);
      matrix.set(0, 2, 30);
      matrix.set(5, 1, 99);

      const accessor = createSparseMatrixAccessor(matrix, 10, 5);

      expect(accessor.getValue(0, 0)).toBe(10);
      expect(accessor.getValue(0, 2)).toBe(30);
      expect(accessor.getValue(5, 1)).toBe(99);
      expect(accessor.getValue(1, 1)).toBeUndefined();
    });

    it('should return row data', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 10);
      matrix.set(0, 2, 30);
      matrix.set(0, 4, 50);

      const accessor = createSparseMatrixAccessor(matrix, 10, 5);

      const row = Array.from(accessor.getRow(0));
      expect(row).toEqual([
        [0, 10],
        [2, 30],
        [4, 50],
      ]);
    });

    it('should return empty row for rows with no data', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 10);

      const accessor = createSparseMatrixAccessor(matrix, 10, 5);

      const row = Array.from(accessor.getRow(5));
      expect(row).toEqual([]);
    });

    it('should return column data', () => {
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 1, 10);
      matrix.set(2, 1, 30);
      matrix.set(5, 1, 60);

      const accessor = createSparseMatrixAccessor(matrix, 10, 5);

      const column = Array.from(accessor.getColumn(1));
      expect(column).toEqual([
        [0, 10],
        [2, 30],
        [5, 60],
      ]);
    });

    it('should report row and column counts', () => {
      const matrix = new SparseMatrix<number>();
      const accessor = createSparseMatrixAccessor(matrix, 100, 20);

      expect(accessor.rowCount).toBe(100);
      expect(accessor.colCount).toBe(20);
    });

    it('should return numeric column IDs', () => {
      const matrix = new SparseMatrix<number>();
      const accessor = createSparseMatrixAccessor(matrix, 10, 3);

      expect(accessor.getColumnIds()).toEqual([0, 1, 2]);
    });

    it('should throw on string column identifier', () => {
      const matrix = new SparseMatrix<number>();
      const accessor = createSparseMatrixAccessor(matrix, 10, 5);

      expect(() => accessor.getValue(0, 'name')).toThrow(TypeError);
      expect(() => accessor.getColumn('name')).toThrow(TypeError);
    });
  });

  describe('ColumnStoreAccessor', () => {
    it('should access values from column store', () => {
      const store = new ColumnStore({
        rowCount: 3,
        columns: [
          { name: 'id', type: 'int32' },
          { name: 'name', type: 'string' },
          { name: 'price', type: 'float64' },
        ],
      });

      store.setValue(0, 'id', 1);
      store.setValue(0, 'name', 'Alice');
      store.setValue(0, 'price', 99.99);

      const accessor = createColumnStoreAccessor(store);

      expect(accessor.getValue(0, 'id')).toBe(1);
      expect(accessor.getValue(0, 'name')).toBe('Alice');
      expect(accessor.getValue(0, 'price')).toBe(99.99);
    });

    it('should access values by numeric column index', () => {
      const store = new ColumnStore({
        rowCount: 3,
        columns: [
          { name: 'id', type: 'int32' },
          { name: 'name', type: 'string' },
        ],
      });

      store.setValue(0, 'id', 42);
      store.setValue(0, 'name', 'Test');

      const accessor = createColumnStoreAccessor(store);

      expect(accessor.getValue(0, 0)).toBe(42); // 'id' is column 0
      expect(accessor.getValue(0, 1)).toBe('Test'); // 'name' is column 1
    });

    it('should return row data', () => {
      const store = new ColumnStore({
        rowCount: 2,
        columns: [
          { name: 'a', type: 'int32' },
          { name: 'b', type: 'int32' },
          { name: 'c', type: 'int32' },
        ],
      });

      store.setValue(0, 'a', 10);
      store.setValue(0, 'b', 20);
      store.setValue(0, 'c', 30);

      const accessor = createColumnStoreAccessor(store);

      const row = Array.from(accessor.getRow(0));
      expect(row).toContainEqual(['a', 10]);
      expect(row).toContainEqual(['b', 20]);
      expect(row).toContainEqual(['c', 30]);
    });

    it('should return column data', () => {
      const store = new ColumnStore({
        rowCount: 3,
        columns: [{ name: 'value', type: 'int32' }],
      });

      store.setValue(0, 'value', 10);
      store.setValue(1, 'value', 20);
      store.setValue(2, 'value', 30);

      const accessor = createColumnStoreAccessor(store);

      const column = Array.from(accessor.getColumn('value'));
      expect(column).toEqual([
        [0, 10],
        [1, 20],
        [2, 30],
      ]);
    });

    it('should return column data by numeric index', () => {
      const store = new ColumnStore({
        rowCount: 2,
        columns: [
          { name: 'first', type: 'int32' },
          { name: 'second', type: 'int32' },
        ],
      });

      store.setValue(0, 'second', 100);
      store.setValue(1, 'second', 200);

      const accessor = createColumnStoreAccessor(store);

      const column = Array.from(accessor.getColumn(1)); // 'second' is index 1
      expect(column).toEqual([
        [0, 100],
        [1, 200],
      ]);
    });

    it('should report row and column counts', () => {
      const store = new ColumnStore({
        rowCount: 100,
        columns: [
          { name: 'a', type: 'int32' },
          { name: 'b', type: 'int32' },
          { name: 'c', type: 'int32' },
        ],
      });

      const accessor = createColumnStoreAccessor(store);

      expect(accessor.rowCount).toBe(100);
      expect(accessor.colCount).toBe(3);
    });

    it('should return column names as IDs', () => {
      const store = new ColumnStore({
        rowCount: 10,
        columns: [
          { name: 'id', type: 'int32' },
          { name: 'name', type: 'string' },
          { name: 'price', type: 'float64' },
        ],
      });

      const accessor = createColumnStoreAccessor(store);

      expect(accessor.getColumnIds()).toEqual(['id', 'name', 'price']);
    });

    it('should return undefined for invalid column', () => {
      const store = new ColumnStore({
        rowCount: 10,
        columns: [{ name: 'valid', type: 'int32' }],
      });

      const accessor = createColumnStoreAccessor(store);

      expect(accessor.getValue(0, 'invalid')).toBeUndefined();
      expect(accessor.getValue(0, 99)).toBeUndefined();
    });
  });

  describe('ArrayAccessor', () => {
    it('should access values from 2D array', () => {
      const data = [
        [10, 20, 30],
        [40, 50, 60],
        [70, 80, 90],
      ];

      const accessor = createArrayAccessor(data);

      expect(accessor.getValue(0, 0)).toBe(10);
      expect(accessor.getValue(0, 2)).toBe(30);
      expect(accessor.getValue(1, 1)).toBe(50);
      expect(accessor.getValue(2, 2)).toBe(90);
    });

    it('should return undefined for out of bounds access', () => {
      const data = [
        [10, 20],
        [30, 40],
      ];

      const accessor = createArrayAccessor(data);

      expect(accessor.getValue(-1, 0)).toBeUndefined();
      expect(accessor.getValue(0, -1)).toBeUndefined();
      expect(accessor.getValue(2, 0)).toBeUndefined();
      expect(accessor.getValue(0, 2)).toBeUndefined();
    });

    it('should return row data', () => {
      const data = [
        ['Alice', 25, true],
        ['Bob', 30, false],
      ];

      const accessor = createArrayAccessor(data);

      const row0 = Array.from(accessor.getRow(0));
      expect(row0).toEqual([
        [0, 'Alice'],
        [1, 25],
        [2, true],
      ]);

      const row1 = Array.from(accessor.getRow(1));
      expect(row1).toEqual([
        [0, 'Bob'],
        [1, 30],
        [2, false],
      ]);
    });

    it('should return empty row for invalid row index', () => {
      const data = [[1, 2, 3]];
      const accessor = createArrayAccessor(data);

      const row = Array.from(accessor.getRow(5));
      expect(row).toEqual([]);
    });

    it('should return column data', () => {
      const data = [
        [10, 100],
        [20, 200],
        [30, 300],
      ];

      const accessor = createArrayAccessor(data);

      const col0 = Array.from(accessor.getColumn(0));
      expect(col0).toEqual([
        [0, 10],
        [1, 20],
        [2, 30],
      ]);

      const col1 = Array.from(accessor.getColumn(1));
      expect(col1).toEqual([
        [0, 100],
        [1, 200],
        [2, 300],
      ]);
    });

    it('should return empty column for invalid column index', () => {
      const data = [[1, 2, 3]];
      const accessor = createArrayAccessor(data);

      const col = Array.from(accessor.getColumn(5));
      expect(col).toEqual([]);
    });

    it('should report row and column counts', () => {
      const data = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
      ];

      const accessor = createArrayAccessor(data);

      expect(accessor.rowCount).toBe(3);
      expect(accessor.colCount).toBe(4);
    });

    it('should return numeric column IDs', () => {
      const data = [
        [1, 2, 3],
        [4, 5, 6],
      ];

      const accessor = createArrayAccessor(data);

      expect(accessor.getColumnIds()).toEqual([0, 1, 2]);
    });

    it('should handle empty array', () => {
      const accessor = createArrayAccessor([]);

      expect(accessor.rowCount).toBe(0);
      expect(accessor.colCount).toBe(0);
      expect(accessor.getColumnIds()).toEqual([]);
      expect(accessor.getValue(0, 0)).toBeUndefined();
    });

    it('should throw on string column identifier', () => {
      const data = [[1, 2, 3]];
      const accessor = createArrayAccessor(data);

      expect(() => accessor.getValue(0, 'name')).toThrow(TypeError);
      expect(() => accessor.getColumn('name')).toThrow(TypeError);
    });
  });

  describe('Cross-Accessor Compatibility', () => {
    it('should provide consistent interface across different sources', () => {
      // Same data in different formats
      const matrix = new SparseMatrix<number>();
      matrix.set(0, 0, 10);
      matrix.set(0, 1, 20);
      matrix.set(1, 0, 30);
      matrix.set(1, 1, 40);

      const store = new ColumnStore({
        rowCount: 2,
        columns: [
          { name: 'col0', type: 'int32' },
          { name: 'col1', type: 'int32' },
        ],
      });
      store.setValue(0, 'col0', 10);
      store.setValue(0, 'col1', 20);
      store.setValue(1, 'col0', 30);
      store.setValue(1, 'col1', 40);

      const array = [
        [10, 20],
        [30, 40],
      ];

      const accessor1 = createSparseMatrixAccessor(matrix, 2, 2);
      const accessor2 = createColumnStoreAccessor(store);
      const accessor3 = createArrayAccessor(array);

      // All should have same dimensions
      expect(accessor1.rowCount).toBe(2);
      expect(accessor2.rowCount).toBe(2);
      expect(accessor3.rowCount).toBe(2);

      expect(accessor1.colCount).toBe(2);
      expect(accessor2.colCount).toBe(2);
      expect(accessor3.colCount).toBe(2);

      // All should return same values (using numeric indices)
      expect(accessor1.getValue(0, 0)).toBe(10);
      expect(accessor2.getValue(0, 0)).toBe(10);
      expect(accessor3.getValue(0, 0)).toBe(10);

      expect(accessor1.getValue(1, 1)).toBe(40);
      expect(accessor2.getValue(1, 1)).toBe(40);
      expect(accessor3.getValue(1, 1)).toBe(40);
    });
  });
});
