/**
 * @fileoverview Tests for range utilities
 */

import {
  normalizeRange,
  containsCell,
  containsCellRef,
  rangesIntersect,
  getRangeIntersection,
  rangeContains,
  getRangeSize,
  isRangeEmpty,
  isSingleCell,
  cellToRange,
  cellRefToRange,
  mergeRanges,
  rangesAreAdjacent,
  expandRange,
  clampRange,
  rangesEqual,
  rangeToString,
  cellRefToString,
  forEachCellInRange,
  getCellsInRange,
} from './range-utils';
import type { CellRange } from '../types';

describe('normalizeRange', () => {
  it('should normalize a reversed range', () => {
    const range: CellRange = { startRow: 5, startCol: 3, endRow: 2, endCol: 1 };
    const normalized = normalizeRange(range);

    expect(normalized).toEqual({
      startRow: 2,
      startCol: 1,
      endRow: 5,
      endCol: 3,
    });
  });

  it('should handle already normalized range', () => {
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    const normalized = normalizeRange(range);

    expect(normalized).toEqual(range);
  });

  it('should handle single cell range', () => {
    const range: CellRange = { startRow: 3, startCol: 3, endRow: 3, endCol: 3 };
    const normalized = normalizeRange(range);

    expect(normalized).toEqual(range);
  });
});

describe('containsCell', () => {
  const range: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };

  it('should return true for cell inside range', () => {
    expect(containsCell(range, 2, 3)).toBe(true);
    expect(containsCell(range, 0, 0)).toBe(true);
    expect(containsCell(range, 5, 5)).toBe(true);
  });

  it('should return false for cell outside range', () => {
    expect(containsCell(range, 6, 3)).toBe(false);
    expect(containsCell(range, 3, 6)).toBe(false);
    expect(containsCell(range, -1, 3)).toBe(false);
  });

  it('should handle reversed range', () => {
    const reversed: CellRange = { startRow: 5, startCol: 5, endRow: 0, endCol: 0 };
    expect(containsCell(reversed, 2, 3)).toBe(true);
  });
});

describe('containsCellRef', () => {
  const range: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };

  it('should return true for cell ref inside range', () => {
    expect(containsCellRef(range, { row: 2, col: 3 })).toBe(true);
  });

  it('should return false for cell ref outside range', () => {
    expect(containsCellRef(range, { row: 6, col: 3 })).toBe(false);
  });
});

describe('rangesIntersect', () => {
  it('should return true for overlapping ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    const b: CellRange = { startRow: 3, startCol: 3, endRow: 8, endCol: 8 };

    expect(rangesIntersect(a, b)).toBe(true);
  });

  it('should return false for non-overlapping ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const b: CellRange = { startRow: 5, startCol: 5, endRow: 8, endCol: 8 };

    expect(rangesIntersect(a, b)).toBe(false);
  });

  it('should return true for touching ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const b: CellRange = { startRow: 2, startCol: 2, endRow: 4, endCol: 4 };

    expect(rangesIntersect(a, b)).toBe(true);
  });

  it('should return true when one range contains another', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 10, endCol: 10 };
    const b: CellRange = { startRow: 2, startCol: 2, endRow: 5, endCol: 5 };

    expect(rangesIntersect(a, b)).toBe(true);
  });
});

describe('getRangeIntersection', () => {
  it('should return intersection of overlapping ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    const b: CellRange = { startRow: 3, startCol: 3, endRow: 8, endCol: 8 };

    const result = getRangeIntersection(a, b);

    expect(result.intersects).toBe(true);
    expect(result.intersection).toEqual({
      startRow: 3,
      startCol: 3,
      endRow: 5,
      endCol: 5,
    });
  });

  it('should return no intersection for non-overlapping ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const b: CellRange = { startRow: 5, startCol: 5, endRow: 8, endCol: 8 };

    const result = getRangeIntersection(a, b);

    expect(result.intersects).toBe(false);
    expect(result.intersection).toBeUndefined();
  });
});

describe('rangeContains', () => {
  it('should return true when A contains B', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 10, endCol: 10 };
    const b: CellRange = { startRow: 2, startCol: 2, endRow: 5, endCol: 5 };

    expect(rangeContains(a, b)).toBe(true);
  });

  it('should return false when A does not contain B', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    const b: CellRange = { startRow: 3, startCol: 3, endRow: 8, endCol: 8 };

    expect(rangeContains(a, b)).toBe(false);
  });

  it('should return true for equal ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    const b: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };

    expect(rangeContains(a, b)).toBe(true);
  });
});

describe('getRangeSize', () => {
  it('should calculate size correctly', () => {
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 3 };
    const size = getRangeSize(range);

    expect(size).toEqual({
      rows: 6,
      cols: 4,
      totalCells: 24,
    });
  });

  it('should handle single cell', () => {
    const range: CellRange = { startRow: 2, startCol: 3, endRow: 2, endCol: 3 };
    const size = getRangeSize(range);

    expect(size).toEqual({
      rows: 1,
      cols: 1,
      totalCells: 1,
    });
  });

  it('should handle reversed range', () => {
    const range: CellRange = { startRow: 5, startCol: 3, endRow: 0, endCol: 0 };
    const size = getRangeSize(range);

    expect(size).toEqual({
      rows: 6,
      cols: 4,
      totalCells: 24,
    });
  });
});

describe('isRangeEmpty', () => {
  it('should return false for non-empty range', () => {
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    expect(isRangeEmpty(range)).toBe(false);
  });

  it('should return false for single cell', () => {
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    expect(isRangeEmpty(range)).toBe(false);
  });
});

describe('isSingleCell', () => {
  it('should return true for single cell', () => {
    const range: CellRange = { startRow: 2, startCol: 3, endRow: 2, endCol: 3 };
    expect(isSingleCell(range)).toBe(true);
  });

  it('should return false for multi-cell range', () => {
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    expect(isSingleCell(range)).toBe(false);
  });

  it('should handle reversed single cell', () => {
    const range: CellRange = { startRow: 3, startCol: 2, endRow: 3, endCol: 2 };
    expect(isSingleCell(range)).toBe(true);
  });
});

describe('cellToRange', () => {
  it('should create single cell range', () => {
    const range = cellToRange(2, 3);

    expect(range).toEqual({
      startRow: 2,
      startCol: 3,
      endRow: 2,
      endCol: 3,
    });
  });
});

describe('cellRefToRange', () => {
  it('should create single cell range from ref', () => {
    const range = cellRefToRange({ row: 2, col: 3 });

    expect(range).toEqual({
      startRow: 2,
      startCol: 3,
      endRow: 2,
      endCol: 3,
    });
  });
});

describe('mergeRanges', () => {
  it('should merge overlapping ranges', () => {
    const ranges: CellRange[] = [
      { startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
      { startRow: 1, startCol: 1, endRow: 3, endCol: 3 },
      { startRow: 5, startCol: 5, endRow: 7, endCol: 7 },
    ];

    const merged = mergeRanges(ranges);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ startRow: 0, startCol: 0, endRow: 3, endCol: 3 });
    expect(merged[1]).toEqual({ startRow: 5, startCol: 5, endRow: 7, endCol: 7 });
  });

  it('should merge adjacent ranges when option is true', () => {
    const ranges: CellRange[] = [
      { startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
      { startRow: 0, startCol: 3, endRow: 2, endCol: 5 },
    ];

    const merged = mergeRanges(ranges, { mergeAdjacent: true });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({ startRow: 0, startCol: 0, endRow: 2, endCol: 5 });
  });

  it('should not merge adjacent ranges by default', () => {
    const ranges: CellRange[] = [
      { startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
      { startRow: 0, startCol: 3, endRow: 2, endCol: 5 },
    ];

    const merged = mergeRanges(ranges);

    expect(merged).toHaveLength(2);
  });

  it('should handle empty array', () => {
    const merged = mergeRanges([]);
    expect(merged).toHaveLength(0);
  });

  it('should handle single range', () => {
    const ranges: CellRange[] = [{ startRow: 0, startCol: 0, endRow: 2, endCol: 2 }];
    const merged = mergeRanges(ranges);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({ startRow: 0, startCol: 0, endRow: 2, endCol: 2 });
  });
});

describe('rangesAreAdjacent', () => {
  it('should return true for horizontally adjacent ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const b: CellRange = { startRow: 0, startCol: 3, endRow: 2, endCol: 5 };

    expect(rangesAreAdjacent(a, b)).toBe(true);
  });

  it('should return true for vertically adjacent ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const b: CellRange = { startRow: 3, startCol: 0, endRow: 5, endCol: 2 };

    expect(rangesAreAdjacent(a, b)).toBe(true);
  });

  it('should return false for non-adjacent ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const b: CellRange = { startRow: 5, startCol: 5, endRow: 7, endCol: 7 };

    expect(rangesAreAdjacent(a, b)).toBe(false);
  });

  it('should return false for overlapping ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 3, endCol: 3 };
    const b: CellRange = { startRow: 2, startCol: 2, endRow: 5, endCol: 5 };

    expect(rangesAreAdjacent(a, b)).toBe(false);
  });
});

describe('expandRange', () => {
  it('should expand range by specified amount', () => {
    const range: CellRange = { startRow: 2, startCol: 2, endRow: 4, endCol: 4 };
    const expanded = expandRange(range, 1, 1);

    expect(expanded).toEqual({
      startRow: 1,
      startCol: 1,
      endRow: 5,
      endCol: 5,
    });
  });

  it('should shrink range with negative values', () => {
    const range: CellRange = { startRow: 2, startCol: 2, endRow: 6, endCol: 6 };
    const shrunk = expandRange(range, -1, -1);

    expect(shrunk).toEqual({
      startRow: 3,
      startCol: 3,
      endRow: 5,
      endCol: 5,
    });
  });

  it('should not go below zero', () => {
    const range: CellRange = { startRow: 1, startCol: 1, endRow: 3, endCol: 3 };
    const expanded = expandRange(range, 5, 5);

    expect(expanded.startRow).toBe(0);
    expect(expanded.startCol).toBe(0);
  });
});

describe('clampRange', () => {
  it('should clamp range to boundaries', () => {
    const range: CellRange = { startRow: -1, startCol: -1, endRow: 100, endCol: 100 };
    const clamped = clampRange(range, 50, 50);

    expect(clamped).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 50,
      endCol: 50,
    });
  });

  it('should not modify range within boundaries', () => {
    const range: CellRange = { startRow: 5, startCol: 5, endRow: 10, endCol: 10 };
    const clamped = clampRange(range, 50, 50);

    expect(clamped).toEqual(range);
  });
});

describe('rangesEqual', () => {
  it('should return true for equal ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    const b: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };

    expect(rangesEqual(a, b)).toBe(true);
  });

  it('should return true for reversed but equivalent ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    const b: CellRange = { startRow: 5, startCol: 5, endRow: 0, endCol: 0 };

    expect(rangesEqual(a, b)).toBe(true);
  });

  it('should return false for different ranges', () => {
    const a: CellRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    const b: CellRange = { startRow: 1, startCol: 1, endRow: 6, endCol: 6 };

    expect(rangesEqual(a, b)).toBe(false);
  });
});

describe('rangeToString', () => {
  it('should convert range to A1 notation', () => {
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 4, endCol: 1 };
    expect(rangeToString(range)).toBe('A1:B5');
  });

  it('should handle single cell', () => {
    const range: CellRange = { startRow: 2, startCol: 3, endRow: 2, endCol: 3 };
    expect(rangeToString(range)).toBe('D3');
  });

  it('should handle larger columns', () => {
    const range: CellRange = { startRow: 0, startCol: 26, endRow: 0, endCol: 27 };
    expect(rangeToString(range)).toBe('AA1:AB1');
  });
});

describe('cellRefToString', () => {
  it('should convert cell ref to A1 notation', () => {
    expect(cellRefToString({ row: 0, col: 0 })).toBe('A1');
    expect(cellRefToString({ row: 0, col: 1 })).toBe('B1');
    expect(cellRefToString({ row: 1, col: 0 })).toBe('A2');
    expect(cellRefToString({ row: 9, col: 25 })).toBe('Z10');
  });

  it('should handle columns beyond Z', () => {
    expect(cellRefToString({ row: 0, col: 26 })).toBe('AA1');
    expect(cellRefToString({ row: 0, col: 27 })).toBe('AB1');
    expect(cellRefToString({ row: 0, col: 51 })).toBe('AZ1');
    expect(cellRefToString({ row: 0, col: 52 })).toBe('BA1');
  });
});

describe('forEachCellInRange', () => {
  it('should iterate over all cells in range', () => {
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const cells: string[] = [];

    forEachCellInRange(range, (row, col) => {
      cells.push(`${row},${col}`);
    });

    expect(cells).toHaveLength(9);
    expect(cells).toContain('0,0');
    expect(cells).toContain('1,1');
    expect(cells).toContain('2,2');
  });

  it('should handle single cell', () => {
    const range: CellRange = { startRow: 5, startCol: 3, endRow: 5, endCol: 3 };
    const cells: string[] = [];

    forEachCellInRange(range, (row, col) => {
      cells.push(`${row},${col}`);
    });

    expect(cells).toHaveLength(1);
    expect(cells[0]).toBe('5,3');
  });
});

describe('getCellsInRange', () => {
  it('should return all cells in range', () => {
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };
    const cells = getCellsInRange(range);

    expect(cells).toHaveLength(4);
    expect(cells).toContainEqual({ row: 0, col: 0 });
    expect(cells).toContainEqual({ row: 0, col: 1 });
    expect(cells).toContainEqual({ row: 1, col: 0 });
    expect(cells).toContainEqual({ row: 1, col: 1 });
  });

  it('should handle single cell', () => {
    const range: CellRange = { startRow: 3, startCol: 2, endRow: 3, endCol: 2 };
    const cells = getCellsInRange(range);

    expect(cells).toHaveLength(1);
    expect(cells[0]).toEqual({ row: 3, col: 2 });
  });
});
