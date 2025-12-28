import type { CellRef, CellRange, GridOptions } from './index';

describe('Core Types', () => {
  describe('CellRef', () => {
    it('should define cell reference structure', () => {
      const cellRef: CellRef = { row: 0, col: 0 };
      expect(cellRef.row).toBe(0);
      expect(cellRef.col).toBe(0);
    });
  });

  describe('CellRange', () => {
    it('should define cell range structure', () => {
      const range: CellRange = {
        startRow: 0,
        startCol: 0,
        endRow: 10,
        endCol: 5,
      };

      expect(range.startRow).toBe(0);
      expect(range.endRow).toBe(10);
    });
  });

  describe('GridOptions', () => {
    it('should accept minimal configuration', () => {
      const options: GridOptions = {
        rowCount: 100,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      };

      expect(options.rowCount).toBe(100);
      expect(options.colCount).toBe(10);
    });

    it('should accept full configuration', () => {
      const options: GridOptions = {
        rowCount: 1000,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        enableSelection: true,
        enableEditing: true,
        enableA11y: true,
        locale: 'en-US',
        direction: 'ltr',
      };

      expect(options.enableSelection).toBe(true);
      expect(options.locale).toBe('en-US');
    });
  });
});
