import { GridDataModel } from './grid-data-model';

describe('GridDataModel', () => {
  describe('sparse storage', () => {
    let model: GridDataModel;

    beforeEach(() => {
      model = new GridDataModel({
        rowCount: 100,
        colCount: 10,
        storage: 'sparse',
      });
    });

    it('should create instance', () => {
      expect(model).toBeDefined();
      expect(model.rowCount).toBe(100);
      expect(model.colCount).toBe(10);
    });

    it('should get/set values', () => {
      model.setValue(0, 0, 'test');
      expect(model.getValue(0, 0)).toBe('test');
    });

    it('should return undefined for unset cells', () => {
      expect(model.getValue(5, 5)).toBeUndefined();
    });

    it('should delete value when set to null', () => {
      model.setValue(0, 0, 'test');
      model.setValue(0, 0, null);
      expect(model.getValue(0, 0)).toBeUndefined();
    });

    it('should get row data', () => {
      model.setValue(0, 0, 'A');
      model.setValue(0, 1, 'B');
      model.setValue(0, 2, 'C');

      const row = model.getRow(0) as any[];
      expect(row[0]).toBe('A');
      expect(row[1]).toBe('B');
      expect(row[2]).toBe('C');
    });

    it('should get column data', () => {
      model.setValue(0, 0, 'A');
      model.setValue(1, 0, 'B');
      model.setValue(2, 0, 'C');

      const col = model.getColumn(0);
      expect(col[0]).toBe('A');
      expect(col[1]).toBe('B');
      expect(col[2]).toBe('C');
    });

    it('should clear all data', () => {
      model.setValue(0, 0, 'test');
      model.clear();
      expect(model.getValue(0, 0)).toBeUndefined();
    });

    it('should emit change events', () => {
      const handler = jest.fn();
      model.events?.on('change', handler);

      model.setValue(0, 0, 'test');

      expect(handler).toHaveBeenCalledWith({
        cell: { row: 0, col: 0 },
        oldValue: undefined,
        newValue: 'test',
      });
    });

    it('should emit bulk change events', () => {
      const handler = jest.fn();
      model.events?.on('bulkChange', handler);

      const data = [
        ['A', 'B'],
        ['C', 'D'],
      ];
      model.setData(data);

      expect(handler).toHaveBeenCalledWith({
        changes: expect.arrayContaining([
          { cell: { row: 0, col: 0 }, oldValue: undefined, newValue: 'A' },
          { cell: { row: 0, col: 1 }, oldValue: undefined, newValue: 'B' },
          { cell: { row: 1, col: 0 }, oldValue: undefined, newValue: 'C' },
          { cell: { row: 1, col: 1 }, oldValue: undefined, newValue: 'D' },
        ]),
      });
    });

    it('should check if cell has value', () => {
      model.setValue(0, 0, 'test');
      expect(model.hasValue(0, 0)).toBe(true);
      expect(model.hasValue(1, 1)).toBe(false);
    });

    it('should get cell count', () => {
      model.setValue(0, 0, 'A');
      model.setValue(0, 1, 'B');
      model.setValue(1, 0, 'C');

      expect(model.getCellCount()).toBe(3);
    });

    it('should throw on out of bounds setValue', () => {
      expect(() => model.setValue(-1, 0, 'test')).toThrow();
      expect(() => model.setValue(0, -1, 'test')).toThrow();
      expect(() => model.setValue(1000, 0, 'test')).toThrow();
      expect(() => model.setValue(0, 1000, 'test')).toThrow();
    });
  });

  describe('columnar storage', () => {
    let model: GridDataModel;

    beforeEach(() => {
      model = new GridDataModel({
        rowCount: 100,
        colCount: 3,
        storage: 'columnar',
        columns: [
          { name: 'id', type: 'number' },
          { name: 'name', type: 'string' },
          { name: 'active', type: 'boolean' },
        ],
      });
    });

    it('should create instance', () => {
      expect(model).toBeDefined();
      expect(model.getStorageType()).toBe('columnar');
    });

    it('should get/set values', () => {
      model.setValue(0, 0, 123);
      model.setValue(0, 1, 'Alice');
      model.setValue(0, 2, true);

      expect(model.getValue(0, 0)).toBe(123);
      expect(model.getValue(0, 1)).toBe('Alice');
      expect(model.getValue(0, 2)).toBe(true);
    });

    it('should get row data', () => {
      model.setValue(0, 0, 1);
      model.setValue(0, 1, 'Bob');
      model.setValue(0, 2, false);

      const row = model.getRow(0);
      expect(row).toHaveProperty('id', 1);
      expect(row).toHaveProperty('name', 'Bob');
      expect(row).toHaveProperty('active', false);
    });

    it('should require columns for columnar storage', () => {
      expect(() => {
        new GridDataModel({
          rowCount: 100,
          colCount: 10,
          storage: 'columnar',
        });
      }).toThrow();
    });
  });

  describe('events disabled', () => {
    it('should not emit events when disabled', () => {
      const model = new GridDataModel({
        rowCount: 100,
        colCount: 10,
        enableEvents: false,
      });

      expect(model.events).toBeUndefined();
    });
  });
});
