import type {
  VirtualScroller as IVirtualScroller,
  VirtualScrollerOptions,
  CellPosition,
} from './virtual-scroller.interface';
import type { HeightProvider } from '../height-provider';
import type { WidthProvider } from '../width-provider';
import { UniformHeightProvider } from '../height-provider/uniform-height-provider';
import { VariableHeightProvider } from '../height-provider/variable-height-provider';
import { UniformWidthProvider } from '../width-provider/uniform-width-provider';
import { VariableWidthProvider } from '../width-provider/variable-width-provider';
import type { VisibleRange } from '../../types';

/**
 * VirtualScroller implementation
 *
 * Calculates visible ranges for virtual scrolling with configurable height/width strategies.
 * Uses PrefixSumArray (via providers) for efficient offset-to-index lookups.
 *
 * @example
 * ```typescript
 * const scroller = new VirtualScroller({
 *   rowCount: 10000,
 *   colCount: 20,
 *   rowHeight: 30,
 *   colWidth: 100,
 *   viewportWidth: 800,
 *   viewportHeight: 600,
 * });
 *
 * const visible = scroller.calculateVisibleRange(1000, 0);
 * // { startRow: 30, endRow: 53, startCol: 0, endCol: 10 }
 * ```
 */
export class VirtualScroller implements IVirtualScroller {
  private heightProvider: HeightProvider;
  private widthProvider: WidthProvider;
  private rows: number;
  private cols: number;
  private vpWidth: number;
  private vpHeight: number;
  private overscanRows: number;
  private overscanCols: number;

  constructor(options: VirtualScrollerOptions) {
    this.rows = options.rowCount;
    this.cols = options.colCount;
    this.vpWidth = options.viewportWidth;
    this.vpHeight = options.viewportHeight;
    this.overscanRows = options.overscanRows ?? 3;
    this.overscanCols = options.overscanCols ?? 2;

    // Auto-select height provider
    if (options.heightProvider) {
      this.heightProvider = options.heightProvider;
    } else if (Array.isArray(options.rowHeight)) {
      this.heightProvider = new VariableHeightProvider(options.rowHeight);
    } else {
      this.heightProvider = new UniformHeightProvider(
        options.rowHeight ?? 30,
        options.rowCount
      );
    }

    // Auto-select width provider
    if (options.widthProvider) {
      this.widthProvider = options.widthProvider;
    } else if (Array.isArray(options.colWidth)) {
      this.widthProvider = new VariableWidthProvider(options.colWidth);
    } else {
      this.widthProvider = new UniformWidthProvider(
        options.colWidth ?? 100,
        options.colCount
      );
    }
  }

  calculateVisibleRange(scrollTop: number, scrollLeft: number): VisibleRange {
    // Clamp scroll positions
    scrollTop = Math.max(0, scrollTop);
    scrollLeft = Math.max(0, scrollLeft);

    // Find first visible row (with overscan)
    const firstVisibleRow = this.heightProvider.findIndexAtOffset(scrollTop);
    const startRow = Math.max(0, firstVisibleRow - this.overscanRows);

    // Find last visible row (with overscan)
    const endOffset = scrollTop + this.vpHeight;
    const lastVisibleRow = this.heightProvider.findIndexAtOffset(endOffset);
    const endRow = Math.min(
      this.rows,
      lastVisibleRow + this.overscanRows + 1
    );

    // Find first visible column (with overscan)
    const firstVisibleCol = this.widthProvider.findIndexAtOffset(scrollLeft);
    const startCol = Math.max(0, firstVisibleCol - this.overscanCols);

    // Find last visible column (with overscan)
    const endColOffset = scrollLeft + this.vpWidth;
    const lastVisibleCol = this.widthProvider.findIndexAtOffset(endColOffset);
    const endCol = Math.min(this.cols, lastVisibleCol + this.overscanCols + 1);

    return {
      startRow,
      endRow,
      startCol,
      endCol,
    };
  }

  getCellPosition(row: number, col: number): CellPosition {
    return {
      x: this.widthProvider.getOffset(col),
      y: this.heightProvider.getOffset(row),
      width: this.widthProvider.getWidth(col),
      height: this.heightProvider.getHeight(row),
    };
  }

  getRowAtOffset(offset: number): number {
    return this.heightProvider.findIndexAtOffset(offset);
  }

  getColAtOffset(offset: number): number {
    return this.widthProvider.findIndexAtOffset(offset);
  }

  getRowOffset(row: number): number {
    return this.heightProvider.getOffset(row);
  }

  getColOffset(col: number): number {
    return this.widthProvider.getOffset(col);
  }

  getRowHeight(row: number): number {
    return this.heightProvider.getHeight(row);
  }

  getColWidth(col: number): number {
    return this.widthProvider.getWidth(col);
  }

  getTotalHeight(): number {
    return this.heightProvider.getTotalHeight();
  }

  getTotalWidth(): number {
    return this.widthProvider.getTotalWidth();
  }

  updateRowHeight(row: number, height: number): void {
    if (!this.heightProvider.setHeight) {
      throw new Error(
        'Height provider does not support setHeight (use VariableHeightProvider)'
      );
    }
    this.heightProvider.setHeight(row, height);
  }

  updateColWidth(col: number, width: number): void {
    if (!this.widthProvider.setWidth) {
      throw new Error(
        'Width provider does not support setWidth (use VariableWidthProvider)'
      );
    }
    this.widthProvider.setWidth(col, width);
  }

  setViewport(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      throw new RangeError('Viewport dimensions must be positive');
    }
    this.vpWidth = width;
    this.vpHeight = height;
  }

  get rowCount(): number {
    return this.rows;
  }

  get colCount(): number {
    return this.cols;
  }

  get viewportWidth(): number {
    return this.vpWidth;
  }

  get viewportHeight(): number {
    return this.vpHeight;
  }

  getWidthProvider(): WidthProvider {
    return this.widthProvider;
  }

  getHeightProvider(): HeightProvider {
    return this.heightProvider;
  }
}
