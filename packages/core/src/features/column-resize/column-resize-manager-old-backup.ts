import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type {
  ColumnResizeOptions,
  ColumnConstraints,
  ResizeState,
  ResizeZoneResult,
} from './column-resize-manager.interface';
import { AutoFitCalculator } from './auto-fit-calculator';
import { ResizeHandleRenderer } from './resize-handle-renderer';
import { ResizePreview } from './resize-preview';

/**
 * ColumnResizeManager - Manages column resizing interactions
 *
 * Handles:
 * - Mouse and touch event detection for resize zones
 * - Drag-to-resize columns
 * - Double-click to auto-fit
 * - Min/max width constraints
 * - Visual resize handles and preview
 */
export class ColumnResizeManager {
  private events?: EventEmitter<GridEvents>;
  private colCount: number;
  private getColOffset: (col: number) => number;
  private getColWidth: (col: number) => number;
  private onWidthChange: (col: number, width: number) => void;
  private enabled: boolean;
  private resizeZoneWidth: number;
  private defaultConstraints: ColumnConstraints;
  private columnConstraints: Map<number, ColumnConstraints>;
  private autoFitCalculator: AutoFitCalculator | null = null;
  private handleRenderer: ResizeHandleRenderer | null = null;
  private previewRenderer: ResizePreview | null = null;
  private showHandles: boolean;
  private showPreview: boolean;
  private onColumnWidthsChange?: (widths: number[]) => void;
  private undoRedoManager?: any;
  private getScrollLeftCallback?: () => number;
  private getViewportHeightCallback?: () => number;

  // Resize state
  private resizeState: ResizeState | null = null;

  // Bound event handlers for cleanup
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleDblClick: (e: MouseEvent) => void;
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;
  private boundHandleTouchEnd: (e: TouchEvent) => void;

  // Container element reference
  private container: HTMLElement | null = null;

  constructor(options: ColumnResizeOptions) {
    this.events = options.events;
    this.colCount = options.colCount;
    this.getColOffset = options.getColOffset;
    this.getColWidth = options.getColWidth;
    this.onWidthChange = options.onWidthChange;
    this.enabled = options.enabled ?? true;
    this.resizeZoneWidth = options.resizeZoneWidth ?? 6;
    this.defaultConstraints = options.defaultConstraints ?? { minWidth: 30 };
    this.columnConstraints = options.columnConstraints ?? new Map();
    this.showHandles = options.showHandles ?? true;
    this.showPreview = options.showPreview ?? true;
    this.onColumnWidthsChange = options.onColumnWidthsChange;
    this.undoRedoManager = options.undoRedoManager;
    this.getScrollLeftCallback = options.getScrollLeft;
    this.getViewportHeightCallback = options.getViewportHeight;

    // Initialize auto-fit calculator if getValue is provided
    if (options.getValue && options.rowCount) {
      this.autoFitCalculator = new AutoFitCalculator({
        getValue: options.getValue,
        rowCount: options.rowCount,
        sampleSize: options.autoFitSampleSize ?? 100,
        padding: options.autoFitPadding ?? 16,
      });
    }

    // Bind handlers
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleDblClick = this.handleDblClick.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
  }

  /**
   * Attach event listeners to container
   */
  attach(container: HTMLElement): void {
    if (!this.enabled) return;

    this.container = container;

    // Initialize visual components
    if (this.showHandles) {
      this.handleRenderer = new ResizeHandleRenderer(container);
      // Initialize handles for all columns
      this.updateHandles();
    }
    if (this.showPreview) {
      this.previewRenderer = new ResizePreview(container);
    }

    // Mouse events
    container.addEventListener('mousemove', this.boundHandleMouseMove);
    container.addEventListener('mousedown', this.boundHandleMouseDown);
    container.addEventListener('dblclick', this.boundHandleDblClick);

    // Touch events for mobile
    container.addEventListener('touchstart', this.boundHandleTouchStart, {
      passive: false,
    });
  }

  /**
   * Update resize handles for visible columns
   * Should be called after scrolling or column width changes
   */
  updateHandles(): void {
    if (!this.handleRenderer || !this.container) return;

    // Get all columns (for header, all columns are "visible")
    const visibleCols: number[] = [];
    for (let col = 0; col < this.colCount; col++) {
      visibleCols.push(col);
    }

    const scrollLeft = this.getScrollLeft();
    const viewportHeight = this.getViewportHeightCallback
      ? this.getViewportHeightCallback()
      : this.container.offsetHeight || 32;

    this.handleRenderer.updateHandles(
      visibleCols,
      this.getColOffset,
      this.getColWidth,
      scrollLeft,
      viewportHeight
    );
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    if (this.container) {
      // Remove mouse listeners
      this.container.removeEventListener('mousemove', this.boundHandleMouseMove);
      this.container.removeEventListener('mousedown', this.boundHandleMouseDown);
      this.container.removeEventListener('dblclick', this.boundHandleDblClick);

      // Remove touch listeners
      this.container.removeEventListener('touchstart', this.boundHandleTouchStart);
    }

    // Clean up global listeners if resizing
    if (this.resizeState?.active) {
      document.removeEventListener('mousemove', this.boundHandleMouseMove);
      document.removeEventListener('mouseup', this.boundHandleMouseUp);
      document.removeEventListener('touchmove', this.boundHandleTouchMove);
      document.removeEventListener('touchend', this.boundHandleTouchEnd);
    }

    this.container = null;
  }

  /**
   * Check if point is in a resize zone
   */
  getResizeZone(x: number, scrollLeft: number): ResizeZoneResult | null {
    // Convert viewport X to grid X
    const gridX = x + scrollLeft;

    // Check each column border (right edge)
    for (let col = 0; col < this.colCount; col++) {
      const colOffset = this.getColOffset(col);
      const colWidth = this.getColWidth(col);
      const borderX = colOffset + colWidth;

      // Check if within resize zone (half on each side of border)
      const halfZone = this.resizeZoneWidth / 2;
      if (gridX >= borderX - halfZone && gridX <= borderX + halfZone) {
        return {
          inResizeZone: true,
          column: col,
          borderX,
        };
      }
    }

    return null;
  }

  /**
   * Handle mouse move for cursor and resize drag
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollLeft = this.getScrollLeft();

    if (this.resizeState?.active) {
      // Handle resize drag
      const deltaX = e.clientX - this.resizeState.startX;
      const newWidth = this.resizeState.originalWidth + deltaX;
      const constrainedWidth = this.applyConstraints(
        this.resizeState.column,
        newWidth
      );

      // Update preview if enabled
      if (this.previewRenderer) {
        const colOffset = this.getColOffset(this.resizeState.column);
        const previewX = colOffset + constrainedWidth - scrollLeft;
        this.previewRenderer.update(previewX);
      } else {
        // If no preview, apply resize immediately
        this.onWidthChange(this.resizeState.column, constrainedWidth);
      }

      // Prevent text selection during drag
      e.preventDefault();
    } else {
      // Update cursor based on resize zone
      const zone = this.getResizeZone(x, scrollLeft);
      this.container.style.cursor = zone ? 'col-resize' : '';

      // Show/hide handles
      if (this.handleRenderer) {
        this.handleRenderer.hideAllHandles();
        if (zone) {
          this.handleRenderer.showHandle(zone.column);
        }
      }
    }
  }

  /**
   * Handle mouse down to start resize
   */
  private handleMouseDown(e: MouseEvent): void {
    if (!this.container || e.button !== 0) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollLeft = this.getScrollLeft();

    const zone = this.getResizeZone(x, scrollLeft);
    if (zone) {
      // Start resize
      this.resizeState = {
        column: zone.column,
        startX: e.clientX,
        originalWidth: this.getColWidth(zone.column),
        active: true,
      };

      // Show preview if enabled
      if (this.previewRenderer) {
        const colOffset = this.getColOffset(zone.column);
        const colWidth = this.getColWidth(zone.column);
        const previewX = colOffset + colWidth - scrollLeft;
        const previewHeight = this.getViewportHeightCallback
          ? this.getViewportHeightCallback()
          : rect.height;
        this.previewRenderer.show(previewX, previewHeight);
      }

      // Add global listeners for drag
      document.addEventListener('mousemove', this.boundHandleMouseMove);
      document.addEventListener('mouseup', this.boundHandleMouseUp);

      // Prevent text selection
      e.preventDefault();
    }
  }

  /**
   * Handle mouse up to end resize
   */
  private handleMouseUp(e: MouseEvent): void {
    if (this.resizeState?.active) {
      const oldWidth = this.resizeState.originalWidth;
      const deltaX = e.clientX - this.resizeState.startX;
      const newWidth = this.resizeState.originalWidth + deltaX;
      const constrainedWidth = this.applyConstraints(
        this.resizeState.column,
        newWidth
      );

      // Apply final width
      this.onWidthChange(this.resizeState.column, constrainedWidth);

      // Hide preview
      if (this.previewRenderer) {
        this.previewRenderer.hide();
      }

      // Emit resize event
      if (this.events && oldWidth !== constrainedWidth) {
        this.events.emit('column:resize', {
          column: this.resizeState.column,
          oldWidth,
          newWidth: constrainedWidth,
        });
      }

      // Call persistence callback
      if (this.onColumnWidthsChange) {
        const widths = this.getAllColumnWidths();
        this.onColumnWidthsChange(widths);
      }

      // TODO: Add to undo/redo if manager is available
      // if (this.undoRedoManager) {
      //   this.undoRedoManager.execute(new ColumnResizeCommand(...));
      // }

      // Update handle positions after resize
      this.updateHandles();

      // Clean up
      document.removeEventListener('mousemove', this.boundHandleMouseMove);
      document.removeEventListener('mouseup', this.boundHandleMouseUp);
      this.resizeState = null;

      // Reset cursor
      if (this.container) {
        this.container.style.cursor = '';
      }
    }
  }

  /**
   * Handle double-click for auto-fit
   */
  private handleDblClick(e: MouseEvent): void {
    if (!this.container || !this.autoFitCalculator) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollLeft = this.getScrollLeft();

    const zone = this.getResizeZone(x, scrollLeft);
    if (zone) {
      this.autoFitColumn(zone.column);
      e.preventDefault();
    }
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(e: TouchEvent): void {
    if (!this.container || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const rect = this.container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const scrollLeft = this.getScrollLeft();

    const zone = this.getResizeZone(x, scrollLeft);
    if (zone) {
      // Start resize
      this.resizeState = {
        column: zone.column,
        startX: touch.clientX,
        originalWidth: this.getColWidth(zone.column),
        active: true,
      };

      // Show preview if enabled
      if (this.previewRenderer) {
        const colOffset = this.getColOffset(zone.column);
        const colWidth = this.getColWidth(zone.column);
        const previewX = colOffset + colWidth - scrollLeft;
        const previewHeight = this.getViewportHeightCallback
          ? this.getViewportHeightCallback()
          : rect.height;
        this.previewRenderer.show(previewX, previewHeight);
      }

      // Add global listeners for drag
      document.addEventListener('touchmove', this.boundHandleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', this.boundHandleTouchEnd);

      e.preventDefault();
    }
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.container || !this.resizeState?.active || e.touches.length !== 1)
      return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.resizeState.startX;
    const newWidth = this.resizeState.originalWidth + deltaX;
    const constrainedWidth = this.applyConstraints(
      this.resizeState.column,
      newWidth
    );

    const scrollLeft = this.getScrollLeft();

    // Update preview if enabled
    if (this.previewRenderer) {
      const colOffset = this.getColOffset(this.resizeState.column);
      const previewX = colOffset + constrainedWidth - scrollLeft;
      this.previewRenderer.update(previewX);
    } else {
      // If no preview, apply resize immediately
      this.onWidthChange(this.resizeState.column, constrainedWidth);
    }

    e.preventDefault();
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (this.resizeState?.active) {
      const oldWidth = this.resizeState.originalWidth;

      // Get final width from current state
      const newWidth = this.getColWidth(this.resizeState.column);

      // Hide preview
      if (this.previewRenderer) {
        this.previewRenderer.hide();
        // Apply final width (since preview mode doesn't apply immediately)
        const deltaX = 0; // Touch already ended, use current width
        const constrainedWidth = this.applyConstraints(
          this.resizeState.column,
          newWidth
        );
        this.onWidthChange(this.resizeState.column, constrainedWidth);
      }

      // Emit resize event
      if (this.events && oldWidth !== newWidth) {
        this.events.emit('column:resize', {
          column: this.resizeState.column,
          oldWidth,
          newWidth,
        });
      }

      // Call persistence callback
      if (this.onColumnWidthsChange) {
        const widths = this.getAllColumnWidths();
        this.onColumnWidthsChange(widths);
      }

      // Update handle positions after resize
      this.updateHandles();

      // Clean up
      document.removeEventListener('touchmove', this.boundHandleTouchMove);
      document.removeEventListener('touchend', this.boundHandleTouchEnd);
      this.resizeState = null;
    }
  }

  /**
   * Auto-fit column width to content
   */
  autoFitColumn(col: number): void {
    if (!this.autoFitCalculator) {
      console.warn('Auto-fit not available: getValue not provided');
      return;
    }

    const oldWidth = this.getColWidth(col);
    const optimalWidth = this.autoFitCalculator.calculateOptimalWidth(col);
    const constrainedWidth = this.applyConstraints(col, optimalWidth);

    if (constrainedWidth !== oldWidth) {
      this.onWidthChange(col, constrainedWidth);

      // Emit resize event
      if (this.events) {
        this.events.emit('column:resize', {
          column: col,
          oldWidth,
          newWidth: constrainedWidth,
        });
      }

      // Call persistence callback
      if (this.onColumnWidthsChange) {
        const widths = this.getAllColumnWidths();
        this.onColumnWidthsChange(widths);
      }

      // Update handle positions after resize
      this.updateHandles();
    }
  }

  /**
   * Auto-fit all columns
   */
  autoFitAllColumns(): void {
    for (let col = 0; col < this.colCount; col++) {
      this.autoFitColumn(col);
    }
  }

  /**
   * Apply min/max constraints to width
   */
  private applyConstraints(col: number, width: number): number {
    const constraints = this.getConstraints(col);
    const min = constraints.minWidth ?? this.defaultConstraints.minWidth ?? 30;
    const max =
      constraints.maxWidth ?? this.defaultConstraints.maxWidth ?? Infinity;

    return Math.max(min, Math.min(max, width));
  }

  /**
   * Get constraints for a column
   */
  private getConstraints(col: number): ColumnConstraints {
    return this.columnConstraints.get(col) ?? this.defaultConstraints;
  }

  /**
   * Set constraints for a column
   */
  setColumnConstraints(col: number, constraints: ColumnConstraints): void {
    this.columnConstraints.set(col, constraints);
  }

  /**
   * Set default constraints
   */
  setDefaultConstraints(constraints: ColumnConstraints): void {
    this.defaultConstraints = constraints;
  }

  /**
   * Get all column widths
   */
  private getAllColumnWidths(): number[] {
    const widths: number[] = [];
    for (let col = 0; col < this.colCount; col++) {
      widths.push(this.getColWidth(col));
    }
    return widths;
  }

  /**
   * Get current scroll left
   * Uses callback if provided, otherwise tries to find scroll container
   */
  private getScrollLeft(): number {
    if (this.getScrollLeftCallback) {
      return this.getScrollLeftCallback();
    }

    // Fallback: try to find scroll container
    const scrollContainer = this.container?.closest('.zg-scroll-container');
    return (scrollContainer as HTMLElement)?.scrollLeft ?? 0;
  }

  /**
   * Check if currently resizing
   */
  isResizing(): boolean {
    return this.resizeState?.active ?? false;
  }

  /**
   * Update column count
   */
  updateColCount(colCount: number): void {
    this.colCount = colCount;
  }

  /**
   * Enable/disable resize
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.resizeState?.active) {
      // Cancel active resize
      document.removeEventListener('mousemove', this.boundHandleMouseMove);
      document.removeEventListener('mouseup', this.boundHandleMouseUp);
      document.removeEventListener('touchmove', this.boundHandleTouchMove);
      document.removeEventListener('touchend', this.boundHandleTouchEnd);

      if (this.previewRenderer) {
        this.previewRenderer.hide();
      }

      this.resizeState = null;
      if (this.container) {
        this.container.style.cursor = '';
      }
    }
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    this.detach();

    if (this.autoFitCalculator) {
      this.autoFitCalculator.destroy();
      this.autoFitCalculator = null;
    }

    if (this.handleRenderer) {
      this.handleRenderer.destroy();
      this.handleRenderer = null;
    }

    if (this.previewRenderer) {
      this.previewRenderer.destroy();
      this.previewRenderer = null;
    }

    this.resizeState = null;
    this.columnConstraints.clear();
  }
}
