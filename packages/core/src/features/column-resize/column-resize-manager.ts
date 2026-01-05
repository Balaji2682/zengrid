import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type {
  ColumnResizeOptions,
  ColumnConstraints,
  ResizableDataSource,
  ResizeStrategy,
  BeforeResizeEvent,
  DuringResizeEvent,
} from './column-resize-manager.interface';
import { AutoFitCalculator } from './auto-fit-calculator';
import { ResizeHandleRenderer } from './resize-handle-renderer';
import { ResizePreview } from './resize-preview';
import { ResizeConstraintManager } from './resize-constraint-manager';
import { ResizeZoneDetector } from './resize-zone-detector';
import { ResizeStateManager } from './resize-state-manager';
import { SingleColumnResizeStrategy } from './resize-strategies';

/**
 * Adapter to make Grid callbacks compatible with ResizableDataSource interface
 */
class DataSourceAdapter implements ResizableDataSource {
  constructor(
    private colCount: number,
    private getColOffset: (col: number) => number,
    private getColWidth: (col: number) => number,
    private setColWidth: (col: number, width: number) => void,
    private getValue?: (row: number, col: number) => any,
    private rowCount?: number
  ) {}

  getColumnCount(): number {
    return this.colCount;
  }

  getColumnOffset(col: number): number {
    return this.getColOffset(col);
  }

  getColumnWidth(col: number): number {
    return this.getColWidth(col);
  }

  setColumnWidth(col: number, width: number): void {
    this.setColWidth(col, width);
  }

  getValue(row: number, col: number): any {
    return this.getValue?.(row, col);
  }

  getRowCount(): number {
    return this.rowCount ?? 0;
  }
}

/**
 * ColumnResizeManager - Refactored with Strategy Pattern and Sub-managers
 *
 * Architecture:
 * - Delegates to specialized sub-managers
 * - Uses Strategy Pattern for resize behaviors
 * - Implements lifecycle hooks for extensibility
 * - Loosely coupled through ResizableDataSource interface
 */
export class ColumnResizeManager {
  // Core dependencies
  private events?: EventEmitter<GridEvents>;
  private dataSource: ResizableDataSource;
  private enabled: boolean;
  private getScrollLeftCallback?: () => number;
  private getViewportHeightCallback?: () => number;

  // Sub-managers (delegation)
  private constraintManager: ResizeConstraintManager;
  private zoneDetector: ResizeZoneDetector;
  private stateManager: ResizeStateManager;
  private autoFitCalculator: AutoFitCalculator | null = null;
  private handleRenderer: ResizeHandleRenderer | null = null;
  private previewRenderer: ResizePreview | null = null;

  // Strategy pattern
  private strategy: ResizeStrategy;

  // Lifecycle hooks
  private onBeforeResize?: (event: BeforeResizeEvent) => boolean | Promise<boolean>;
  private onDuringResize?: (event: DuringResizeEvent) => void;

  // UI settings
  private showHandles: boolean;
  private showPreview: boolean;

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
    this.enabled = options.enabled ?? true;
    this.showHandles = options.showHandles ?? true;
    this.showPreview = options.showPreview ?? true;
    this.getScrollLeftCallback = options.getScrollLeft;
    this.getViewportHeightCallback = options.getViewportHeight;

    // Create data source adapter
    this.dataSource = new DataSourceAdapter(
      options.colCount,
      options.getColOffset,
      options.getColWidth,
      options.onWidthChange,
      options.getValue,
      options.rowCount
    );

    // Initialize sub-managers
    this.constraintManager = new ResizeConstraintManager({
      defaultConstraints: options.defaultConstraints,
      columnConstraints: options.columnConstraints,
      onValidateResize: options.onValidateResize,
    });

    this.zoneDetector = new ResizeZoneDetector({
      resizeZoneWidth: options.resizeZoneWidth,
    });

    this.stateManager = new ResizeStateManager({
      onColumnWidthsChange: options.onColumnWidthsChange,
      undoRedoManager: options.undoRedoManager,
    });

    // Initialize strategy
    this.strategy = options.strategy ?? new SingleColumnResizeStrategy();

    // Set lifecycle hooks
    this.onBeforeResize = options.onBeforeResize;
    this.onDuringResize = options.onDuringResize;

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

    // Initialize renderers
    if (this.showHandles) {
      this.handleRenderer = new ResizeHandleRenderer(container);
      this.updateHandles();
    }

    if (this.showPreview) {
      this.previewRenderer = new ResizePreview(container);
    }

    // Attach event listeners
    container.addEventListener('mousemove', this.boundHandleMouseMove);
    container.addEventListener('mousedown', this.boundHandleMouseDown);
    container.addEventListener('dblclick', this.boundHandleDblClick);
    container.addEventListener('touchstart', this.boundHandleTouchStart, {
      passive: false,
    });
  }

  /**
   * Detach event listeners from container
   */
  detach(): void {
    if (!this.container) return;

    this.container.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.container.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.container.removeEventListener('dblclick', this.boundHandleDblClick);
    this.container.removeEventListener('touchstart', this.boundHandleTouchStart);

    // Remove global listeners if active
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);
    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('touchend', this.boundHandleTouchEnd);

    this.container = null;
  }

  /**
   * Update handle positions (call after scroll or column changes)
   */
  updateHandles(): void {
    if (!this.handleRenderer || !this.container) return;

    const visibleCols: number[] = [];
    const colCount = this.dataSource.getColumnCount();
    for (let col = 0; col < colCount; col++) {
      visibleCols.push(col);
    }

    const scrollLeft = this.getScrollLeft();
    const viewportHeight =
      this.getViewportHeightCallback?.() ?? (this.container.offsetHeight || 32);

    this.handleRenderer.updateHandles(
      visibleCols,
      (col) => this.dataSource.getColumnOffset(col),
      (col) => this.dataSource.getColumnWidth(col),
      scrollLeft,
      viewportHeight
    );
  }

  /**
   * Get scroll left position
   */
  private getScrollLeft(): number {
    return this.getScrollLeftCallback?.() ?? 0;
  }

  /**
   * Handle mouse move for cursor and resize drag
   */
  private async handleMouseMove(e: MouseEvent): Promise<void> {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left + this.getScrollLeft();

    if (this.stateManager.isActive()) {
      // Handle resize drag
      await this.performResize(e.clientX);
      e.preventDefault();
    } else {
      // Update cursor based on resize zone
      const zone = this.zoneDetector.detectZone(x, this.dataSource);
      this.container.style.cursor = zone.inResizeZone ? 'col-resize' : '';

      // Show/hide handles
      if (this.handleRenderer) {
        this.handleRenderer.hideAllHandles();
        if (zone.inResizeZone) {
          this.handleRenderer.showHandle(zone.column);
        }
      }
    }
  }

  /**
   * Handle mouse down to start resize
   */
  private async handleMouseDown(e: MouseEvent): Promise<void> {
    if (!this.container || e.button !== 0) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left + this.getScrollLeft();

    const zone = this.zoneDetector.detectZone(x, this.dataSource);
    if (zone.inResizeZone) {
      const currentWidth = this.dataSource.getColumnWidth(zone.column);

      // Call onBeforeResize hook
      if (this.onBeforeResize) {
        let prevented = false;
        const event: BeforeResizeEvent = {
          column: zone.column,
          currentWidth,
          newWidth: currentWidth, // Will change during drag
          preventDefault: () => {
            prevented = true;
          },
        };

        const result = await this.onBeforeResize(event);
        if (result === false || prevented) {
          return; // Resize prevented
        }
      }

      // Start resize
      this.stateManager.startResize(zone.column, e.clientX, currentWidth);

      // Show preview if enabled
      if (this.previewRenderer) {
        const colOffset = this.dataSource.getColumnOffset(zone.column);
        const colWidth = this.dataSource.getColumnWidth(zone.column);
        const previewX = colOffset + colWidth - this.getScrollLeft();
        const previewHeight = this.getViewportHeightCallback?.() ?? rect.height;
        this.previewRenderer.show(previewX, previewHeight);
      }

      // Add global listeners for drag
      document.addEventListener('mousemove', this.boundHandleMouseMove);
      document.addEventListener('mouseup', this.boundHandleMouseUp);

      e.preventDefault();
    }
  }

  /**
   * Handle mouse up to end resize
   */
  private async handleMouseUp(e: MouseEvent): Promise<void> {
    if (!this.stateManager.isActive()) return;

    const state = this.stateManager.getState();
    const newWidth = this.strategy.calculateNewWidth(state, e.clientX, this.dataSource);
    const constrainedWidth = this.constraintManager.applyConstraints(state.column, newWidth);

    // Validate resize
    const validation = await this.constraintManager.validate(state.column, constrainedWidth);
    if (!validation.valid) {
      console.warn(`Resize validation failed: ${validation.reason}`);
      // Use suggested width if available
      if (validation.suggestedWidth !== undefined) {
        this.dataSource.setColumnWidth(state.column, validation.suggestedWidth);
      }
    } else {
      // Apply the resize
      this.dataSource.setColumnWidth(state.column, constrainedWidth);
    }

    // Record in history
    this.stateManager.recordResize(state.column, state.originalWidth, constrainedWidth);

    // Emit event
    if (this.events && constrainedWidth !== state.originalWidth) {
      this.events.emit('column:resize', {
        column: state.column,
        oldWidth: state.originalWidth,
        newWidth: constrainedWidth,
      });
    }

    // Notify persistence
    this.notifyWidthChange();

    // Hide preview
    if (this.previewRenderer) {
      this.previewRenderer.hide();
    }

    // End resize
    this.stateManager.endResize();

    // Remove global listeners
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);

    // Update handles
    this.updateHandles();
  }

  /**
   * Perform resize during drag
   */
  private async performResize(currentX: number): Promise<void> {
    const state = this.stateManager.getState();
    const newWidth = this.strategy.calculateNewWidth(state, currentX, this.dataSource);
    const constrainedWidth = this.constraintManager.applyConstraints(state.column, newWidth);

    // Call onDuringResize hook
    if (this.onDuringResize) {
      this.onDuringResize({
        column: state.column,
        originalWidth: state.originalWidth,
        currentWidth: constrainedWidth,
        deltaX: currentX - state.startX,
      });
    }

    // Update preview if enabled
    if (this.previewRenderer) {
      const colOffset = this.dataSource.getColumnOffset(state.column);
      const previewX = colOffset + constrainedWidth - this.getScrollLeft();
      this.previewRenderer.update(previewX);
    } else {
      // If no preview, apply resize immediately
      this.dataSource.setColumnWidth(state.column, constrainedWidth);
    }
  }

  /**
   * Handle double-click to auto-fit
   */
  private handleDblClick(e: MouseEvent): void {
    if (!this.container || !this.autoFitCalculator) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left + this.getScrollLeft();

    const zone = this.zoneDetector.detectZone(x, this.dataSource);
    if (zone.inResizeZone) {
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
    const x = touch.clientX - rect.left + this.getScrollLeft();

    const zone = this.zoneDetector.detectZone(x, this.dataSource);
    if (zone.inResizeZone) {
      this.stateManager.startResize(
        zone.column,
        touch.clientX,
        this.dataSource.getColumnWidth(zone.column)
      );

      // Show preview
      if (this.previewRenderer) {
        const colOffset = this.dataSource.getColumnOffset(zone.column);
        const colWidth = this.dataSource.getColumnWidth(zone.column);
        const previewX = colOffset + colWidth - this.getScrollLeft();
        const previewHeight = this.getViewportHeightCallback?.() ?? rect.height;
        this.previewRenderer.show(previewX, previewHeight);
      }

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
    if (!this.stateManager.isActive() || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const state = this.stateManager.getState();
    const newWidth = this.strategy.calculateNewWidth(state, touch.clientX, this.dataSource);
    const constrainedWidth = this.constraintManager.applyConstraints(state.column, newWidth);

    // Update preview
    if (this.previewRenderer) {
      const colOffset = this.dataSource.getColumnOffset(state.column);
      const previewX = colOffset + constrainedWidth - this.getScrollLeft();
      this.previewRenderer.update(previewX);
    } else {
      this.dataSource.setColumnWidth(state.column, constrainedWidth);
    }

    e.preventDefault();
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.stateManager.isActive()) return;

    const state = this.stateManager.getState();
    const currentWidth = this.dataSource.getColumnWidth(state.column);

    // Record and emit
    this.stateManager.recordResize(state.column, state.originalWidth, currentWidth);

    if (this.events && currentWidth !== state.originalWidth) {
      this.events.emit('column:resize', {
        column: state.column,
        oldWidth: state.originalWidth,
        newWidth: currentWidth,
      });
    }

    this.notifyWidthChange();

    // Hide preview
    if (this.previewRenderer) {
      this.previewRenderer.hide();
    }

    this.stateManager.endResize();

    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('touchend', this.boundHandleTouchEnd);

    this.updateHandles();
  }

  /**
   * Auto-fit a single column
   */
  autoFitColumn(column: number): void {
    if (!this.autoFitCalculator) return;

    const oldWidth = this.dataSource.getColumnWidth(column);
    const optimalWidth = this.autoFitCalculator.calculateOptimalWidth(column);
    const constrainedWidth = this.constraintManager.applyConstraints(column, optimalWidth);

    this.dataSource.setColumnWidth(column, constrainedWidth);

    // Record and emit
    this.stateManager.recordResize(column, oldWidth, constrainedWidth);

    if (this.events && constrainedWidth !== oldWidth) {
      this.events.emit('column:resize', {
        column,
        oldWidth,
        newWidth: constrainedWidth,
      });
    }

    this.notifyWidthChange();
    this.updateHandles();
  }

  /**
   * Auto-fit all columns
   */
  autoFitAllColumns(): void {
    if (!this.autoFitCalculator) return;

    const colCount = this.dataSource.getColumnCount();
    for (let col = 0; col < colCount; col++) {
      this.autoFitColumn(col);
    }
  }

  /**
   * Resize a column programmatically
   */
  resizeColumn(column: number, width: number): void {
    const oldWidth = this.dataSource.getColumnWidth(column);
    const constrainedWidth = this.constraintManager.applyConstraints(column, width);

    this.dataSource.setColumnWidth(column, constrainedWidth);

    // Record and emit
    this.stateManager.recordResize(column, oldWidth, constrainedWidth);

    if (this.events && constrainedWidth !== oldWidth) {
      this.events.emit('column:resize', {
        column,
        oldWidth,
        newWidth: constrainedWidth,
      });
    }

    this.notifyWidthChange();
    this.updateHandles();
  }

  /**
   * Set constraints for a column
   */
  setColumnConstraints(column: number, constraints: ColumnConstraints): void {
    this.constraintManager.setConstraints(column, constraints);
  }

  /**
   * Check if resize is currently active
   */
  isResizing(): boolean {
    return this.stateManager.isActive();
  }

  /**
   * Notify about width changes (for persistence)
   */
  private notifyWidthChange(): void {
    const colCount = this.dataSource.getColumnCount();
    const widths: number[] = [];
    for (let col = 0; col < colCount; col++) {
      widths.push(this.dataSource.getColumnWidth(col));
    }
    this.stateManager.notifyWidthChange(widths);
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.detach();
    this.handleRenderer?.destroy();
    this.previewRenderer?.destroy();
    this.autoFitCalculator?.destroy();
  }
}
