import type {
  CellRef,
  CellRange,
  FilterAst,
  FilterAstNode,
  FilterValueType,
  GridOptions,
  QueryPaginationState,
  QueryState,
} from './index';

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
        enableA11y: true,
      };

      expect(options.enableSelection).toBe(true);
    });
  });

  describe('QueryState', () => {
    it('should model a canonical query envelope with optional slices', () => {
      const pagination: QueryPaginationState = {
        page: 0,
        pageSize: 25,
        offset: 0,
      };

      const query: QueryState = {
        version: 1,
        pagination,
      };

      const node: FilterAstNode = {
        kind: 'group',
        logic: 'AND',
        children: [],
      };
      const filter: FilterAst = { version: 1, root: node };
      const valueType: FilterValueType = 'text';

      expect(query.version).toBe(1);
      expect(query.pagination).toEqual(pagination);
      expect(filter.root).toEqual(node);
      expect(valueType).toBe('text');
    });
  });
});
