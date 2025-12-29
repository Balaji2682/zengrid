/**
 * @fileoverview Tests for HitTester
 */

import { HitTester, createHitTester } from './hit-tester';
import type { IHeightProvider, IWidthProvider } from './hit-tester.interface';

// Mock uniform height provider
class MockUniformHeightProvider implements IHeightProvider {
  constructor(private height: number, private count: number) {}

  getHeight(_index: number): number {
    return this.height;
  }

  getOffset(index: number): number {
    return index * this.height;
  }

  findIndexAtOffset(offset: number): number {
    return Math.floor(offset / this.height);
  }

  getTotalSize(): number {
    return this.count * this.height;
  }
}

// Mock uniform width provider
class MockUniformWidthProvider implements IWidthProvider {
  constructor(private width: number, private count: number) {}

  getWidth(_index: number): number {
    return this.width;
  }

  getOffset(index: number): number {
    return index * this.width;
  }

  findIndexAtOffset(offset: number): number {
    return Math.floor(offset / this.width);
  }

  getTotalSize(): number {
    return this.count * this.width;
  }
}

// Mock variable height provider
class MockVariableHeightProvider implements IHeightProvider {
  private heights: number[];
  private offsets: number[];

  constructor(heights: number[]) {
    this.heights = heights;
    this.offsets = [0];
    for (let i = 0; i < heights.length; i++) {
      this.offsets.push(this.offsets[i] + heights[i]);
    }
  }

  getHeight(index: number): number {
    return this.heights[index] || 0;
  }

  getOffset(index: number): number {
    return this.offsets[index] || 0;
  }

  findIndexAtOffset(offset: number): number {
    // Binary search
    let left = 0;
    let right = this.offsets.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (this.offsets[mid] <= offset) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }

    return left;
  }

  getTotalSize(): number {
    return this.offsets[this.offsets.length - 1];
  }
}

describe('HitTester - Uniform Sizes', () => {
  let hitTester: HitTester;

  beforeEach(() => {
    const heightProvider = new MockUniformHeightProvider(30, 100); // 100 rows, 30px each
    const widthProvider = new MockUniformWidthProvider(100, 26); // 26 cols, 100px each

    hitTester = new HitTester(heightProvider, widthProvider, {
      rowCount: 100,
      colCount: 26,
    });
  });

  describe('getCellAtPoint', () => {
    it('should find cell at valid coordinates', () => {
      const result = hitTester.getCellAtPoint(150, 90);

      expect(result.hit).toBe(true);
      expect(result.cell).toEqual({ row: 3, col: 1 }); // 90/30=3, 150/100=1
    });

    it('should find cell at origin', () => {
      const result = hitTester.getCellAtPoint(0, 0);

      expect(result.hit).toBe(true);
      expect(result.cell).toEqual({ row: 0, col: 0 });
    });

    it('should find cell at exact boundaries', () => {
      const result = hitTester.getCellAtPoint(100, 30);

      expect(result.hit).toBe(true);
      expect(result.cell).toEqual({ row: 1, col: 1 });
    });

    it('should return no hit for negative coordinates by default', () => {
      const result = hitTester.getCellAtPoint(-10, -10);

      expect(result.hit).toBe(false);
    });

    it('should return no hit for coordinates beyond grid', () => {
      const result = hitTester.getCellAtPoint(3000, 3000);

      expect(result.hit).toBe(false);
    });

    it('should clamp to nearest cell when allowOutside is true', () => {
      const result = hitTester.getCellAtPoint(3000, 3000, { allowOutside: true });

      expect(result.hit).toBe(true);
      expect(result.cell).toEqual({ row: 99, col: 25 }); // Last cell
    });

    it('should include precise offset when requested', () => {
      const result = hitTester.getCellAtPoint(150, 45, { includePreciseOffset: true });

      expect(result.hit).toBe(true);
      expect(result.cell).toEqual({ row: 1, col: 1 });
      expect(result.cellLeft).toBe(100);
      expect(result.cellTop).toBe(30);
      expect(result.cellWidth).toBe(100);
      expect(result.cellHeight).toBe(30);
      expect(result.cellOffsetX).toBe(0.5); // 150-100=50, 50/100=0.5
      expect(result.cellOffsetY).toBe(0.5); // 45-30=15, 15/30=0.5
    });

    it('should handle scroll offset', () => {
      const result = hitTester.getCellAtPoint(50, 15, {
        scrollOffset: { left: 100, top: 30 },
      });

      expect(result.hit).toBe(true);
      expect(result.cell).toEqual({ row: 1, col: 1 }); // (50+100)/100=1, (15+30)/30=1
    });
  });

  describe('getCellAtPointOrNull', () => {
    it('should return cell for valid coordinates', () => {
      const cell = hitTester.getCellAtPointOrNull(150, 90);

      expect(cell).toEqual({ row: 3, col: 1 });
    });

    it('should return null for invalid coordinates', () => {
      const cell = hitTester.getCellAtPointOrNull(-10, -10);

      expect(cell).toBeNull();
    });
  });

  describe('isPointInGrid', () => {
    it('should return true for point inside grid', () => {
      expect(hitTester.isPointInGrid(150, 90)).toBe(true);
      expect(hitTester.isPointInGrid(0, 0)).toBe(true);
    });

    it('should return false for point outside grid', () => {
      expect(hitTester.isPointInGrid(-1, 0)).toBe(false);
      expect(hitTester.isPointInGrid(0, -1)).toBe(false);
      expect(hitTester.isPointInGrid(3000, 0)).toBe(false);
      expect(hitTester.isPointInGrid(0, 3000)).toBe(false);
    });
  });

  describe('getCellBounds', () => {
    it('should return correct bounds for cell', () => {
      const bounds = hitTester.getCellBounds(3, 2);

      expect(bounds).toEqual({
        left: 200,
        top: 90,
        width: 100,
        height: 30,
      });
    });

    it('should throw error for out of bounds cell', () => {
      expect(() => hitTester.getCellBounds(-1, 0)).toThrow();
      expect(() => hitTester.getCellBounds(100, 0)).toThrow();
      expect(() => hitTester.getCellBounds(0, 26)).toThrow();
    });
  });

  describe('isPointInCell', () => {
    it('should return true for point inside cell', () => {
      expect(hitTester.isPointInCell(150, 45, 1, 1)).toBe(true);
    });

    it('should return false for point outside cell', () => {
      expect(hitTester.isPointInCell(50, 15, 1, 1)).toBe(false);
    });

    it('should handle edge cases', () => {
      // Point at left edge of cell
      expect(hitTester.isPointInCell(100, 30, 1, 1)).toBe(true);

      // Point just before right edge
      expect(hitTester.isPointInCell(199, 59, 1, 1)).toBe(true);

      // Point at right edge (exclusive)
      expect(hitTester.isPointInCell(200, 30, 1, 1)).toBe(false);
    });
  });

  describe('getRowAtY', () => {
    it('should return correct row for valid Y', () => {
      expect(hitTester.getRowAtY(0)).toBe(0);
      expect(hitTester.getRowAtY(30)).toBe(1);
      expect(hitTester.getRowAtY(45)).toBe(1);
      expect(hitTester.getRowAtY(90)).toBe(3);
    });

    it('should return -1 for Y outside grid', () => {
      expect(hitTester.getRowAtY(-1)).toBe(-1);
      expect(hitTester.getRowAtY(3000)).toBe(-1);
    });
  });

  describe('getColAtX', () => {
    it('should return correct column for valid X', () => {
      expect(hitTester.getColAtX(0)).toBe(0);
      expect(hitTester.getColAtX(100)).toBe(1);
      expect(hitTester.getColAtX(150)).toBe(1);
      expect(hitTester.getColAtX(250)).toBe(2);
    });

    it('should return -1 for X outside grid', () => {
      expect(hitTester.getColAtX(-1)).toBe(-1);
      expect(hitTester.getColAtX(3000)).toBe(-1);
    });
  });

  describe('coordinate conversion', () => {
    it('should convert viewport to grid coordinates', () => {
      const grid = hitTester.viewportToGrid(50, 15, 100, 30);

      expect(grid).toEqual({ x: 150, y: 45 });
    });

    it('should convert grid to viewport coordinates', () => {
      const viewport = hitTester.gridToViewport(150, 45, 100, 30);

      expect(viewport).toEqual({ x: 50, y: 15 });
    });

    it('should round-trip correctly', () => {
      const viewport = { x: 50, y: 15 };
      const scroll = { left: 100, top: 30 };

      const grid = hitTester.viewportToGrid(viewport.x, viewport.y, scroll.left, scroll.top);
      const backToViewport = hitTester.gridToViewport(grid.x, grid.y, scroll.left, scroll.top);

      expect(backToViewport).toEqual(viewport);
    });
  });

  describe('updateDimensions', () => {
    it('should update grid dimensions', () => {
      hitTester.updateDimensions(200, 52);

      const dims = hitTester.getDimensions();
      expect(dims).toEqual({ rowCount: 200, colCount: 52 });
    });

    it('should affect boundary checks after update', () => {
      // Before: 100 rows (30px each = 3000px total), 26 cols (100px each = 2600px total)
      // Point at (2700, 3100) is outside original grid
      expect(hitTester.getCellAtPoint(2700, 3100).hit).toBe(false);

      hitTester.updateDimensions(200, 52);

      // After: 200 rows (30px each = 6000px total), 52 cols (100px each = 5200px total)
      // Point at (2700, 3100) is now valid
      expect(hitTester.getCellAtPoint(2700, 3100).hit).toBe(true);
    });
  });
});

describe('HitTester - Variable Sizes', () => {
  let hitTester: HitTester;

  beforeEach(() => {
    // Variable heights: [20, 30, 40, 50, 20]
    // Offsets: [0, 20, 50, 90, 140, 160]
    const heightProvider = new MockVariableHeightProvider([20, 30, 40, 50, 20]);

    // Uniform width for simplicity
    const widthProvider = new MockUniformWidthProvider(100, 10);

    hitTester = new HitTester(heightProvider, widthProvider, {
      rowCount: 5,
      colCount: 10,
    });
  });

  it('should find correct row with variable heights', () => {
    expect(hitTester.getRowAtY(0)).toBe(0); // Offset 0-19
    expect(hitTester.getRowAtY(10)).toBe(0);
    expect(hitTester.getRowAtY(19)).toBe(0);

    expect(hitTester.getRowAtY(20)).toBe(1); // Offset 20-49
    expect(hitTester.getRowAtY(35)).toBe(1);
    expect(hitTester.getRowAtY(49)).toBe(1);

    expect(hitTester.getRowAtY(50)).toBe(2); // Offset 50-89
    expect(hitTester.getRowAtY(70)).toBe(2);
    expect(hitTester.getRowAtY(89)).toBe(2);

    expect(hitTester.getRowAtY(90)).toBe(3); // Offset 90-139
    expect(hitTester.getRowAtY(139)).toBe(3);

    expect(hitTester.getRowAtY(140)).toBe(4); // Offset 140-159
  });

  it('should get correct cell bounds with variable heights', () => {
    expect(hitTester.getCellBounds(0, 0)).toEqual({
      left: 0,
      top: 0,
      width: 100,
      height: 20,
    });

    expect(hitTester.getCellBounds(1, 0)).toEqual({
      left: 0,
      top: 20,
      width: 100,
      height: 30,
    });

    expect(hitTester.getCellBounds(2, 0)).toEqual({
      left: 0,
      top: 50,
      width: 100,
      height: 40,
    });

    expect(hitTester.getCellBounds(3, 0)).toEqual({
      left: 0,
      top: 90,
      width: 100,
      height: 50,
    });
  });

  it('should find cell at point with variable heights', () => {
    const result1 = hitTester.getCellAtPoint(50, 10);
    expect(result1.cell).toEqual({ row: 0, col: 0 });

    const result2 = hitTester.getCellAtPoint(50, 35);
    expect(result2.cell).toEqual({ row: 1, col: 0 });

    const result3 = hitTester.getCellAtPoint(50, 70);
    expect(result3.cell).toEqual({ row: 2, col: 0 });

    const result4 = hitTester.getCellAtPoint(50, 100);
    expect(result4.cell).toEqual({ row: 3, col: 0 });
  });

  it('should calculate precise offsets correctly with variable heights', () => {
    const result = hitTester.getCellAtPoint(50, 100, { includePreciseOffset: true });

    expect(result.cell).toEqual({ row: 3, col: 0 });
    expect(result.cellHeight).toBe(50);
    expect(result.cellTop).toBe(90);
    expect(result.cellOffsetY).toBe(0.2); // (100-90)/50 = 0.2
  });
});

describe('createHitTester', () => {
  it('should create HitTester instance', () => {
    const heightProvider = new MockUniformHeightProvider(30, 100);
    const widthProvider = new MockUniformWidthProvider(100, 26);

    const hitTester = createHitTester(heightProvider, widthProvider, 100, 26);

    expect(hitTester).toBeInstanceOf(HitTester);

    const result = hitTester.getCellAtPoint(150, 90);
    expect(result.hit).toBe(true);
    expect(result.cell).toEqual({ row: 3, col: 1 });
  });
});
