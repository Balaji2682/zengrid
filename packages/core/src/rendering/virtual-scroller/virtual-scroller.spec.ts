import { VirtualScroller } from './virtual-scroller';
import { UniformHeightProvider } from '../height-provider/uniform-height-provider';
import { UniformWidthProvider } from '../width-provider/uniform-width-provider';

describe('VirtualScroller', () => {
  describe('constructor', () => {
    it('should create with minimal options (uniform dimensions)', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(scroller.rowCount).toBe(100);
      expect(scroller.colCount).toBe(20);
      expect(scroller.viewportWidth).toBe(800);
      expect(scroller.viewportHeight).toBe(600);
    });

    it('should use default row height (30) and column width (100)', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(scroller.getRowHeight(0)).toBe(30);
      expect(scroller.getColWidth(0)).toBe(100);
    });

    it('should accept custom uniform row height and column width', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 40,
        colWidth: 150,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(scroller.getRowHeight(0)).toBe(40);
      expect(scroller.getColWidth(0)).toBe(150);
    });

    it('should auto-create VariableHeightProvider from array', () => {
      const scroller = new VirtualScroller({
        rowCount: 5,
        colCount: 3,
        rowHeight: [30, 40, 50, 30, 60],
        colWidth: 100,
        viewportWidth: 300,
        viewportHeight: 210,
      });

      expect(scroller.getRowHeight(0)).toBe(30);
      expect(scroller.getRowHeight(1)).toBe(40);
      expect(scroller.getRowHeight(2)).toBe(50);
    });

    it('should auto-create VariableWidthProvider from array', () => {
      const scroller = new VirtualScroller({
        rowCount: 10,
        colCount: 3,
        rowHeight: 30,
        colWidth: [100, 150, 200],
        viewportWidth: 450,
        viewportHeight: 300,
      });

      expect(scroller.getColWidth(0)).toBe(100);
      expect(scroller.getColWidth(1)).toBe(150);
      expect(scroller.getColWidth(2)).toBe(200);
    });

    it('should accept custom heightProvider', () => {
      const provider = new UniformHeightProvider(50, 100);
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        heightProvider: provider,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(scroller.getRowHeight(0)).toBe(50);
    });

    it('should accept custom widthProvider', () => {
      const provider = new UniformWidthProvider(200, 20);
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        widthProvider: provider,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(scroller.getColWidth(0)).toBe(200);
    });

    it('should use default overscan values (3 rows, 2 cols)', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      const visible = scroller.calculateVisibleRange(0, 0);
      // At scroll 0, should start at 0 (can't go negative) and include overscan
      expect(visible.startRow).toBe(0);
      expect(visible.startCol).toBe(0);
    });

    it('should accept custom overscan values', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
        overscanRows: 5,
        overscanCols: 3,
      });

      // Overscan values are applied, test via calculateVisibleRange
      const visible = scroller.calculateVisibleRange(300, 500);
      // First visible row at 300 / 30 = 10, minus 5 overscan = 5
      expect(visible.startRow).toBe(5);
      // First visible col at 500 / 100 = 5, minus 3 overscan = 2
      expect(visible.startCol).toBe(2);
    });
  });

  describe('calculateVisibleRange - uniform dimensions', () => {
    const scroller = new VirtualScroller({
      rowCount: 100,
      colCount: 20,
      rowHeight: 30,
      colWidth: 100,
      viewportWidth: 800, // 8 columns visible
      viewportHeight: 600, // 20 rows visible
      overscanRows: 3,
      overscanCols: 2,
    });

    it('should calculate visible range at scroll (0, 0)', () => {
      const visible = scroller.calculateVisibleRange(0, 0);

      expect(visible.startRow).toBe(0); // 0 - 3 = -3, clamped to 0
      expect(visible.endRow).toBe(24); // row 20 + 3 overscan + 1
      expect(visible.startCol).toBe(0); // 0 - 2 = -2, clamped to 0
      expect(visible.endCol).toBe(11); // col 8 + 2 overscan + 1
    });

    it('should calculate visible range with vertical scroll', () => {
      const visible = scroller.calculateVisibleRange(300, 0);
      // scrollTop 300 / 30 = row 10 starts visible
      // startRow = 10 - 3 = 7
      // endRow = (300 + 600) / 30 = 30, plus 3 overscan + 1 = 34

      expect(visible.startRow).toBe(7);
      expect(visible.endRow).toBe(34);
    });

    it('should calculate visible range with horizontal scroll', () => {
      const visible = scroller.calculateVisibleRange(0, 500);
      // scrollLeft 500 / 100 = col 5 starts visible
      // startCol = 5 - 2 = 3
      // endCol = (500 + 800) / 100 = 13, plus 2 overscan + 1 = 16

      expect(visible.startCol).toBe(3);
      expect(visible.endCol).toBe(16);
    });

    it('should calculate visible range with both scroll directions', () => {
      const visible = scroller.calculateVisibleRange(450, 700);

      expect(visible.startRow).toBe(12); // (450/30=15) - 3
      expect(visible.endRow).toBe(39); // ((450+600)/30=35) + 3 + 1
      expect(visible.startCol).toBe(5); // (700/100=7) - 2
      expect(visible.endCol).toBe(18); // ((700+800)/100=15) + 2 + 1 = 18
    });

    it('should clamp endRow to rowCount', () => {
      const visible = scroller.calculateVisibleRange(2700, 0); // Scroll near end

      expect(visible.endRow).toBe(100); // Clamped to rowCount
    });

    it('should clamp endCol to colCount', () => {
      const visible = scroller.calculateVisibleRange(0, 1800); // Scroll near end

      expect(visible.endCol).toBe(20); // Clamped to colCount
    });

    it('should handle negative scroll positions', () => {
      const visible = scroller.calculateVisibleRange(-100, -50);

      expect(visible.startRow).toBe(0);
      expect(visible.startCol).toBe(0);
    });
  });

  describe('calculateVisibleRange - variable dimensions', () => {
    const scroller = new VirtualScroller({
      rowCount: 5,
      colCount: 5,
      rowHeight: [30, 40, 50, 30, 60], // Total: 210
      colWidth: [100, 150, 200, 100, 120], // Total: 670
      viewportWidth: 400,
      viewportHeight: 100,
      overscanRows: 1,
      overscanCols: 1,
    });

    it('should calculate visible range at scroll (0, 0)', () => {
      const visible = scroller.calculateVisibleRange(0, 0);

      expect(visible.startRow).toBe(0);
      expect(visible.startCol).toBe(0);
      // Viewport height 100: rows 0 (30) + 1 (40) + 2 (50) = 120, so endRow = 3 + 1 overscan = 4
      expect(visible.endRow).toBe(4);
      // Viewport width 400: cols 0 (100) + 1 (150) + 2 (200) = 450, so endCol = 3 + 1 overscan = 4
      expect(visible.endCol).toBe(4);
    });

    it('should find correct rows for mid-scroll position', () => {
      // Scroll to 70 pixels (row 0 = 30, row 1 starts at 30, ends at 70)
      const visible = scroller.calculateVisibleRange(70, 0);

      // First visible row at offset 70 is row 2 (offset 70 = rows 0+1)
      expect(visible.startRow).toBe(1); // 2 - 1 overscan
      // Viewport 100px from 70 = 170, which includes up to row 3 (offset 120-150)
      expect(visible.endRow).toBe(5); // row 4 + 1 overscan, clamped to 5
    });

    it('should find correct columns for mid-scroll position', () => {
      // Scroll to 250 pixels (col 0 = 100, col 1 = 150, total 250)
      const visible = scroller.calculateVisibleRange(0, 250);

      // First visible col at offset 250 is col 2 (offset 250 = cols 0+1)
      expect(visible.startCol).toBe(1); // 2 - 1 overscan
      // Viewport 400px from 250 = 650, which includes up to col 4
      expect(visible.endCol).toBe(5); // col 4 + 1 overscan, clamped to 5
    });
  });

  describe('getCellPosition', () => {
    const scroller = new VirtualScroller({
      rowCount: 5,
      colCount: 3,
      rowHeight: [30, 40, 50, 30, 60],
      colWidth: [100, 150, 200],
      viewportWidth: 450,
      viewportHeight: 210,
    });

    it('should return position for cell (0, 0)', () => {
      const pos = scroller.getCellPosition(0, 0);

      expect(pos).toEqual({ x: 0, y: 0, width: 100, height: 30 });
    });

    it('should return correct position for cell (2, 1)', () => {
      const pos = scroller.getCellPosition(2, 1);
      // Row 2: offset = 30 + 40 = 70, height = 50
      // Col 1: offset = 100, width = 150

      expect(pos).toEqual({ x: 100, y: 70, width: 150, height: 50 });
    });

    it('should return correct position for cell (4, 2)', () => {
      const pos = scroller.getCellPosition(4, 2);
      // Row 4: offset = 30 + 40 + 50 + 30 = 150, height = 60
      // Col 2: offset = 100 + 150 = 250, width = 200

      expect(pos).toEqual({ x: 250, y: 150, width: 200, height: 60 });
    });
  });

  describe('getRowAtOffset / getColAtOffset', () => {
    const scroller = new VirtualScroller({
      rowCount: 5,
      colCount: 3,
      rowHeight: [30, 40, 50, 30, 60],
      colWidth: [100, 150, 200],
      viewportWidth: 450,
      viewportHeight: 210,
    });

    it('should find row at offset 0', () => {
      expect(scroller.getRowAtOffset(0)).toBe(0);
    });

    it('should find row at offset 70 (boundary between row 1 and 2)', () => {
      expect(scroller.getRowAtOffset(70)).toBe(2);
    });

    it('should find row at offset 100 (mid-row 2)', () => {
      expect(scroller.getRowAtOffset(100)).toBe(2);
    });

    it('should find column at offset 0', () => {
      expect(scroller.getColAtOffset(0)).toBe(0);
    });

    it('should find column at offset 250 (boundary between col 1 and 2)', () => {
      expect(scroller.getColAtOffset(250)).toBe(2);
    });

    it('should find column at offset 180 (mid-col 1)', () => {
      expect(scroller.getColAtOffset(180)).toBe(1);
    });
  });

  describe('getRowOffset / getColOffset', () => {
    const scroller = new VirtualScroller({
      rowCount: 5,
      colCount: 3,
      rowHeight: [30, 40, 50, 30, 60],
      colWidth: [100, 150, 200],
      viewportWidth: 450,
      viewportHeight: 210,
    });

    it('should return offset for row 0', () => {
      expect(scroller.getRowOffset(0)).toBe(0);
    });

    it('should return offset for row 2', () => {
      expect(scroller.getRowOffset(2)).toBe(70); // 30 + 40
    });

    it('should return offset for row 4', () => {
      expect(scroller.getRowOffset(4)).toBe(150); // 30 + 40 + 50 + 30
    });

    it('should return offset for column 0', () => {
      expect(scroller.getColOffset(0)).toBe(0);
    });

    it('should return offset for column 2', () => {
      expect(scroller.getColOffset(2)).toBe(250); // 100 + 150
    });
  });

  describe('getTotalHeight / getTotalWidth', () => {
    it('should return total height for uniform rows', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(scroller.getTotalHeight()).toBe(3000); // 100 * 30
    });

    it('should return total height for variable rows', () => {
      const scroller = new VirtualScroller({
        rowCount: 5,
        colCount: 3,
        rowHeight: [30, 40, 50, 30, 60],
        colWidth: 100,
        viewportWidth: 300,
        viewportHeight: 210,
      });

      expect(scroller.getTotalHeight()).toBe(210); // 30 + 40 + 50 + 30 + 60
    });

    it('should return total width for uniform columns', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(scroller.getTotalWidth()).toBe(2000); // 20 * 100
    });

    it('should return total width for variable columns', () => {
      const scroller = new VirtualScroller({
        rowCount: 10,
        colCount: 3,
        rowHeight: 30,
        colWidth: [100, 150, 200],
        viewportWidth: 450,
        viewportHeight: 300,
      });

      expect(scroller.getTotalWidth()).toBe(450); // 100 + 150 + 200
    });
  });

  describe('updateRowHeight / updateColWidth', () => {
    it('should update row height for variable provider', () => {
      const scroller = new VirtualScroller({
        rowCount: 3,
        colCount: 3,
        rowHeight: [30, 40, 50],
        colWidth: 100,
        viewportWidth: 300,
        viewportHeight: 120,
      });

      scroller.updateRowHeight(1, 60); // Change row 1 from 40 to 60

      expect(scroller.getRowHeight(1)).toBe(60);
      expect(scroller.getRowOffset(2)).toBe(90); // 30 + 60
      expect(scroller.getTotalHeight()).toBe(140); // 30 + 60 + 50
    });

    it('should throw for uniform height provider', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(() => scroller.updateRowHeight(10, 40)).toThrow(
        'does not support setHeight'
      );
    });

    it('should update column width for variable provider', () => {
      const scroller = new VirtualScroller({
        rowCount: 10,
        colCount: 3,
        rowHeight: 30,
        colWidth: [100, 150, 200],
        viewportWidth: 450,
        viewportHeight: 300,
      });

      scroller.updateColWidth(1, 180); // Change col 1 from 150 to 180

      expect(scroller.getColWidth(1)).toBe(180);
      expect(scroller.getColOffset(2)).toBe(280); // 100 + 180
      expect(scroller.getTotalWidth()).toBe(480); // 100 + 180 + 200
    });

    it('should throw for uniform width provider', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(() => scroller.updateColWidth(10, 150)).toThrow(
        'does not support setWidth'
      );
    });
  });

  describe('setViewport', () => {
    it('should update viewport dimensions', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      scroller.setViewport(1200, 900);

      expect(scroller.viewportWidth).toBe(1200);
      expect(scroller.viewportHeight).toBe(900);
    });

    it('should affect visible range calculation', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
        overscanRows: 0,
        overscanCols: 0,
      });

      const before = scroller.calculateVisibleRange(0, 0);

      scroller.setViewport(1200, 900);

      const after = scroller.calculateVisibleRange(0, 0);

      // More rows and columns should be visible with larger viewport
      expect(after.endRow).toBeGreaterThan(before.endRow);
      expect(after.endCol).toBeGreaterThan(before.endCol);
    });

    it('should throw on non-positive dimensions', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(() => scroller.setViewport(0, 600)).toThrow(
        'Viewport dimensions must be positive'
      );
      expect(() => scroller.setViewport(800, -1)).toThrow(
        'Viewport dimensions must be positive'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle zero rows', () => {
      const scroller = new VirtualScroller({
        rowCount: 0,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      const visible = scroller.calculateVisibleRange(0, 0);

      expect(visible.startRow).toBe(0);
      expect(visible.endRow).toBe(0);
    });

    it('should handle zero columns', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 0,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      const visible = scroller.calculateVisibleRange(0, 0);

      expect(visible.startCol).toBe(0);
      expect(visible.endCol).toBe(0);
    });

    it('should handle very large scroll position', () => {
      const scroller = new VirtualScroller({
        rowCount: 100,
        colCount: 20,
        rowHeight: 30,
        colWidth: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      });

      const visible = scroller.calculateVisibleRange(100000, 50000);

      expect(visible.endRow).toBe(100);
      expect(visible.endCol).toBe(20);
    });
  });
});
