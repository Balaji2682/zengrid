import type { CellRef } from '../types';
import type { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';

/**
 * Touch gesture types
 */
export type TouchGesture =
  | 'tap'
  | 'double-tap'
  | 'long-press'
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'pinch-zoom'
  | 'drag';

/**
 * Touch handler options
 */
export interface TouchHandlerOptions {
  /**
   * Grid container element
   */
  container: HTMLElement;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;

  /**
   * Callback to get cell at point
   */
  getCellAtPoint: (x: number, y: number) => CellRef | null;

  /**
   * Callback for tap gesture
   */
  onTap?: (cell: CellRef, event: TouchEvent) => void;

  /**
   * Callback for double-tap gesture
   */
  onDoubleTap?: (cell: CellRef, event: TouchEvent) => void;

  /**
   * Callback for long-press gesture
   */
  onLongPress?: (cell: CellRef, event: TouchEvent) => void;

  /**
   * Callback for drag gesture
   */
  onDrag?: (startCell: CellRef, currentCell: CellRef, event: TouchEvent) => void;

  /**
   * Double-tap delay (ms)
   * @default 300
   */
  doubleTapDelay?: number;

  /**
   * Long-press delay (ms)
   * @default 500
   */
  longPressDelay?: number;

  /**
   * Minimum swipe distance (px)
   * @default 50
   */
  minSwipeDistance?: number;

  /**
   * Enable pinch zoom
   * @default true
   */
  enablePinchZoom?: boolean;

  /**
   * Enable drag to select
   * @default true
   */
  enableDragSelect?: boolean;

  /**
   * Prevent default scroll on touch
   * @default true
   */
  preventDefaultScroll?: boolean;
}

/**
 * Touch point tracking
 */
interface TouchPoint {
  x: number;
  y: number;
  time: number;
  cell: CellRef | null;
}

/**
 * TouchHandler - Manages touch interactions for mobile devices
 *
 * Handles touch gestures:
 * - Tap: Single touch (cell click)
 * - Double-tap: Quick double touch (start editing)
 * - Long-press: Touch and hold (context menu)
 * - Swipe: Fast directional movement (scroll)
 * - Pinch zoom: Two-finger zoom
 * - Drag: Touch and drag (range selection)
 *
 * @example
 * ```typescript
 * const touchHandler = new TouchHandler({
 *   container: gridElement,
 *   getCellAtPoint: (x, y) => hitTester.getCellAtPoint(x, y),
 *   onTap: (cell) => {
 *     console.log('Tapped cell:', cell);
 *   },
 *   onDoubleTap: (cell) => {
 *     startEditing(cell);
 *   },
 *   onLongPress: (cell) => {
 *     showContextMenu(cell);
 *   },
 * });
 * ```
 */
export class TouchHandler {
  private container: HTMLElement;
  private getCellAtPoint: (x: number, y: number) => CellRef | null;
  private onTap?: (cell: CellRef, event: TouchEvent) => void;
  private onDoubleTap?: (cell: CellRef, event: TouchEvent) => void;
  private onLongPress?: (cell: CellRef, event: TouchEvent) => void;
  private onDrag?: (startCell: CellRef, currentCell: CellRef, event: TouchEvent) => void;

  private doubleTapDelay: number;
  private longPressDelay: number;
  private minSwipeDistance: number;
  private enablePinchZoom: boolean;
  private enableDragSelect: boolean;
  private preventDefaultScroll: boolean;

  // Touch state
  private touchStart: TouchPoint | null = null;
  private lastTap: TouchPoint | null = null;
  private longPressTimer: number | null = null;
  private isDragging = false;
  private isPinching = false;
  // TODO: Uncomment when pinch zoom is implemented
  // private initialPinchDistance = 0;

  constructor(options: TouchHandlerOptions) {
    this.container = options.container;
    // Note: options.events is available but not currently used
    this.getCellAtPoint = options.getCellAtPoint;
    this.onTap = options.onTap;
    this.onDoubleTap = options.onDoubleTap;
    this.onLongPress = options.onLongPress;
    this.onDrag = options.onDrag;

    this.doubleTapDelay = options.doubleTapDelay ?? 300;
    this.longPressDelay = options.longPressDelay ?? 500;
    this.minSwipeDistance = options.minSwipeDistance ?? 50;
    this.enablePinchZoom = options.enablePinchZoom ?? true;
    this.enableDragSelect = options.enableDragSelect ?? true;
    this.preventDefaultScroll = options.preventDefaultScroll ?? true;

    this.attachEventListeners();
  }

  /**
   * Attach touch event listeners
   */
  private attachEventListeners(): void {
    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.container.addEventListener('touchcancel', this.handleTouchCancel);
  }

  /**
   * Handle touchstart event
   */
  private handleTouchStart = (event: TouchEvent): void => {
    const touches = event.touches;

    if (touches.length === 1) {
      // Single touch
      const touch = touches[0];
      const point = this.getTouchPoint(touch);

      this.touchStart = point;
      this.isDragging = false;

      // Start long-press timer
      this.longPressTimer = window.setTimeout(() => {
        this.handleLongPress(event);
      }, this.longPressDelay);

      if (this.preventDefaultScroll) {
        event.preventDefault();
      }
    } else if (touches.length === 2 && this.enablePinchZoom) {
      // Two touches - pinch zoom
      this.cancelLongPress();
      this.isPinching = true;
      // TODO: Implement pinch zoom functionality
      // this.initialPinchDistance = this.getPinchDistance(touches[0], touches[1]);

      event.preventDefault();
    }
  };

  /**
   * Handle touchmove event
   */
  private handleTouchMove = (event: TouchEvent): void => {
    const touches = event.touches;

    if (touches.length === 1 && this.touchStart) {
      const touch = touches[0];
      const current = this.getTouchPoint(touch);

      // Calculate movement distance
      const distance = Math.sqrt(
        Math.pow(current.x - this.touchStart.x, 2) +
        Math.pow(current.y - this.touchStart.y, 2)
      );

      // Cancel long-press if moved too much
      if (distance > 10) {
        this.cancelLongPress();
      }

      // Handle drag if enabled
      if (this.enableDragSelect && distance > 20) {
        if (!this.isDragging) {
          this.isDragging = true;
        }

        if (this.isDragging && this.touchStart.cell && current.cell && this.onDrag) {
          this.onDrag(this.touchStart.cell, current.cell, event);
        }
      }

      if (this.preventDefaultScroll && (this.isDragging || distance > 10)) {
        event.preventDefault();
      }
    } else if (touches.length === 2 && this.isPinching) {
      // Handle pinch zoom
      // TODO: Implement pinch zoom functionality
      // const currentDistance = this.getPinchDistance(touches[0], touches[1]);
      // const scale = currentDistance / this.initialPinchDistance;

      // Emit pinch zoom event (could be used for zoom feature)
      // For now, just prevent default
      event.preventDefault();
    }
  };

  /**
   * Handle touchend event
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    this.cancelLongPress();

    if (this.isPinching) {
      this.isPinching = false;
      return;
    }

    if (!this.touchStart) return;

    const touch = event.changedTouches[0];
    const end = this.getTouchPoint(touch);

    // Calculate distance and time
    const distance = Math.sqrt(
      Math.pow(end.x - this.touchStart.x, 2) +
      Math.pow(end.y - this.touchStart.y, 2)
    );
    const duration = end.time - this.touchStart.time;

    // Detect gesture type
    if (this.isDragging) {
      // Drag gesture - already handled in touchmove
      this.isDragging = false;
    } else if (distance < 10) {
      // Tap or double-tap
      this.handleTapGesture(end, event);
    } else if (distance > this.minSwipeDistance && duration < 300) {
      // Swipe gesture
      this.handleSwipeGesture(this.touchStart, end);
    }

    this.touchStart = null;
  };

  /**
   * Handle touchcancel event
   */
  private handleTouchCancel = (): void => {
    this.cancelLongPress();
    this.touchStart = null;
    this.isDragging = false;
    this.isPinching = false;
  };

  /**
   * Handle tap gesture
   */
  private handleTapGesture(point: TouchPoint, event: TouchEvent): void {
    const now = Date.now();

    // Check for double-tap
    if (
      this.lastTap &&
      point.cell &&
      this.lastTap.cell &&
      point.cell.row === this.lastTap.cell.row &&
      point.cell.col === this.lastTap.cell.col &&
      now - this.lastTap.time < this.doubleTapDelay
    ) {
      // Double-tap detected
      if (this.onDoubleTap && point.cell) {
        this.onDoubleTap(point.cell, event);
      }

      this.lastTap = null; // Reset to prevent triple-tap
    } else {
      // Single tap
      if (this.onTap && point.cell) {
        this.onTap(point.cell, event);
      }

      this.lastTap = point;
    }
  }

  /**
   * Handle long-press gesture
   */
  private handleLongPress(event: TouchEvent): void {
    if (this.touchStart?.cell && this.onLongPress) {
      this.onLongPress(this.touchStart.cell, event);
    }

    this.longPressTimer = null;
  }

  /**
   * Handle swipe gesture
   */
  private handleSwipeGesture(_start: TouchPoint, _end: TouchPoint): void {
    // TODO: Implement swipe event emission
    // const dx = end.x - start.x;
    // const dy = end.y - start.y;

    // Determine swipe direction
    // let gesture: TouchGesture;
    // if (Math.abs(dx) > Math.abs(dy)) {
    //   // Horizontal swipe
    //   gesture = dx > 0 ? 'swipe-right' : 'swipe-left';
    // } else {
    //   // Vertical swipe
    //   gesture = dy > 0 ? 'swipe-down' : 'swipe-up';
    // }

    // Could emit swipe events here
    // console.log('Swipe detected:', gesture);
  }

  /**
   * Cancel long-press timer
   */
  private cancelLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Get touch point with cell info
   */
  private getTouchPoint(touch: Touch): TouchPoint {
    const rect = this.container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    return {
      x,
      y,
      time: Date.now(),
      cell: this.getCellAtPoint(x, y),
    };
  }

  /**
   * Calculate distance between two touches (for pinch)
   * TODO: Uncomment when pinch zoom is implemented
   */
  // private getPinchDistance(touch1: Touch, touch2: Touch): number {
  //   const dx = touch1.clientX - touch2.clientX;
  //   const dy = touch1.clientY - touch2.clientY;
  //   return Math.sqrt(dx * dx + dy * dy);
  // }

  /**
   * Destroy touch handler
   */
  destroy(): void {
    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchmove', this.handleTouchMove);
    this.container.removeEventListener('touchend', this.handleTouchEnd);
    this.container.removeEventListener('touchcancel', this.handleTouchCancel);

    this.cancelLongPress();
    this.touchStart = null;
    this.lastTap = null;
  }
}
