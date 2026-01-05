import type { ResizeState } from './column-resize-manager.interface';

/**
 * History entry for undo/redo
 */
export interface ResizeHistoryEntry {
  column: number;
  oldWidth: number;
  newWidth: number;
  timestamp: number;
}

/**
 * Configuration for state manager
 */
export interface StateManagerOptions {
  /** Callback when widths change (for persistence) */
  onColumnWidthsChange?: (widths: number[]) => void;
  /** Undo/redo manager integration */
  undoRedoManager?: any;
}

/**
 * Manages resize state and history
 * Separated from main manager for single responsibility
 */
export class ResizeStateManager {
  private state: ResizeState = {
    column: -1,
    startX: 0,
    originalWidth: 0,
    active: false,
  };

  private history: ResizeHistoryEntry[] = [];
  private onColumnWidthsChange?: (widths: number[]) => void;
  private undoRedoManager?: any;

  constructor(options: StateManagerOptions = {}) {
    this.onColumnWidthsChange = options.onColumnWidthsChange;
    this.undoRedoManager = options.undoRedoManager;
  }

  /**
   * Get current resize state
   */
  getState(): Readonly<ResizeState> {
    return { ...this.state };
  }

  /**
   * Check if resize is currently active
   */
  isActive(): boolean {
    return this.state.active;
  }

  /**
   * Start a resize operation
   */
  startResize(column: number, startX: number, originalWidth: number): void {
    this.state = {
      column,
      startX,
      originalWidth,
      active: true,
    };
  }

  /**
   * End a resize operation
   */
  endResize(): void {
    this.state = {
      column: -1,
      startX: 0,
      originalWidth: 0,
      active: false,
    };
  }

  /**
   * Record a resize operation in history
   */
  recordResize(column: number, oldWidth: number, newWidth: number): void {
    const entry: ResizeHistoryEntry = {
      column,
      oldWidth,
      newWidth,
      timestamp: Date.now(),
    };

    this.history.push(entry);

    // Integrate with undo/redo manager if available
    if (this.undoRedoManager) {
      // This would integrate with the existing UndoRedoManager
      // For now, we'll leave a placeholder
      // TODO: Implement ColumnResizeCommand and register it
    }
  }

  /**
   * Get resize history
   */
  getHistory(): readonly ResizeHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear resize history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Notify listeners of width changes (for persistence)
   */
  notifyWidthChange(widths: number[]): void {
    if (this.onColumnWidthsChange) {
      this.onColumnWidthsChange(widths);
    }
  }

  /**
   * Get the column currently being resized (-1 if none)
   */
  getActiveColumn(): number {
    return this.state.column;
  }

  /**
   * Get the original width of the column being resized
   */
  getOriginalWidth(): number {
    return this.state.originalWidth;
  }

  /**
   * Get the start X position of the resize
   */
  getStartX(): number {
    return this.state.startX;
  }
}
