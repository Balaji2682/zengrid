import type {
  ColumnResizeOptions,
  ResizableDataSource,
  ColumnConstraints,
} from './column-resize-manager.interface';
import { ColumnResizeManager } from './column-resize-manager';

/**
 * Mock data source for testing
 */
export class MockResizableDataSource implements ResizableDataSource {
  private widths: number[];
  private offsets: number[];
  private data: any[][] = [];

  constructor(
    private colCount: number,
    initialWidth: number = 100,
    private rowCount: number = 100
  ) {
    this.widths = new Array(colCount).fill(initialWidth);
    this.offsets = this.calculateOffsets();

    // Generate mock data
    for (let row = 0; row < rowCount; row++) {
      const rowData: any[] = [];
      for (let col = 0; col < colCount; col++) {
        rowData.push(`Cell ${row},${col}`);
      }
      this.data.push(rowData);
    }
  }

  private calculateOffsets(): number[] {
    const offsets: number[] = [];
    let currentOffset = 0;
    for (let i = 0; i < this.colCount; i++) {
      offsets.push(currentOffset);
      currentOffset += this.widths[i];
    }
    return offsets;
  }

  getColumnCount(): number {
    return this.colCount;
  }

  getColumnOffset(col: number): number {
    return this.offsets[col] ?? 0;
  }

  getColumnWidth(col: number): number {
    return this.widths[col] ?? 100;
  }

  setColumnWidth(col: number, width: number): void {
    this.widths[col] = width;
    this.offsets = this.calculateOffsets();
  }

  getValue(row: number, col: number): any {
    return this.data[row]?.[col] ?? '';
  }

  getRowCount(): number {
    return this.rowCount;
  }

  // Test helpers
  getWidths(): number[] {
    return [...this.widths];
  }

  setWidths(widths: number[]): void {
    this.widths = [...widths];
    this.offsets = this.calculateOffsets();
  }
}

/**
 * Test helper utilities for column resize feature
 */
export class ResizeTestHelper {
  /**
   * Create a mock resize manager for testing
   */
  static createMockResizeManager(
    options?: Partial<ColumnResizeOptions>
  ): {
    manager: ColumnResizeManager;
    dataSource: MockResizableDataSource;
    container: HTMLElement;
  } {
    const colCount = options?.colCount ?? 5;
    const rowCount = options?.rowCount ?? 100;

    // Create mock data source
    const dataSource = new MockResizableDataSource(colCount, 100, rowCount);

    // Create container
    const container = document.createElement('div');
    container.style.width = '500px';
    container.style.height = '300px';
    document.body.appendChild(container);

    // Create manager
    const manager = new ColumnResizeManager({
      colCount,
      rowCount,
      getColOffset: (col) => dataSource.getColumnOffset(col),
      getColWidth: (col) => dataSource.getColumnWidth(col),
      onWidthChange: (col, width) => dataSource.setColumnWidth(col, width),
      getValue: (row, col) => dataSource.getValue(row, col),
      ...options,
    });

    return { manager, dataSource, container };
  }

  /**
   * Simulate a resize operation without DOM
   */
  static simulateResize(
    dataSource: ResizableDataSource,
    column: number,
    newWidth: number,
    constraints?: ColumnConstraints
  ): { oldWidth: number; newWidth: number } {
    const oldWidth = dataSource.getColumnWidth(column);

    // Apply constraints if provided
    let constrainedWidth = newWidth;
    if (constraints) {
      if (constraints.minWidth !== undefined) {
        constrainedWidth = Math.max(constrainedWidth, constraints.minWidth);
      }
      if (constraints.maxWidth !== undefined) {
        constrainedWidth = Math.min(constrainedWidth, constraints.maxWidth);
      }
    }

    dataSource.setColumnWidth(column, constrainedWidth);

    return { oldWidth, newWidth: constrainedWidth };
  }

  /**
   * Simulate a mouse drag resize
   */
  static simulateMouseDrag(
    container: HTMLElement,
    startX: number,
    endX: number
  ): void {
    // Simulate mousedown
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: startX,
      button: 0,
      bubbles: true,
    });
    container.dispatchEvent(mouseDownEvent);

    // Simulate mousemove
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: endX,
      bubbles: true,
    });
    document.dispatchEvent(mouseMoveEvent);

    // Simulate mouseup
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: endX,
      bubbles: true,
    });
    document.dispatchEvent(mouseUpEvent);
  }

  /**
   * Simulate double-click for auto-fit
   */
  static simulateDoubleClick(container: HTMLElement, x: number): void {
    const dblClickEvent = new MouseEvent('dblclick', {
      clientX: x,
      bubbles: true,
    });
    container.dispatchEvent(dblClickEvent);
  }

  /**
   * Clean up test resources
   */
  static cleanup(container: HTMLElement): void {
    container.remove();
  }

  /**
   * Assert that widths match expected values
   */
  static assertWidths(
    dataSource: ResizableDataSource,
    expected: number[],
    tolerance: number = 0.1
  ): boolean {
    const colCount = dataSource.getColumnCount();
    if (colCount !== expected.length) {
      console.error(
        `Column count mismatch: expected ${expected.length}, got ${colCount}`
      );
      return false;
    }

    for (let col = 0; col < colCount; col++) {
      const actual = dataSource.getColumnWidth(col);
      const exp = expected[col];
      if (Math.abs(actual - exp) > tolerance) {
        console.error(
          `Width mismatch at column ${col}: expected ${exp}, got ${actual}`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Create a test scenario with specific column widths and constraints
   */
  static createTestScenario(config: {
    columnWidths: number[];
    constraints?: Map<number, ColumnConstraints>;
    rowCount?: number;
  }): {
    manager: ColumnResizeManager;
    dataSource: MockResizableDataSource;
    container: HTMLElement;
  } {
    const colCount = config.columnWidths.length;
    const rowCount = config.rowCount ?? 100;

    const dataSource = new MockResizableDataSource(colCount, 100, rowCount);
    dataSource.setWidths(config.columnWidths);

    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const manager = new ColumnResizeManager({
      colCount,
      rowCount,
      getColOffset: (col) => dataSource.getColumnOffset(col),
      getColWidth: (col) => dataSource.getColumnWidth(col),
      onWidthChange: (col, width) => dataSource.setColumnWidth(col, width),
      getValue: (row, col) => dataSource.getValue(row, col),
      columnConstraints: config.constraints,
    });

    return { manager, dataSource, container };
  }
}
