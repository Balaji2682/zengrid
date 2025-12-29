/**
 * @fileoverview Range utilities for selection system
 * @module @zengrid/core/selection/range-utils
 */

import type { CellRange, CellRef } from '../types';
import type { RangeIntersection, RangeSize, MergeRangesOptions } from './range-utils.interface';

/**
 * Normalizes a cell range to ensure startRow <= endRow and startCol <= endCol
 *
 * @param range - Range to normalize
 * @returns Normalized range
 *
 * @example
 * ```typescript
 * const range = { startRow: 5, startCol: 3, endRow: 2, endCol: 1 };
 * const normalized = normalizeRange(range);
 * // { startRow: 2, startCol: 1, endRow: 5, endCol: 3 }
 * ```
 */
export function normalizeRange(range: CellRange): CellRange {
  return {
    startRow: Math.min(range.startRow, range.endRow),
    startCol: Math.min(range.startCol, range.endCol),
    endRow: Math.max(range.startRow, range.endRow),
    endCol: Math.max(range.startCol, range.endCol),
  };
}

/**
 * Checks if a cell is contained within a range
 *
 * @param range - Range to check
 * @param row - Row index
 * @param col - Column index
 * @returns True if cell is within range
 *
 * @example
 * ```typescript
 * const range = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
 * containsCell(range, 2, 3); // true
 * containsCell(range, 6, 3); // false
 * ```
 */
export function containsCell(range: CellRange, row: number, col: number): boolean {
  const normalized = normalizeRange(range);
  return (
    row >= normalized.startRow &&
    row <= normalized.endRow &&
    col >= normalized.startCol &&
    col <= normalized.endCol
  );
}

/**
 * Checks if a cell reference is contained within a range
 *
 * @param range - Range to check
 * @param cell - Cell reference
 * @returns True if cell is within range
 */
export function containsCellRef(range: CellRange, cell: CellRef): boolean {
  return containsCell(range, cell.row, cell.col);
}

/**
 * Checks if two ranges intersect
 *
 * @param a - First range
 * @param b - Second range
 * @returns True if ranges intersect
 *
 * @example
 * ```typescript
 * const a = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
 * const b = { startRow: 3, startCol: 3, endRow: 8, endCol: 8 };
 * rangesIntersect(a, b); // true
 * ```
 */
export function rangesIntersect(a: CellRange, b: CellRange): boolean {
  const normA = normalizeRange(a);
  const normB = normalizeRange(b);

  return !(
    normA.endRow < normB.startRow ||
    normA.startRow > normB.endRow ||
    normA.endCol < normB.startCol ||
    normA.startCol > normB.endCol
  );
}

/**
 * Gets the intersection of two ranges
 *
 * @param a - First range
 * @param b - Second range
 * @returns Intersection result
 *
 * @example
 * ```typescript
 * const a = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
 * const b = { startRow: 3, startCol: 3, endRow: 8, endCol: 8 };
 * const result = getRangeIntersection(a, b);
 * // { intersects: true, intersection: { startRow: 3, startCol: 3, endRow: 5, endCol: 5 } }
 * ```
 */
export function getRangeIntersection(a: CellRange, b: CellRange): RangeIntersection {
  if (!rangesIntersect(a, b)) {
    return { intersects: false };
  }

  const normA = normalizeRange(a);
  const normB = normalizeRange(b);

  return {
    intersects: true,
    intersection: {
      startRow: Math.max(normA.startRow, normB.startRow),
      startCol: Math.max(normA.startCol, normB.startCol),
      endRow: Math.min(normA.endRow, normB.endRow),
      endCol: Math.min(normA.endCol, normB.endCol),
    },
  };
}

/**
 * Checks if range A completely contains range B
 *
 * @param a - Outer range
 * @param b - Inner range
 * @returns True if A contains B
 */
export function rangeContains(a: CellRange, b: CellRange): boolean {
  const normA = normalizeRange(a);
  const normB = normalizeRange(b);

  return (
    normA.startRow <= normB.startRow &&
    normA.endRow >= normB.endRow &&
    normA.startCol <= normB.startCol &&
    normA.endCol >= normB.endCol
  );
}

/**
 * Gets the size of a range (number of rows and columns)
 *
 * @param range - Range to measure
 * @returns Range size information
 *
 * @example
 * ```typescript
 * const range = { startRow: 0, startCol: 0, endRow: 5, endCol: 3 };
 * getRangeSize(range);
 * // { rows: 6, cols: 4, totalCells: 24 }
 * ```
 */
export function getRangeSize(range: CellRange): RangeSize {
  const normalized = normalizeRange(range);
  const rows = normalized.endRow - normalized.startRow + 1;
  const cols = normalized.endCol - normalized.startCol + 1;

  return {
    rows,
    cols,
    totalCells: rows * cols,
  };
}

/**
 * Checks if a range is empty (zero size)
 *
 * @param range - Range to check
 * @returns True if range has no cells
 */
export function isRangeEmpty(range: CellRange): boolean {
  const { totalCells } = getRangeSize(range);
  return totalCells === 0;
}

/**
 * Checks if a range is a single cell
 *
 * @param range - Range to check
 * @returns True if range contains exactly one cell
 */
export function isSingleCell(range: CellRange): boolean {
  const normalized = normalizeRange(range);
  return normalized.startRow === normalized.endRow && normalized.startCol === normalized.endCol;
}

/**
 * Creates a range from a single cell
 *
 * @param row - Row index
 * @param col - Column index
 * @returns Range containing single cell
 */
export function cellToRange(row: number, col: number): CellRange {
  return { startRow: row, startCol: col, endRow: row, endCol: col };
}

/**
 * Creates a range from a cell reference
 *
 * @param cell - Cell reference
 * @returns Range containing single cell
 */
export function cellRefToRange(cell: CellRef): CellRange {
  return cellToRange(cell.row, cell.col);
}

/**
 * Merges overlapping and optionally adjacent ranges
 *
 * @param ranges - Array of ranges to merge
 * @param options - Merge options
 * @returns Array of non-overlapping ranges
 *
 * @example
 * ```typescript
 * const ranges = [
 *   { startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
 *   { startRow: 1, startCol: 1, endRow: 3, endCol: 3 },
 *   { startRow: 5, startCol: 5, endRow: 7, endCol: 7 }
 * ];
 * const merged = mergeRanges(ranges);
 * // [
 * //   { startRow: 0, startCol: 0, endRow: 3, endCol: 3 },
 * //   { startRow: 5, startCol: 5, endRow: 7, endCol: 7 }
 * // ]
 * ```
 */
export function mergeRanges(ranges: CellRange[], options: MergeRangesOptions = {}): CellRange[] {
  const { mergeAdjacent = false, sort = true } = options;

  if (ranges.length === 0) {
    return [];
  }

  if (ranges.length === 1) {
    return [normalizeRange(ranges[0])];
  }

  // Normalize all ranges
  let normalized = ranges.map(normalizeRange);

  // Sort ranges by startRow, then startCol for consistent merging
  if (sort) {
    normalized = normalized.sort((a, b) => {
      if (a.startRow !== b.startRow) {
        return a.startRow - b.startRow;
      }
      return a.startCol - b.startCol;
    });
  }

  const merged: CellRange[] = [];
  let current = normalized[0];

  for (let i = 1; i < normalized.length; i++) {
    const next = normalized[i];

    // Check if ranges can be merged
    const shouldMerge = rangesIntersect(current, next) || (mergeAdjacent && rangesAreAdjacent(current, next));

    if (shouldMerge) {
      // Merge ranges by taking the bounding box
      current = {
        startRow: Math.min(current.startRow, next.startRow),
        startCol: Math.min(current.startCol, next.startCol),
        endRow: Math.max(current.endRow, next.endRow),
        endCol: Math.max(current.endCol, next.endCol),
      };
    } else {
      // Add current to result and start new current
      merged.push(current);
      current = next;
    }
  }

  // Add final range
  merged.push(current);

  return merged;
}

/**
 * Checks if two ranges are adjacent (touching but not overlapping)
 *
 * @param a - First range
 * @param b - Second range
 * @returns True if ranges are adjacent
 */
export function rangesAreAdjacent(a: CellRange, b: CellRange): boolean {
  const normA = normalizeRange(a);
  const normB = normalizeRange(b);

  // Check if adjacent horizontally
  const adjacentHorizontal =
    normA.startRow === normB.startRow &&
    normA.endRow === normB.endRow &&
    (normA.endCol + 1 === normB.startCol || normB.endCol + 1 === normA.startCol);

  // Check if adjacent vertically
  const adjacentVertical =
    normA.startCol === normB.startCol &&
    normA.endCol === normB.endCol &&
    (normA.endRow + 1 === normB.startRow || normB.endRow + 1 === normA.startRow);

  return adjacentHorizontal || adjacentVertical;
}

/**
 * Expands a range by a specified number of rows and columns
 *
 * @param range - Range to expand
 * @param rows - Number of rows to expand (can be negative to shrink)
 * @param cols - Number of columns to expand (can be negative to shrink)
 * @returns Expanded range
 */
export function expandRange(range: CellRange, rows: number, cols: number): CellRange {
  const normalized = normalizeRange(range);

  return {
    startRow: Math.max(0, normalized.startRow - rows),
    startCol: Math.max(0, normalized.startCol - cols),
    endRow: normalized.endRow + rows,
    endCol: normalized.endCol + cols,
  };
}

/**
 * Clamps a range to fit within specified boundaries
 *
 * @param range - Range to clamp
 * @param maxRow - Maximum row index
 * @param maxCol - Maximum column index
 * @returns Clamped range
 */
export function clampRange(range: CellRange, maxRow: number, maxCol: number): CellRange {
  const normalized = normalizeRange(range);

  return {
    startRow: Math.max(0, Math.min(normalized.startRow, maxRow)),
    startCol: Math.max(0, Math.min(normalized.startCol, maxCol)),
    endRow: Math.max(0, Math.min(normalized.endRow, maxRow)),
    endCol: Math.max(0, Math.min(normalized.endCol, maxCol)),
  };
}

/**
 * Checks if two ranges are equal
 *
 * @param a - First range
 * @param b - Second range
 * @returns True if ranges are equal
 */
export function rangesEqual(a: CellRange, b: CellRange): boolean {
  const normA = normalizeRange(a);
  const normB = normalizeRange(b);

  return (
    normA.startRow === normB.startRow &&
    normA.startCol === normB.startCol &&
    normA.endRow === normB.endRow &&
    normA.endCol === normB.endCol
  );
}

/**
 * Converts a range to a string representation
 *
 * @param range - Range to convert
 * @returns String representation (e.g., "A1:B5")
 */
export function rangeToString(range: CellRange): string {
  const normalized = normalizeRange(range);

  const startCell = cellRefToString({ row: normalized.startRow, col: normalized.startCol });
  const endCell = cellRefToString({ row: normalized.endRow, col: normalized.endCol });

  return isSingleCell(normalized) ? startCell : `${startCell}:${endCell}`;
}

/**
 * Converts a cell reference to A1 notation
 *
 * @param cell - Cell reference
 * @returns A1 notation (e.g., "B3")
 */
export function cellRefToString(cell: CellRef): string {
  let col = '';
  let colNum = cell.col;

  while (colNum >= 0) {
    col = String.fromCharCode(65 + (colNum % 26)) + col;
    colNum = Math.floor(colNum / 26) - 1;
  }

  return `${col}${cell.row + 1}`;
}

/**
 * Iterates over all cells in a range
 *
 * @param range - Range to iterate
 * @param callback - Callback function called for each cell
 *
 * @example
 * ```typescript
 * const range = { startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
 * forEachCellInRange(range, (row, col) => {
 *   console.log(`Cell: ${row}, ${col}`);
 * });
 * ```
 */
export function forEachCellInRange(range: CellRange, callback: (row: number, col: number) => void): void {
  const normalized = normalizeRange(range);

  for (let row = normalized.startRow; row <= normalized.endRow; row++) {
    for (let col = normalized.startCol; col <= normalized.endCol; col++) {
      callback(row, col);
    }
  }
}

/**
 * Gets all cell references in a range
 *
 * @param range - Range to get cells from
 * @returns Array of cell references
 */
export function getCellsInRange(range: CellRange): CellRef[] {
  const cells: CellRef[] = [];
  forEachCellInRange(range, (row, col) => {
    cells.push({ row, col });
  });
  return cells;
}
