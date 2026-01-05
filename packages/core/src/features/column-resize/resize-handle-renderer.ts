/**
 * ResizeHandleRenderer - Renders visual resize handles on column borders
 *
 * Creates and positions visual handles that indicate where users can drag to resize columns.
 * Handles are shown on hover and hidden when not needed.
 */
export class ResizeHandleRenderer {
  private container: HTMLElement;
  private handles: Map<number, HTMLElement> = new Map();
  private handlePool: HTMLElement[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Update visible handles based on visible columns
   */
  updateHandles(
    visibleCols: number[],
    getColOffset: (col: number) => number,
    getColWidth: (col: number) => number,
    scrollLeft: number,
    viewportHeight: number
  ): void {
    // Clear existing handles
    this.clearHandles();

    // Create handle for each visible column's right border
    for (const col of visibleCols) {
      const handle = this.getOrCreateHandle();
      const colOffset = getColOffset(col);
      const colWidth = getColWidth(col);
      const borderX = colOffset + colWidth;

      // Position handle at column border (in viewport coordinates)
      // Only set dynamic positioning - visual styles come from CSS
      handle.style.left = `${borderX - scrollLeft - 3}px`; // Center 6px handle
      handle.style.top = '0px';
      handle.style.height = `${viewportHeight}px`;
      handle.style.display = 'block';

      // Store reference
      this.handles.set(col, handle);
    }
  }

  /**
   * Show handle for specific column
   */
  showHandle(col: number): void {
    const handle = this.handles.get(col);
    if (handle) {
      handle.classList.add('active');
    }
  }

  /**
   * Hide handle for specific column
   */
  hideHandle(col: number): void {
    const handle = this.handles.get(col);
    if (handle) {
      handle.classList.remove('active');
    }
  }

  /**
   * Hide all handles
   */
  hideAllHandles(): void {
    for (const handle of this.handles.values()) {
      handle.classList.remove('active');
    }
  }

  /**
   * Get or create a handle element
   */
  private getOrCreateHandle(): HTMLElement {
    // Try to reuse from pool
    let handle = this.handlePool.pop();

    if (!handle) {
      // Create new handle
      handle = document.createElement('div');
      handle.className = 'zg-resize-handle';
      // Only set dynamic positioning properties inline
      // Visual styles should come from CSS classes
      handle.style.position = 'absolute';
      handle.style.display = 'none';
      this.container.appendChild(handle);
    }

    return handle;
  }

  /**
   * Clear all handles and return to pool
   */
  private clearHandles(): void {
    for (const handle of this.handles.values()) {
      handle.style.display = 'none';
      this.handlePool.push(handle);
    }
    this.handles.clear();
  }

  /**
   * Cleanup and remove all handles
   */
  destroy(): void {
    // Remove handles from DOM
    for (const handle of this.handles.values()) {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    }

    // Remove pooled handles from DOM
    for (const handle of this.handlePool) {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    }

    this.handles.clear();
    this.handlePool = [];
  }
}
