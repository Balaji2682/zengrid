import { ColumnStore } from './column-store';

describe('ColumnStore', () => {
  describe('Construction', () => {
    it('should create empty store', () => {
      const store = new ColumnStore();
      expect(store.rowCount).toBe(0);
      expect(store.columnCount).toBe(0);
    });

    it('should create store with initial rows', () => {
      const store = new ColumnStore({ rowCount: 100 });
      expect(store.rowCount).toBe(100);
      expect(store.columnCount).toBe(0);
    });

    it('should create store with columns', () => {
      const store = new ColumnStore({
        rowCount: 10,
        columns: [
          { name: 'id', type: 'int32' },
          { name: 'value', type: 'float64' },
          { name: 'label', type: 'string' },
        ],
      });

      expect(store.rowCount).toBe(10);
      expect(store.columnCount).toBe(3);
      expect(store.columns).toEqual(['id', 'value', 'label']);
    });

    it('should initialize with default values', () => {
      const store = new ColumnStore({
        rowCount: 5,
        columns: [
          { name: 'count', type: 'int32', defaultValue: 10 },
          { name: 'active', type: 'boolean', defaultValue: true },
        ],
      });

      expect(store.getValue(0, 'count')).toBe(10);
      expect(store.getValue(0, 'active')).toBe(true);
    });
  });

  describe('Column Management', () => {
    it('should add column', () => {
      const store = new ColumnStore({ rowCount: 5 });

      store.addColumn({ name: 'age', type: 'int32' });

      expect(store.hasColumn('age')).toBe(true);
      expect(store.columnCount).toBe(1);
    });

    it('should throw when adding duplicate column', () => {
      const store = new ColumnStore();
      store.addColumn({ name: 'id', type: 'int32' });

      expect(() =>
        store.addColumn({ name: 'id', type: 'float64' })
      ).toThrow('already exists');
    });

    it('should remove column', () => {
      const store = new ColumnStore({
        columns: [{ name: 'temp', type: 'float64' }],
      });

      const removed = store.removeColumn('temp');

      expect(removed).toBe(true);
      expect(store.hasColumn('temp')).toBe(false);
      expect(store.columnCount).toBe(0);
    });

    it('should return false when removing non-existent column', () => {
      const store = new ColumnStore();
      expect(store.removeColumn('missing')).toBe(false);
    });
  });

  describe('Get/Set Value', () => {
    let store: ColumnStore;

    beforeEach(() => {
      store = new ColumnStore({
        rowCount: 10,
        columns: [
          { name: 'int', type: 'int32' },
          { name: 'float', type: 'float64' },
          { name: 'str', type: 'string' },
          { name: 'bool', type: 'boolean' },
        ],
      });
    });

    it('should set and get int32 values', () => {
      store.setValue(0, 'int', 42);
      expect(store.getValue(0, 'int')).toBe(42);

      // Should floor floats
      store.setValue(1, 'int', 42.7);
      expect(store.getValue(1, 'int')).toBe(42);
    });

    it('should set and get float64 values', () => {
      store.setValue(0, 'float', 3.14159);
      expect(store.getValue(0, 'float')).toBeCloseTo(3.14159);
    });

    it('should set and get string values', () => {
      store.setValue(0, 'str', 'hello');
      expect(store.getValue(0, 'str')).toBe('hello');

      // Should convert to string
      store.setValue(1, 'str', 123);
      expect(store.getValue(1, 'str')).toBe('123');
    });

    it('should set and get boolean values', () => {
      store.setValue(0, 'bool', true);
      expect(store.getValue(0, 'bool')).toBe(true);

      // Should coerce to boolean
      store.setValue(1, 'bool', 0);
      expect(store.getValue(1, 'bool')).toBe(false);

      store.setValue(2, 'bool', 'yes');
      expect(store.getValue(2, 'bool')).toBe(true);
    });

    it('should return undefined for non-existent column', () => {
      expect(store.getValue(0, 'missing')).toBeUndefined();
    });

    it('should throw when setting non-existent column', () => {
      expect(() => store.setValue(0, 'missing', 123)).toThrow(
        'does not exist'
      );
    });

    it('should throw on out of bounds row access', () => {
      expect(() => store.getValue(100, 'int')).toThrow(RangeError);
      expect(() => store.setValue(100, 'int', 1)).toThrow(RangeError);
    });

    it('should throw on negative row index', () => {
      expect(() => store.getValue(-1, 'int')).toThrow(RangeError);
    });
  });

  describe('Row Operations', () => {
    let store: ColumnStore;

    beforeEach(() => {
      store = new ColumnStore({
        rowCount: 5,
        columns: [
          { name: 'id', type: 'int32' },
          { name: 'name', type: 'string' },
          { name: 'value', type: 'float64' },
        ],
      });
    });

    it('should get row as object', () => {
      store.setValue(0, 'id', 1);
      store.setValue(0, 'name', 'Alice');
      store.setValue(0, 'value', 99.5);

      const row = store.getRow(0);

      expect(row).toEqual({
        id: 1,
        name: 'Alice',
        value: 99.5,
      });
    });

    it('should set multiple values in row', () => {
      store.setRow(0, {
        id: 10,
        name: 'Bob',
        value: 42.0,
      });

      expect(store.getValue(0, 'id')).toBe(10);
      expect(store.getValue(0, 'name')).toBe('Bob');
      expect(store.getValue(0, 'value')).toBe(42.0);
    });

    it('should ignore non-existent columns in setRow', () => {
      expect(() =>
        store.setRow(0, {
          id: 1,
          missing: 'value',
        })
      ).not.toThrow();

      expect(store.getValue(0, 'id')).toBe(1);
    });
  });

  describe('Column Operations', () => {
    let store: ColumnStore;

    beforeEach(() => {
      store = new ColumnStore({
        rowCount: 5,
        columns: [{ name: 'values', type: 'int32' }],
      });
    });

    it('should get entire column', () => {
      for (let i = 0; i < 5; i++) {
        store.setValue(i, 'values', i * 10);
      }

      const column = store.getColumn('values');

      expect(column).toEqual([0, 10, 20, 30, 40]);
    });

    it('should set entire column', () => {
      store.setColumn('values', [5, 10, 15, 20, 25]);

      expect(store.getValue(0, 'values')).toBe(5);
      expect(store.getValue(4, 'values')).toBe(25);
    });

    it('should throw when setting column with wrong length', () => {
      expect(() => store.setColumn('values', [1, 2, 3])).toThrow(
        'must match row count'
      );
    });

    it('should throw when getting non-existent column', () => {
      expect(() => store.getColumn('missing')).toThrow('does not exist');
    });
  });

  describe('Aggregations', () => {
    let store: ColumnStore;

    beforeEach(() => {
      store = new ColumnStore({
        rowCount: 5,
        columns: [{ name: 'values', type: 'float64' }],
      });

      store.setColumn('values', [10, 20, 30, 40, 50]);
    });

    it('should calculate sum', () => {
      const result = store.aggregate('values', 'sum');

      expect(result.value).toBe(150);
      expect(result.count).toBe(5);
      expect(result.operation).toBe('sum');
    });

    it('should calculate average', () => {
      const result = store.aggregate('values', 'avg');

      expect(result.value).toBe(30);
      expect(result.count).toBe(5);
    });

    it('should calculate min', () => {
      const result = store.aggregate('values', 'min');

      expect(result.value).toBe(10);
      expect(result.count).toBe(5);
    });

    it('should calculate max', () => {
      const result = store.aggregate('values', 'max');

      expect(result.value).toBe(50);
      expect(result.count).toBe(5);
    });

    it('should count values', () => {
      const result = store.aggregate('values', 'count');

      expect(result.value).toBe(5);
      expect(result.count).toBe(5);
    });

    it('should throw when aggregating non-numeric column', () => {
      store.addColumn({ name: 'labels', type: 'string' });

      expect(() => store.aggregate('labels', 'sum')).toThrow('non-numeric');
    });

    it('should handle empty column', () => {
      const emptyStore = new ColumnStore({
        rowCount: 0,
        columns: [{ name: 'vals', type: 'int32' }],
      });

      const sum = emptyStore.aggregate('vals', 'sum');
      expect(sum.value).toBe(0);
      expect(sum.count).toBe(0);

      const avg = emptyStore.aggregate('vals', 'avg');
      expect(avg.value).toBe(0);
    });
  });

  describe('Row Management', () => {
    it('should add rows', () => {
      const store = new ColumnStore({
        rowCount: 5,
        columns: [
          { name: 'id', type: 'int32' },
          { name: 'value', type: 'float64' },
        ],
      });

      store.setValue(4, 'id', 100);

      store.addRows(5);

      expect(store.rowCount).toBe(10);
      expect(store.getValue(4, 'id')).toBe(100); // Old data preserved
      expect(store.getValue(9, 'id')).toBe(0); // New rows initialized
    });

    it('should not add rows when count is 0 or negative', () => {
      const store = new ColumnStore({ rowCount: 5 });

      store.addRows(0);
      expect(store.rowCount).toBe(5);

      store.addRows(-5);
      expect(store.rowCount).toBe(5);
    });
  });

  describe('Auto-grow', () => {
    it('should auto-grow when accessing beyond rowCount', () => {
      const store = new ColumnStore({
        rowCount: 5,
        autoGrow: true,
        columns: [{ name: 'id', type: 'int32' }],
      });

      store.setValue(10, 'id', 999);

      expect(store.rowCount).toBe(11);
      expect(store.getValue(10, 'id')).toBe(999);
    });

    it('should not auto-grow when disabled', () => {
      const store = new ColumnStore({
        rowCount: 5,
        autoGrow: false,
        columns: [{ name: 'id', type: 'int32' }],
      });

      expect(() => store.setValue(10, 'id', 999)).toThrow(RangeError);
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      const store = new ColumnStore({
        rowCount: 3,
        columns: [
          { name: 'int', type: 'int32' },
          { name: 'str', type: 'string' },
        ],
      });

      store.setValue(0, 'int', 42);
      store.setValue(0, 'str', 'hello');

      store.clear();

      expect(store.getValue(0, 'int')).toBe(0);
      expect(store.getValue(0, 'str')).toBeNull();
      expect(store.rowCount).toBe(3); // Rows not removed
      expect(store.columnCount).toBe(2); // Columns not removed
    });
  });

  describe('Use Case: Dense Grid Data', () => {
    it('should efficiently store numeric grid data', () => {
      const rows = 1000;
      const store = new ColumnStore({
        rowCount: rows,
        columns: [
          { name: 'x', type: 'float64' },
          { name: 'y', type: 'float64' },
          { name: 'value', type: 'float64' },
        ],
      });

      // Populate grid
      for (let i = 0; i < rows; i++) {
        store.setRow(i, {
          x: i * 0.1,
          y: Math.sin(i * 0.1),
          value: Math.random() * 100,
        });
      }

      // Aggregate
      const sumValues = store.aggregate('value', 'sum');
      const avgY = store.aggregate('y', 'avg');

      expect(sumValues.count).toBe(rows);
      expect(avgY.count).toBe(rows);
      expect(sumValues.value).toBeGreaterThan(0);
    });

    it('should handle mixed column types', () => {
      const store = new ColumnStore({
        rowCount: 3,
        columns: [
          { name: 'id', type: 'int32' },
          { name: 'name', type: 'string' },
          { name: 'price', type: 'float64' },
          { name: 'active', type: 'boolean' },
        ],
      });

      const items = [
        { id: 1, name: 'Apple', price: 1.99, active: true },
        { id: 2, name: 'Banana', price: 0.99, active: true },
        { id: 3, name: 'Cherry', price: 2.49, active: false },
      ];

      items.forEach((item, i) => store.setRow(i, item));

      const totalPrice = store.aggregate('price', 'sum');
      expect(totalPrice.value).toBeCloseTo(5.47);

      const maxId = store.aggregate('id', 'max');
      expect(maxId.value).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero row count', () => {
      const store = new ColumnStore({
        rowCount: 0,
        columns: [{ name: 'id', type: 'int32' }],
      });

      expect(store.rowCount).toBe(0);
      expect(() => store.getValue(0, 'id')).toThrow(RangeError);
    });

    it('should handle large values', () => {
      const store = new ColumnStore({
        rowCount: 1,
        columns: [{ name: 'big', type: 'float64' }],
      });

      store.setValue(0, 'big', 1e100);
      expect(store.getValue(0, 'big')).toBe(1e100);
    });

    it('should handle null/undefined string values', () => {
      const store = new ColumnStore({
        rowCount: 2,
        columns: [{ name: 'str', type: 'string' }],
      });

      store.setValue(0, 'str', null);
      store.setValue(1, 'str', undefined);

      expect(store.getValue(0, 'str')).toBeNull();
      expect(store.getValue(1, 'str')).toBeNull();
    });
  });
});
