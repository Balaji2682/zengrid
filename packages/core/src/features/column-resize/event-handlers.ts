import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type {
  ResizableDataSource,
  ResizeStrategy,
  BeforeResizeEvent,
  DuringResizeEvent,
} from './column-resize-manager.interface';
import type { ResizeConstraintManager } from './resize-constraint-manager';
import type { ResizeZoneDetector } from './resize-zone-detector';
import type { ResizeStateManager } from './resize-state-manager';
import type { ResizeHandleRenderer } from './resize-handle-renderer';
import type { ResizePreview } from './resize-preview';
import type { AutoFitCalculator } from './auto-fit-calculator';

/**
 * Event handler configuration
 */
export interface EventHandlerConfig {
  container: HTMLElement;
  dataSource: ResizableDataSource;
  events?: EventEmitter<GridEvents>;
  strategy: ResizeStrategy;
  constraintManager: ResizeConstraintManager;
  zoneDetector: ResizeZoneDetector;
  stateManager: ResizeStateManager;
  handleRenderer: ResizeHandleRenderer | null;
  previewRenderer: ResizePreview | null;
  autoFitCalculator: AutoFitCalculator | null;
  isColumnResizable?: (col: number) => boolean;
  onBeforeResize?: (event: BeforeResizeEvent) => boolean | Promise<boolean>;
  onDuringResize?: (event: DuringResizeEvent) => void;
  getScrollLeft: () => number;
  getViewportHeight: () => number;
  onWidthChange: () => void;
  onUpdateHandles: () => void;
}

/**
 * Handles mouse and touch events for column resizing
 */
export class EventHandlers {
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleDblClick: (e: MouseEvent) => void;
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;
  private boundHandleTouchEnd: (e: TouchEvent) => void;

  constructor(private config: EventHandlerConfig) {
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleDblClick = this.handleDblClick.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
  }

  /**
   * Attach event listeners
   */
  attach(): void {
    const { container } = this.config;
    container.addEventListener('mousemove', this.boundHandleMouseMove);
    container.addEventListener('mousedown', this.boundHandleMouseDown);
    container.addEventListener('dblclick', this.boundHandleDblClick);
    container.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    const { container } = this.config;
    container.removeEventListener('mousemove', this.boundHandleMouseMove);
    container.removeEventListener('mousedown', this.boundHandleMouseDown);
    container.removeEventListener('dblclick', this.boundHandleDblClick);
    container.removeEventListener('touchstart', this.boundHandleTouchStart);

    // Remove global listeners
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);
    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('touchend', this.boundHandleTouchEnd);
  }

  /**
   * Handle mouse move for cursor and resize drag
   */
  private async handleMouseMove(e: MouseEvent): Promise<void> {
    const { container, dataSource, stateManager, zoneDetector, handleRenderer } = this.config;

    // The container (header cells) is translated by -scrollLeft, so its
    // rect.left already encodes the horizontal scroll. Converting a screen X to
    // content space is therefore just `clientX - rect.left` — adding scrollLeft
    // again would double-count it and break hit-detection while scrolled.
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (stateManager.isActive()) {
      await this.performResize(e.clientX);
      e.preventDefault();
    } else {
      const zone = zoneDetector.detectZone(x, dataSource);
      container.style.cursor = zone.inResizeZone ? 'col-resize' : '';

      if (handleRenderer) {
        handleRenderer.hideAllHandles();
        if (zone.inResizeZone) {
          handleRenderer.showHandle(zone.column);
        }
      }
    }
  }

  /**
   * Handle mouse down to start resize
   */
  private async handleMouseDown(e: MouseEvent): Promise<void> {
    if (e.button !== 0) return;

    const {
      container,
      dataSource,
      zoneDetector,
      stateManager,
      previewRenderer,
      isColumnResizable,
      onBeforeResize,
      getViewportHeight,
    } = this.config;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const zone = zoneDetector.detectZone(x, dataSource);
    if (zone.inResizeZone) {
      if (isColumnResizable && !isColumnResizable(zone.column)) {
        return;
      }

      const currentWidth = dataSource.getColumnWidth(zone.column);

      if (onBeforeResize) {
        let prevented = false;
        const event: BeforeResizeEvent = {
          column: zone.column,
          currentWidth,
          newWidth: currentWidth,
          preventDefault: () => {
            prevented = true;
          },
        };

        const result = await onBeforeResize(event);
        if (result === false || prevented) {
          return;
        }
      }

      stateManager.startResize(zone.column, e.clientX, currentWidth);

      if (previewRenderer) {
        const colOffset = dataSource.getColumnOffset(zone.column);
        const colWidth = dataSource.getColumnWidth(zone.column);
        // Container-relative content X; the container's own translate applies
        // the scroll offset, so do not subtract scrollLeft here.
        const previewX = colOffset + colWidth;
        const previewHeight = getViewportHeight() ?? rect.height;
        previewRenderer.show(previewX, previewHeight);
      }

      document.addEventListener('mousemove', this.boundHandleMouseMove);
      document.addEventListener('mouseup', this.boundHandleMouseUp);

      e.preventDefault();
    }
  }

  /**
   * Handle mouse up to end resize
   */
  private async handleMouseUp(e: MouseEvent): Promise<void> {
    const {
      dataSource,
      strategy,
      constraintManager,
      stateManager,
      previewRenderer,
      events,
      onWidthChange,
      onUpdateHandles,
    } = this.config;

    if (!stateManager.isActive()) return;

    const state = stateManager.getState();
    const newWidth = strategy.calculateNewWidth(state, e.clientX, dataSource);
    const constrainedWidth = constraintManager.applyConstraints(state.column, newWidth);

    const validation = await constraintManager.validate(state.column, constrainedWidth);
    if (!validation.valid) {
      console.warn(`Resize validation failed: ${validation.reason}`);
      if (validation.suggestedWidth !== undefined) {
        dataSource.setColumnWidth(state.column, validation.suggestedWidth);
      }
    } else {
      dataSource.setColumnWidth(state.column, constrainedWidth);
    }

    stateManager.recordResize(state.column, state.originalWidth, constrainedWidth);

    if (events && constrainedWidth !== state.originalWidth) {
      events.emit('column:resize', {
        column: state.column,
        oldWidth: state.originalWidth,
        newWidth: constrainedWidth,
      });
    }

    onWidthChange();
    previewRenderer?.hide();
    stateManager.endResize();

    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);

    onUpdateHandles();
  }

  /**
   * Perform resize during drag
   */
  private async performResize(currentX: number): Promise<void> {
    const {
      dataSource,
      strategy,
      constraintManager,
      stateManager,
      previewRenderer,
      onDuringResize,
    } = this.config;

    const state = stateManager.getState();
    const newWidth = strategy.calculateNewWidth(state, currentX, dataSource);
    const constrainedWidth = constraintManager.applyConstraints(state.column, newWidth);

    if (onDuringResize) {
      onDuringResize({
        column: state.column,
        originalWidth: state.originalWidth,
        currentWidth: constrainedWidth,
        deltaX: currentX - state.startX,
      });
    }

    if (previewRenderer) {
      const colOffset = dataSource.getColumnOffset(state.column);
      const previewX = colOffset + constrainedWidth;
      previewRenderer.update(previewX);
    } else {
      dataSource.setColumnWidth(state.column, constrainedWidth);
    }
  }

  /**
   * Handle double-click to auto-fit
   */
  private handleDblClick(e: MouseEvent): void {
    const { container, dataSource, zoneDetector, autoFitCalculator } = this.config;

    if (!autoFitCalculator) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const zone = zoneDetector.detectZone(x, dataSource);
    if (zone.inResizeZone) {
      this.autoFitColumn(zone.column);
      e.preventDefault();
    }
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;

    const {
      container,
      dataSource,
      zoneDetector,
      stateManager,
      previewRenderer,
      isColumnResizable,
      getViewportHeight,
    } = this.config;

    const touch = e.touches[0];
    const rect = container.getBoundingClientRect();
    const x = touch.clientX - rect.left;

    const zone = zoneDetector.detectZone(x, dataSource);
    if (zone.inResizeZone) {
      if (isColumnResizable && !isColumnResizable(zone.column)) {
        return;
      }

      stateManager.startResize(zone.column, touch.clientX, dataSource.getColumnWidth(zone.column));

      if (previewRenderer) {
        const colOffset = dataSource.getColumnOffset(zone.column);
        const colWidth = dataSource.getColumnWidth(zone.column);
        const previewX = colOffset + colWidth;
        const previewHeight = getViewportHeight() ?? rect.height;
        previewRenderer.show(previewX, previewHeight);
      }

      document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
      document.addEventListener('touchend', this.boundHandleTouchEnd);

      e.preventDefault();
    }
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) return;

    const {
      dataSource,
      strategy,
      constraintManager,
      stateManager,
      previewRenderer,
    } = this.config;

    if (!stateManager.isActive()) return;

    const touch = e.touches[0];
    const state = stateManager.getState();
    const newWidth = strategy.calculateNewWidth(state, touch.clientX, dataSource);
    const constrainedWidth = constraintManager.applyConstraints(state.column, newWidth);

    if (previewRenderer) {
      const colOffset = dataSource.getColumnOffset(state.column);
      const previewX = colOffset + constrainedWidth;
      previewRenderer.update(previewX);
    } else {
      dataSource.setColumnWidth(state.column, constrainedWidth);
    }

    e.preventDefault();
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(_e: TouchEvent): void {
    const { dataSource, stateManager, previewRenderer, events, onWidthChange, onUpdateHandles } =
      this.config;

    if (!stateManager.isActive()) return;

    const state = stateManager.getState();
    const currentWidth = dataSource.getColumnWidth(state.column);

    stateManager.recordResize(state.column, state.originalWidth, currentWidth);

    if (events && currentWidth !== state.originalWidth) {
      events.emit('column:resize', {
        column: state.column,
        oldWidth: state.originalWidth,
        newWidth: currentWidth,
      });
    }

    onWidthChange();
    previewRenderer?.hide();
    stateManager.endResize();

    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('touchend', this.boundHandleTouchEnd);

    onUpdateHandles();
  }

  /**
   * Auto-fit a single column
   */
  private autoFitColumn(column: number): void {
    const {
      dataSource,
      constraintManager,
      stateManager,
      autoFitCalculator,
      events,
      onWidthChange,
      onUpdateHandles,
    } = this.config;

    if (!autoFitCalculator) return;

    const oldWidth = dataSource.getColumnWidth(column);
    const optimalWidth = autoFitCalculator.calculateOptimalWidth(column);
    const constrainedWidth = constraintManager.applyConstraints(column, optimalWidth);

    dataSource.setColumnWidth(column, constrainedWidth);
    stateManager.recordResize(column, oldWidth, constrainedWidth);

    if (events && constrainedWidth !== oldWidth) {
      events.emit('column:resize', {
        column,
        oldWidth,
        newWidth: constrainedWidth,
      });
    }

    onWidthChange();
    onUpdateHandles();
  }
}
