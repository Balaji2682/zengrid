/**
 * Drag Mouse Handler
 *
 * @description
 * Handles mouse events (mousedown, mousemove, mouseup) for column drag operations.
 */

import type { ThrottledFunction } from '@zengrid/shared';
import type {
  BeforeDragEvent,
  ColumnDragOptions,
  DragMouseEventCallbacks,
} from './column-drag-manager.interface';

export class DragMouseHandler {
  private enabled: boolean;
  private dragThreshold: number;
  private onBeforeDrag?: ColumnDragOptions['onBeforeDrag'];
  private callbacks: DragMouseEventCallbacks;
  private throttledDrag: ThrottledFunction<(x: number, y: number) => void>;

  // Bound handlers for cleanup
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;

  // Container reference
  private container: HTMLElement | null = null;

  // Source header cell captured at mousedown. Used to build the drag ghost so it
  // never depends on the transient mousemove target, which may have moved off the
  // header (onto a data cell or gap) by the time the drag threshold is crossed.
  private sourceHeaderCell: HTMLElement | null = null;

  constructor(
    options: {
      enabled: boolean;
      dragThreshold: number;
      onBeforeDrag?: ColumnDragOptions['onBeforeDrag'];
    },
    callbacks: DragMouseEventCallbacks,
    throttledDrag: ThrottledFunction<(x: number, y: number) => void>
  ) {
    this.enabled = options.enabled;
    this.dragThreshold = options.dragThreshold;
    this.onBeforeDrag = options.onBeforeDrag;
    this.callbacks = callbacks;
    this.throttledDrag = throttledDrag;

    // Bind event handlers
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
  }

  /**
   * Attach mouse listeners to container
   */
  attach(container: HTMLElement): void {
    if (!this.enabled) return;

    this.container = container;
    container.addEventListener('mousedown', this.boundHandleMouseDown);
  }

  /**
   * Detach mouse listeners
   */
  detach(): void {
    if (this.container) {
      this.container.removeEventListener('mousedown', this.boundHandleMouseDown);
      this.container = null;
    }
    this.removeGlobalListeners();
    this.sourceHeaderCell = null;
  }

  /**
   * Handle mousedown event on header
   */
  private handleMouseDown(e: MouseEvent): void {
    if (!this.enabled || e.button !== 0) return; // Only left click

    // Find column header element
    const headerCell = (e.target as HTMLElement).closest('[data-column-id]') as HTMLElement;
    if (!headerCell) return;

    const columnId = headerCell.dataset['columnId'];
    if (!columnId) return;

    this.sourceHeaderCell = headerCell;

    // Check if column can be dragged
    if (!this.callbacks.canDragColumn(columnId)) return;

    const column = this.callbacks.getColumn(columnId);
    if (!column) return;

    // Call before drag hook
    if (this.onBeforeDrag) {
      let prevented = false;
      const beforeEvent: BeforeDragEvent = {
        columnId,
        column: column.definition,
        columnIndex: column.order,
        nativeEvent: e,
        preventDefault: () => {
          prevented = true;
        },
      };
      const result = this.onBeforeDrag(beforeEvent);
      if (result === false || prevented) return;
    }

    // Notify callbacks
    this.callbacks.onMouseDown(columnId, column.order, e.clientX, e.clientY);

    // Add global listeners
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('mouseup', this.boundHandleMouseUp);

    // Prevent text selection during drag
    e.preventDefault();
  }

  /**
   * Handle mousemove event
   */
  private handleMouseMove(e: MouseEvent): void {
    const state = this.callbacks.getState();
    if (state !== 'pending' && state !== 'dragging') return;

    // Update position
    this.callbacks.onMouseMove(e.clientX, e.clientY);

    // Check if drag threshold is met
    if (state === 'pending') {
      const distance = this.callbacks.getDragDistance();
      if (distance >= this.dragThreshold) {
        this.callbacks.onDragStart(e, this.sourceHeaderCell ?? (e.target as HTMLElement));
      }
    }

    // Perform drag if in dragging state
    if (state === 'dragging') {
      this.throttledDrag(e.clientX, e.clientY);
    }
  }

  /**
   * Handle mouseup event
   */
  private handleMouseUp(_e: MouseEvent): void {
    const state = this.callbacks.getState();
    if (state !== 'pending' && state !== 'dragging') return;

    // Notify callbacks
    this.callbacks.onMouseUp();

    // Remove global listeners
    this.removeGlobalListeners();
    this.sourceHeaderCell = null;
  }

  /**
   * Remove global mouse listeners
   */
  private removeGlobalListeners(): void {
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);
  }

  /**
   * Enable mouse handling
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable mouse handling
   */
  disable(): void {
    this.enabled = false;
  }
}
