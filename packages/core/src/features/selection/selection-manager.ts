/**
 * SelectionManager - Manages cell, row, and column selections using IntervalTree
 *
 * Uses IntervalTree from shared package for efficient range query and storage.
 * Supports:
 * - Single cell selection
 * - Row range selection
 * - Column range selection
 * - Multi-range selection
 * - Selection queries (isSelected, getSelectedRanges, etc.)
 */

import { IntervalTree, type IntervalData } from '@zengrid/shared';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';

/**
 * Selection range types
 */
export type SelectionType = 'cell' | 'row' | 'column' | 'range';

/**
 * Selection range
 */
export interface SelectionRange {
  type: SelectionType;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * Selection mode
 */
export type SelectionMode = 'single' | 'multiple' | 'range';

/**
 * Selection manager options
 */
export interface SelectionManagerOptions {
  /**
   * Selection mode
   * @default 'single'
   */
  mode?: SelectionMode;

  /**
   * Enable row selection
   * @default true
   */
  enableRowSelection?: boolean;

  /**
   * Enable column selection
   * @default true
   */
  enableColumnSelection?: boolean;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;
}

/**
 * Internal selection data stored in interval trees
 */
interface SelectionData {
  id: string;
  type: SelectionType;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * SelectionManager implementation using IntervalTree
 *
 * @example
 * ```typescript
 * const selectionManager = new SelectionManager({
 *   mode: 'multiple',
 *   events: gridEvents,
 * });
 *
 * // Select a single cell
 * selectionManager.selectCell(5, 10);
 *
 * // Select a row range
 * selectionManager.selectRows(0, 10);
 *
 * // Select a column range
 * selectionManager.selectColumns(2, 5);
 *
 * // Check if a cell is selected
 * if (selectionManager.isSelected(5, 10)) {
 *   // Cell is selected
 * }
 *
 * // Get all selected ranges
 * const ranges = selectionManager.getSelectedRanges();
 * ```
 */
export class SelectionManager {
  private mode: SelectionMode;
  private enableRowSelection: boolean;
  private enableColumnSelection: boolean;
  private events?: EventEmitter<GridEvents>;

  // Use IntervalTrees for efficient range queries
  private rowIntervals: IntervalTree<SelectionData>;
  private colIntervals: IntervalTree<SelectionData>;

  // Track selections by ID for easy removal
  private selections: Map<string, SelectionData> = new Map();
  private nextId: number = 0;

  constructor(options: SelectionManagerOptions = {}) {
    this.mode = options.mode ?? 'single';
    this.enableRowSelection = options.enableRowSelection ?? true;
    this.enableColumnSelection = options.enableColumnSelection ?? true;
    this.events = options.events;

    // Initialize interval trees (balanced for better performance)
    this.rowIntervals = new IntervalTree<SelectionData>({ balanced: true });
    this.colIntervals = new IntervalTree<SelectionData>({ balanced: true });
  }

  /**
   * Select a single cell
   */
  selectCell(row: number, col: number, additive: boolean = false): void {
    if (this.mode === 'single' || !additive) {
      this.clearSelection();
    }

    const selection: SelectionData = {
      id: this.generateId(),
      type: 'cell',
      startRow: row,
      endRow: row,
      startCol: col,
      endCol: col,
    };

    this.addSelection(selection);
    this.emitSelectionChange();
  }

  /**
   * Select a row range
   */
  selectRows(startRow: number, endRow: number, additive: boolean = false): void {
    if (!this.enableRowSelection) return;

    if (this.mode === 'single' || !additive) {
      this.clearSelection();
    }

    const selection: SelectionData = {
      id: this.generateId(),
      type: 'row',
      startRow: Math.min(startRow, endRow),
      endRow: Math.max(startRow, endRow),
      startCol: 0,
      endCol: Number.MAX_SAFE_INTEGER, // Entire row
    };

    this.addSelection(selection);
    this.emitSelectionChange();
  }

  /**
   * Select a column range
   */
  selectColumns(
    startCol: number,
    endCol: number,
    additive: boolean = false
  ): void {
    if (!this.enableColumnSelection) return;

    if (this.mode === 'single' || !additive) {
      this.clearSelection();
    }

    const selection: SelectionData = {
      id: this.generateId(),
      type: 'column',
      startRow: 0,
      endRow: Number.MAX_SAFE_INTEGER, // Entire column
      startCol: Math.min(startCol, endCol),
      endCol: Math.max(startCol, endCol),
    };

    this.addSelection(selection);
    this.emitSelectionChange();
  }

  /**
   * Select a rectangular range
   */
  selectRange(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    additive: boolean = false
  ): void {
    if (this.mode === 'single' || !additive) {
      this.clearSelection();
    }

    const selection: SelectionData = {
      id: this.generateId(),
      type: 'range',
      startRow: Math.min(startRow, endRow),
      endRow: Math.max(startRow, endRow),
      startCol: Math.min(startCol, endCol),
      endCol: Math.max(startCol, endCol),
    };

    this.addSelection(selection);
    this.emitSelectionChange();
  }

  /**
   * Check if a cell is selected
   */
  isSelected(row: number, col: number): boolean {
    // Search for overlapping intervals in both dimensions
    const rowMatches = this.rowIntervals.searchPoint(row);
    if (rowMatches.length === 0) return false;

    const colMatches = this.colIntervals.searchPoint(col);
    if (colMatches.length === 0) return false;

    // Check if any selection contains this cell
    for (const rowInterval of rowMatches) {
      for (const colInterval of colMatches) {
        if (rowInterval.data.id === colInterval.data.id) {
          // Same selection contains both row and col
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a row is selected
   */
  isRowSelected(row: number): boolean {
    const matches = this.rowIntervals.searchPoint(row);
    return matches.some(
      (interval) =>
        interval.data.type === 'row' &&
        interval.data.startCol === 0 &&
        interval.data.endCol === Number.MAX_SAFE_INTEGER
    );
  }

  /**
   * Check if a column is selected
   */
  isColumnSelected(col: number): boolean {
    const matches = this.colIntervals.searchPoint(col);
    return matches.some(
      (interval) =>
        interval.data.type === 'column' &&
        interval.data.startRow === 0 &&
        interval.data.endRow === Number.MAX_SAFE_INTEGER
    );
  }

  /**
   * Get all selected ranges
   */
  getSelectedRanges(): SelectionRange[] {
    return Array.from(this.selections.values()).map((selection) => ({
      type: selection.type,
      startRow: selection.startRow,
      endRow: selection.endRow,
      startCol: selection.startCol,
      endCol: selection.endCol,
    }));
  }

  /**
   * Get selected rows (for row selections only)
   */
  getSelectedRows(): number[] {
    const rows: number[] = [];

    for (const selection of this.selections.values()) {
      if (selection.type === 'row') {
        for (let row = selection.startRow; row <= selection.endRow; row++) {
          rows.push(row);
        }
      }
    }

    return rows;
  }

  /**
   * Get selected columns (for column selections only)
   */
  getSelectedColumns(): number[] {
    const cols: number[] = [];

    for (const selection of this.selections.values()) {
      if (selection.type === 'column') {
        for (let col = selection.startCol; col <= selection.endCol; col++) {
          cols.push(col);
        }
      }
    }

    return cols;
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selections.clear();
    this.rowIntervals = new IntervalTree<SelectionData>({ balanced: true });
    this.colIntervals = new IntervalTree<SelectionData>({ balanced: true });
    this.emitSelectionChange();
  }

  /**
   * Get selection count
   */
  get selectionCount(): number {
    return this.selections.size;
  }

  /**
   * Check if anything is selected
   */
  hasSelection(): boolean {
    return this.selections.size > 0;
  }

  /**
   * Set selection mode
   */
  setMode(mode: SelectionMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      if (mode === 'single' && this.selections.size > 1) {
        // Clear extra selections
        const firstSelection = Array.from(this.selections.values())[0];
        this.clearSelection();
        if (firstSelection) {
          this.addSelection(firstSelection);
        }
      }
    }
  }

  /**
   * Add a selection to the interval trees
   */
  private addSelection(selection: SelectionData): void {
    this.selections.set(selection.id, selection);

    // Add to row interval tree
    this.rowIntervals.insert(
      { start: selection.startRow, end: selection.endRow },
      selection
    );

    // Add to column interval tree
    this.colIntervals.insert(
      { start: selection.startCol, end: selection.endCol },
      selection
    );
  }

  /**
   * Generate unique ID for selections
   */
  private generateId(): string {
    return `sel_${this.nextId++}`;
  }

  /**
   * Emit selection change event
   */
  private emitSelectionChange(): void {
    this.events?.emit('selection:change', {
      ranges: this.getSelectedRanges(),
      count: this.selectionCount,
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.clearSelection();
    this.selections.clear();
  }
}
