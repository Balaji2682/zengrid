import type {
  ResizeStrategy,
  ResizeState,
  ResizableDataSource,
} from './column-resize-manager.interface';

/**
 * Default strategy: Resize single column independently
 */
export class SingleColumnResizeStrategy implements ResizeStrategy {
  readonly name = 'single-column';

  calculateNewWidth(
    state: ResizeState,
    currentX: number,
    dataSource: ResizableDataSource
  ): number {
    const deltaX = currentX - state.startX;
    return state.originalWidth + deltaX;
  }

  getAffectedColumns(column: number, dataSource: ResizableDataSource): number[] {
    return [column];
  }
}

/**
 * Proportional resize: Distribute extra/reduced space across all columns
 */
export class ProportionalResizeStrategy implements ResizeStrategy {
  readonly name = 'proportional';

  calculateNewWidth(
    state: ResizeState,
    currentX: number,
    dataSource: ResizableDataSource
  ): number {
    const deltaX = currentX - state.startX;
    return state.originalWidth + deltaX;
  }

  getAffectedColumns(column: number, dataSource: ResizableDataSource): number[] {
    const colCount = dataSource.getColumnCount();
    const affected: number[] = [];

    // Affect all columns after the resized one
    for (let i = column + 1; i < colCount; i++) {
      affected.push(i);
    }

    return [column, ...affected];
  }
}

/**
 * Symmetric resize: Resize column and its neighbor symmetrically
 */
export class SymmetricResizeStrategy implements ResizeStrategy {
  readonly name = 'symmetric';

  calculateNewWidth(
    state: ResizeState,
    currentX: number,
    dataSource: ResizableDataSource
  ): number {
    const deltaX = currentX - state.startX;
    return state.originalWidth + deltaX;
  }

  getAffectedColumns(column: number, dataSource: ResizableDataSource): number[] {
    const colCount = dataSource.getColumnCount();
    const affected = [column];

    // Include next column if exists
    if (column + 1 < colCount) {
      affected.push(column + 1);
    }

    return affected;
  }
}
