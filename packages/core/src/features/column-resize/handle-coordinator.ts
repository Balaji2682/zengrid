import type { ResizableDataSource } from './column-resize-manager.interface';
import type { ResizeHandleRenderer } from './resize-handle-renderer';
import type { ResizeStateManager } from './resize-state-manager';

/**
 * Coordinates handle rendering updates
 */
export class HandleCoordinator {
  constructor(
    private dataSource: ResizableDataSource,
    private stateManager: ResizeStateManager,
    private getHeaderHeight: () => number
  ) {}

  /**
   * Update handle positions (call after scroll or column changes)
   * Note: Handles are not updated during active resize to avoid visual glitches
   */
  updateHandles(handleRenderer: ResizeHandleRenderer | null, container: HTMLElement | null): void {
    if (!handleRenderer || !container) return;

    // Don't update handles during active resize to prevent visual artifacts
    if (this.stateManager.isActive()) {
      return;
    }

    const visibleCols: number[] = [];
    const colCount = this.dataSource.getColumnCount();
    for (let col = 0; col < colCount; col++) {
      visibleCols.push(col);
    }

    // Use header height for resize handles, not viewport height
    // This prevents handles from extending down into the grid body
    const headerHeight = this.getHeaderHeight();

    // Handles live inside the header-cells container, which is itself
    // translated by -scrollLeft. Position them in content space (scrollLeft 0)
    // and let that translate apply the scroll — subtracting scrollLeft here as
    // well would double-count it and mis-place handles after a scrolled resize.
    handleRenderer.updateHandles(
      visibleCols,
      (col) => this.dataSource.getColumnOffset(col),
      (col) => this.dataSource.getColumnWidth(col),
      0,
      headerHeight
    );
  }
}
