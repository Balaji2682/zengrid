/**
 * UndoRedoManager - Undo/Redo functionality for grid operations
 *
 * Uses CommandStack from shared package for managing command history.
 * Supports:
 * - Cell value changes
 * - Filter changes
 * - Sort changes
 * - Selection changes
 * - Custom commands
 */

import { CommandStack, type ICommand } from '@zengrid/shared';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';

/**
 * Undo/Redo manager options
 */
export interface UndoRedoManagerOptions {
  /**
   * Maximum number of commands to keep in history
   * @default 100
   */
  maxHistorySize?: number;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;

  /**
   * Enable automatic grouping of similar commands
   * @default true
   */
  enableCommandGrouping?: boolean;

  /**
   * Time window (ms) for grouping similar commands
   * @default 1000
   */
  groupingTimeWindow?: number;
}

/**
 * Cell edit command
 */
export class CellEditCommand implements ICommand {
  description: string;

  constructor(
    private row: number,
    private col: number,
    private oldValue: any,
    private newValue: any,
    private setValue: (row: number, col: number, value: any) => void
  ) {
    this.description = `Edit cell (${row}, ${col})`;
  }

  execute(): void {
    this.setValue(this.row, this.col, this.newValue);
  }

  undo(): void {
    this.setValue(this.row, this.col, this.oldValue);
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Batch cell edit command (for multiple cells)
 */
export class BatchCellEditCommand implements ICommand {
  description: string;

  constructor(
    private edits: Array<{
      row: number;
      col: number;
      oldValue: any;
      newValue: any;
    }>,
    private setValue: (row: number, col: number, value: any) => void
  ) {
    this.description = `Edit ${edits.length} cells`;
  }

  execute(): void {
    for (const edit of this.edits) {
      this.setValue(edit.row, edit.col, edit.newValue);
    }
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.edits.length - 1; i >= 0; i--) {
      const edit = this.edits[i];
      this.setValue(edit.row, edit.col, edit.oldValue);
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Filter change command
 */
export class FilterChangeCommand implements ICommand {
  description: string;

  constructor(
    private oldFilters: any[],
    private newFilters: any[],
    private setFilters: (filters: any[]) => void
  ) {
    this.description = 'Change filters';
  }

  execute(): void {
    this.setFilters(this.newFilters);
  }

  undo(): void {
    this.setFilters(this.oldFilters);
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Sort change command
 */
export class SortChangeCommand implements ICommand {
  description: string;

  constructor(
    private oldSortState: any[],
    private newSortState: any[],
    private setSortState: (sortState: any[]) => void
  ) {
    this.description = 'Change sort';
  }

  execute(): void {
    this.setSortState(this.newSortState);
  }

  undo(): void {
    this.setSortState(this.oldSortState);
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Generic command for custom operations
 */
export class GenericCommand implements ICommand {
  constructor(
    public description: string,
    private executeCallback: () => void,
    private undoCallback: () => void,
    private redoCallback?: () => void
  ) {}

  execute(): void {
    this.executeCallback();
  }

  undo(): void {
    this.undoCallback();
  }

  redo(): void {
    if (this.redoCallback) {
      this.redoCallback();
    } else {
      this.execute();
    }
  }
}

/**
 * UndoRedoManager implementation using CommandStack
 *
 * @example
 * ```typescript
 * const undoRedoManager = new UndoRedoManager({
 *   maxHistorySize: 50,
 *   events: gridEvents,
 * });
 *
 * // Record a cell edit
 * undoRedoManager.recordCellEdit(5, 10, 'old', 'new', (r, c, v) => {
 *   grid.setCellValue(r, c, v);
 * });
 *
 * // Undo last change
 * undoRedoManager.undo();
 *
 * // Redo
 * undoRedoManager.redo();
 *
 * // Check if can undo/redo
 * console.log(undoRedoManager.canUndo()); // true
 * console.log(undoRedoManager.canRedo()); // false
 * ```
 */
export class UndoRedoManager {
  private commandStack: CommandStack;
  private events?: EventEmitter<GridEvents>;
  private enableCommandGrouping: boolean;
  private groupingTimeWindow: number;

  // For command grouping
  private lastCommandTime: number = 0;
  private lastCommandType: string = '';
  private pendingBatchEdits: Array<{
    row: number;
    col: number;
    oldValue: any;
    newValue: any;
  }> = [];
  private batchEditTimer: number | null = null;

  constructor(options: UndoRedoManagerOptions = {}) {
    this.commandStack = new CommandStack({
      maxSize: options.maxHistorySize ?? 100,
    });
    this.events = options.events;
    this.enableCommandGrouping = options.enableCommandGrouping ?? true;
    this.groupingTimeWindow = options.groupingTimeWindow ?? 1000;
  }

  /**
   * Record a cell edit
   */
  recordCellEdit(
    row: number,
    col: number,
    oldValue: any,
    newValue: any,
    setValue: (row: number, col: number, value: any) => void
  ): void {
    if (this.enableCommandGrouping) {
      // Group rapid cell edits into a batch
      const now = Date.now();
      if (
        now - this.lastCommandTime < this.groupingTimeWindow &&
        this.lastCommandType === 'cell-edit'
      ) {
        // Add to batch
        this.pendingBatchEdits.push({ row, col, oldValue, newValue });
        this.lastCommandTime = now;

        // Reset timer
        if (this.batchEditTimer !== null) {
          window.clearTimeout(this.batchEditTimer);
        }

        this.batchEditTimer = window.setTimeout(() => {
          this.flushBatchEdits(setValue);
        }, this.groupingTimeWindow);

        return;
      } else {
        // Flush pending batch before starting new one
        if (this.pendingBatchEdits.length > 0) {
          this.flushBatchEdits(setValue);
        }
      }

      // Start new batch
      this.pendingBatchEdits.push({ row, col, oldValue, newValue });
      this.lastCommandTime = now;
      this.lastCommandType = 'cell-edit';

      this.batchEditTimer = window.setTimeout(() => {
        this.flushBatchEdits(setValue);
      }, this.groupingTimeWindow);
    } else {
      // Execute immediately
      const command = new CellEditCommand(row, col, oldValue, newValue, setValue);
      this.commandStack.execute(command);
      this.emitHistoryChange();
    }
  }

  /**
   * Record a filter change
   */
  recordFilterChange(
    oldFilters: any[],
    newFilters: any[],
    setFilters: (filters: any[]) => void
  ): void {
    const command = new FilterChangeCommand(oldFilters, newFilters, setFilters);
    this.commandStack.execute(command);
    this.emitHistoryChange();
  }

  /**
   * Record a sort change
   */
  recordSortChange(
    oldSortState: any[],
    newSortState: any[],
    setSortState: (sortState: any[]) => void
  ): void {
    const command = new SortChangeCommand(oldSortState, newSortState, setSortState);
    this.commandStack.execute(command);
    this.emitHistoryChange();
  }

  /**
   * Execute a custom command
   */
  executeCommand(command: ICommand): void {
    this.commandStack.execute(command);
    this.emitHistoryChange();
  }

  /**
   * Create and execute a generic command
   */
  recordCustomCommand(
    description: string,
    execute: () => void,
    undo: () => void,
    redo?: () => void
  ): void {
    const command = new GenericCommand(description, execute, undo, redo);
    this.commandStack.execute(command);
    this.emitHistoryChange();
  }

  /**
   * Undo last command
   */
  undo(): boolean {
    // Flush pending batch edits first
    if (this.pendingBatchEdits.length > 0) {
      // Don't create a command, just clear the batch
      this.pendingBatchEdits = [];
      if (this.batchEditTimer !== null) {
        window.clearTimeout(this.batchEditTimer);
        this.batchEditTimer = null;
      }
    }

    const success = this.commandStack.undo();
    if (success) {
      this.emitHistoryChange();
    }
    return success;
  }

  /**
   * Redo last undone command
   */
  redo(): boolean {
    const success = this.commandStack.redo();
    if (success) {
      this.emitHistoryChange();
    }
    return success;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.commandStack.canUndo() || this.pendingBatchEdits.length > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.commandStack.canRedo();
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.commandStack.clear();
    this.pendingBatchEdits = [];
    if (this.batchEditTimer !== null) {
      window.clearTimeout(this.batchEditTimer);
      this.batchEditTimer = null;
    }
    this.emitHistoryChange();
  }

  /**
   * Get undo history
   */
  getUndoHistory(): string[] {
    return this.commandStack.getUndoHistory();
  }

  /**
   * Get redo history
   */
  getRedoHistory(): string[] {
    return this.commandStack.getRedoHistory();
  }

  /**
   * Get undo count
   */
  getUndoCount(): number {
    return this.commandStack.getUndoCount();
  }

  /**
   * Get redo count
   */
  getRedoCount(): number {
    return this.commandStack.getRedoCount();
  }

  /**
   * Flush pending batch edits
   */
  private flushBatchEdits(
    setValue: (row: number, col: number, value: any) => void
  ): void {
    if (this.pendingBatchEdits.length === 0) return;

    if (this.pendingBatchEdits.length === 1) {
      const edit = this.pendingBatchEdits[0];
      const command = new CellEditCommand(
        edit.row,
        edit.col,
        edit.oldValue,
        edit.newValue,
        setValue
      );
      this.commandStack.execute(command);
    } else {
      const command = new BatchCellEditCommand(
        [...this.pendingBatchEdits],
        setValue
      );
      this.commandStack.execute(command);
    }

    this.pendingBatchEdits = [];
    this.batchEditTimer = null;
    this.emitHistoryChange();
  }

  /**
   * Emit history change event
   */
  private emitHistoryChange(): void {
    this.events?.emit('undo-redo:change', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.getUndoCount(),
      redoCount: this.getRedoCount(),
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.clear();
  }
}
