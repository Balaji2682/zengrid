import { SegmentTree } from './segment-tree';
import { AggregationType } from './segment-tree.interface';

describe('SegmentTree', () => {
  describe('Construction', () => {
    it('should create empty tree', () => {
      const tree = new SegmentTree<number>({
        values: [],
        type: AggregationType.SUM,
      });
      expect(tree.size).toBe(0);
      expect(tree.total).toBe(0);
    });

    it('should create from values with SUM', () => {
      const tree = new SegmentTree({
        values: [1, 3, 5, 7, 9],
        type: AggregationType.SUM,
      });
      expect(tree.size).toBe(5);
      expect(tree.total).toBe(25);
    });

    it('should create from values with MIN', () => {
      const tree = new SegmentTree({
        values: [5, 2, 8, 1, 9],
        type: AggregationType.MIN,
      });
      expect(tree.size).toBe(5);
      expect(tree.total).toBe(1);
    });

    it('should create from values with MAX', () => {
      const tree = new SegmentTree({
        values: [5, 2, 8, 1, 9],
        type: AggregationType.MAX,
      });
      expect(tree.size).toBe(5);
      expect(tree.total).toBe(9);
    });

    it('should create using static from()', () => {
      const tree = SegmentTree.from([1, 2, 3, 4, 5], AggregationType.SUM);
      expect(tree.size).toBe(5);
      expect(tree.total).toBe(15);
    });

    it('should create custom tree', () => {
      const tree = SegmentTree.custom(
        [1, 2, 3, 4],
        (a, b) => a + b,
        0
      );
      expect(tree.size).toBe(4);
      expect(tree.total).toBe(10);
    });

    it('should throw error for CUSTOM without aggregate function', () => {
      expect(() => {
        new SegmentTree({
          values: [1, 2, 3],
          type: AggregationType.CUSTOM,
        });
      }).toThrow();
    });
  });

  describe('SUM queries', () => {
    let tree: SegmentTree<number>;

    beforeEach(() => {
      tree = new SegmentTree({
        values: [1, 3, 5, 7, 9, 11],
        type: AggregationType.SUM,
      });
    });

    it('should query full range', () => {
      expect(tree.query(0, 5)).toBe(36);
    });

    it('should query partial range', () => {
      expect(tree.query(1, 3)).toBe(15); // 3 + 5 + 7
      expect(tree.query(2, 4)).toBe(21); // 5 + 7 + 9
    });

    it('should query single element', () => {
      expect(tree.query(0, 0)).toBe(1);
      expect(tree.query(3, 3)).toBe(7);
    });

    it('should query after update', () => {
      tree.update(1, 10);
      expect(tree.query(0, 2)).toBe(16); // 1 + 10 + 5
      expect(tree.query(1, 3)).toBe(22); // 10 + 5 + 7
    });

    it('should throw on invalid range', () => {
      expect(() => tree.query(-1, 2)).toThrow(RangeError);
      expect(() => tree.query(0, 10)).toThrow(RangeError);
      expect(() => tree.query(3, 2)).toThrow(RangeError);
    });
  });

  describe('MIN queries', () => {
    let tree: SegmentTree<number>;

    beforeEach(() => {
      tree = new SegmentTree({
        values: [5, 2, 8, 1, 9, 3],
        type: AggregationType.MIN,
      });
    });

    it('should query full range', () => {
      expect(tree.query(0, 5)).toBe(1);
    });

    it('should query partial range', () => {
      expect(tree.query(0, 2)).toBe(2); // min(5, 2, 8)
      expect(tree.query(2, 5)).toBe(1); // min(8, 1, 9, 3)
    });

    it('should query single element', () => {
      expect(tree.query(2, 2)).toBe(8);
    });

    it('should query after update', () => {
      tree.update(3, 10); // Change 1 to 10
      expect(tree.query(0, 5)).toBe(2); // min is now 2
      expect(tree.query(3, 5)).toBe(3); // min(10, 9, 3)
    });
  });

  describe('MAX queries', () => {
    let tree: SegmentTree<number>;

    beforeEach(() => {
      tree = new SegmentTree({
        values: [5, 2, 8, 1, 9, 3],
        type: AggregationType.MAX,
      });
    });

    it('should query full range', () => {
      expect(tree.query(0, 5)).toBe(9);
    });

    it('should query partial range', () => {
      expect(tree.query(0, 2)).toBe(8); // max(5, 2, 8)
      expect(tree.query(3, 5)).toBe(9); // max(1, 9, 3)
    });

    it('should query after update', () => {
      tree.update(4, 15); // Change 9 to 15
      expect(tree.query(0, 5)).toBe(15);
      expect(tree.query(0, 3)).toBe(8);
    });
  });

  describe('Update operations', () => {
    let tree: SegmentTree<number>;

    beforeEach(() => {
      tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
      });
    });

    it('should update single element', () => {
      tree.update(2, 10);
      expect(tree.get(2)).toBe(10);
      expect(tree.total).toBe(22); // 1 + 2 + 10 + 4 + 5
    });

    it('should update multiple elements', () => {
      tree.update(0, 10);
      tree.update(4, 10);
      expect(tree.total).toBe(29); // 10 + 2 + 3 + 4 + 10
    });

    it('should update first element', () => {
      tree.update(0, 100);
      expect(tree.get(0)).toBe(100);
      expect(tree.query(0, 2)).toBe(105);
    });

    it('should update last element', () => {
      tree.update(4, 100);
      expect(tree.get(4)).toBe(100);
      expect(tree.query(2, 4)).toBe(107);
    });

    it('should throw on invalid index', () => {
      expect(() => tree.update(-1, 10)).toThrow(RangeError);
      expect(() => tree.update(5, 10)).toThrow(RangeError);
    });
  });

  describe('Range update operations', () => {
    let tree: SegmentTree<number>;

    beforeEach(() => {
      tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
        lazy: true,
      });
    });

    it('should update range with lazy propagation', () => {
      tree.rangeUpdate(1, 3, 10);
      // Range update adds the value to each element in the range
      // Original: [1, 2, 3, 4, 5]
      // After rangeUpdate(1, 3, 10): [1, 12, 13, 14, 5]
      expect(tree.query(0, 4)).toBe(45); // 1 + 12 + 13 + 14 + 5
    });

    it('should handle overlapping range updates', () => {
      tree.rangeUpdate(0, 2, 5);
      tree.rangeUpdate(2, 4, 3);
      // After first update: [6, 7, 8, 4, 5]
      // After second update: [6, 7, 11, 7, 8]
      expect(tree.query(0, 4)).toBe(39);
    });

    it('should throw on invalid range', () => {
      expect(() => tree.rangeUpdate(-1, 2, 10)).toThrow(RangeError);
      expect(() => tree.rangeUpdate(0, 10, 10)).toThrow(RangeError);
    });
  });

  describe('get() operation', () => {
    let tree: SegmentTree<number>;

    beforeEach(() => {
      tree = new SegmentTree({
        values: [10, 20, 30, 40, 50],
        type: AggregationType.SUM,
      });
    });

    it('should get value at index', () => {
      expect(tree.get(0)).toBe(10);
      expect(tree.get(2)).toBe(30);
      expect(tree.get(4)).toBe(50);
    });

    it('should get updated value', () => {
      tree.update(2, 100);
      expect(tree.get(2)).toBe(100);
    });

    it('should throw on invalid index', () => {
      expect(() => tree.get(-1)).toThrow(RangeError);
      expect(() => tree.get(5)).toThrow(RangeError);
    });
  });

  describe('build() operation', () => {
    it('should rebuild tree with new array', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3],
        type: AggregationType.SUM,
      });

      expect(tree.total).toBe(6);

      tree.build([10, 20, 30, 40]);
      expect(tree.size).toBe(4);
      expect(tree.total).toBe(100);
      expect(tree.query(0, 3)).toBe(100);
    });

    it('should rebuild with smaller array', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
      });

      tree.build([10, 20]);
      expect(tree.size).toBe(2);
      expect(tree.total).toBe(30);
    });

    it('should rebuild with larger array', () => {
      const tree = new SegmentTree({
        values: [1, 2],
        type: AggregationType.SUM,
      });

      tree.build([10, 20, 30, 40, 50]);
      expect(tree.size).toBe(5);
      expect(tree.total).toBe(150);
    });
  });

  describe('toArray() operation', () => {
    it('should convert tree to array', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
      });

      expect(tree.toArray()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should reflect updates in array', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
      });

      tree.update(1, 10);
      tree.update(3, 20);

      expect(tree.toArray()).toEqual([1, 10, 3, 20, 5]);
    });
  });

  describe('findFirst() operation', () => {
    it('should find first index where sum exceeds threshold', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
      });

      const index = tree.findFirst(0, (sum) => sum >= 6);
      expect(index).toBe(2); // Sum(1,2,3) = 6
    });

    it('should return -1 if not found', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3],
        type: AggregationType.SUM,
      });

      const index = tree.findFirst(0, (sum) => sum > 100);
      expect(index).toBe(-1);
    });
  });

  describe('GCD queries', () => {
    it('should compute GCD over range', () => {
      const tree = new SegmentTree({
        values: [12, 18, 24, 30],
        type: AggregationType.GCD,
      });

      expect(tree.query(0, 3)).toBe(6); // GCD(12, 18, 24, 30) = 6
      expect(tree.query(0, 1)).toBe(6); // GCD(12, 18) = 6
      expect(tree.query(1, 2)).toBe(6); // GCD(18, 24) = 6
    });
  });

  describe('LCM queries', () => {
    it('should compute LCM over range', () => {
      const tree = new SegmentTree({
        values: [4, 6, 12],
        type: AggregationType.LCM,
      });

      expect(tree.query(0, 1)).toBe(12); // LCM(4, 6) = 12
      expect(tree.query(0, 2)).toBe(12); // LCM(4, 6, 12) = 12
    });
  });

  describe('PRODUCT queries', () => {
    it('should compute product over range', () => {
      const tree = new SegmentTree({
        values: [2, 3, 4, 5],
        type: AggregationType.PRODUCT,
      });

      expect(tree.query(0, 3)).toBe(120); // 2 * 3 * 4 * 5
      expect(tree.query(1, 2)).toBe(12); // 3 * 4
    });
  });

  describe('Edge Cases', () => {
    it('should handle single element array', () => {
      const tree = new SegmentTree({
        values: [42],
        type: AggregationType.SUM,
      });

      expect(tree.size).toBe(1);
      expect(tree.total).toBe(42);
      expect(tree.query(0, 0)).toBe(42);
      expect(tree.get(0)).toBe(42);
    });

    it('should handle array with zeros', () => {
      const tree = new SegmentTree({
        values: [0, 0, 0, 5, 0],
        type: AggregationType.SUM,
      });

      expect(tree.total).toBe(5);
      expect(tree.query(0, 2)).toBe(0);
      expect(tree.query(3, 3)).toBe(5);
    });

    it('should handle all same values', () => {
      const tree = new SegmentTree({
        values: [7, 7, 7, 7],
        type: AggregationType.SUM,
      });

      expect(tree.total).toBe(28);
      expect(tree.query(1, 2)).toBe(14);
    });

    it('should handle negative numbers in SUM', () => {
      const tree = new SegmentTree({
        values: [-5, 10, -3, 8],
        type: AggregationType.SUM,
      });

      expect(tree.total).toBe(10);
      expect(tree.query(0, 1)).toBe(5);
      expect(tree.query(2, 3)).toBe(5);
    });

    it('should handle large values', () => {
      const tree = new SegmentTree({
        values: [1e6, 2e6, 3e6],
        type: AggregationType.SUM,
      });

      expect(tree.total).toBe(6e6);
      expect(tree.query(0, 1)).toBe(3e6);
    });

    it('should handle power of 2 array size', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5, 6, 7, 8],
        type: AggregationType.SUM,
      });

      expect(tree.total).toBe(36);
      expect(tree.query(0, 3)).toBe(10);
      expect(tree.query(4, 7)).toBe(26);
    });

    it('should handle non-power of 2 array size', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5, 6, 7],
        type: AggregationType.SUM,
      });

      expect(tree.total).toBe(28);
      expect(tree.query(0, 3)).toBe(10);
      expect(tree.query(4, 6)).toBe(18);
    });
  });

  describe('Use Case: Status bar aggregations', () => {
    it('should calculate sum of selected cells', () => {
      // Simulate grid cell values
      const cellValues = [100, 200, 150, 300, 250, 175, 225];
      const tree = new SegmentTree({
        values: cellValues,
        type: AggregationType.SUM,
      });

      // User selects cells 1-4
      const selectedSum = tree.query(1, 4);
      expect(selectedSum).toBe(900); // 200 + 150 + 300 + 250
    });

    it('should calculate min/max of selected range', () => {
      const values = [45, 23, 67, 12, 89, 34];
      const minTree = new SegmentTree({
        values,
        type: AggregationType.MIN,
      });
      const maxTree = new SegmentTree({
        values,
        type: AggregationType.MAX,
      });

      // Selected range: cells 1-4
      expect(minTree.query(1, 4)).toBe(12);
      expect(maxTree.query(1, 4)).toBe(89);
    });

    it('should handle dynamic cell updates', () => {
      const tree = new SegmentTree({
        values: [10, 20, 30, 40, 50],
        type: AggregationType.SUM,
      });

      // Initial selection sum
      expect(tree.query(0, 4)).toBe(150);

      // User edits cell 2
      tree.update(2, 100);
      expect(tree.query(0, 4)).toBe(220); // Updated sum
    });

    it('should calculate average via sum', () => {
      const values = [10, 20, 30, 40, 50];
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const rangeSum = tree.query(1, 3);
      const rangeSize = 3; // indices 1, 2, 3
      const average = rangeSum / rangeSize;
      expect(average).toBe(30); // (20 + 30 + 40) / 3
    });
  });

  describe('Validation', () => {
    it('should validate tree structure for SUM', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
      });

      expect(tree.validate()).toBe(true);
    });

    it('should validate tree after updates', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
      });

      tree.update(2, 10);
      tree.update(4, 20);

      expect(tree.validate()).toBe(true);
    });

    it('should validate tree for MIN', () => {
      const tree = new SegmentTree({
        values: [5, 2, 8, 1, 9],
        type: AggregationType.MIN,
      });

      expect(tree.validate()).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should return string representation', () => {
      const tree = new SegmentTree({
        values: [1, 2, 3, 4, 5],
        type: AggregationType.SUM,
      });

      const str = tree.toString();
      expect(str).toContain('SegmentTree');
      expect(str).toContain('size: 5');
      expect(str).toContain('sum');
      expect(str).toContain('total: 15');
    });
  });

  describe('Performance characteristics', () => {
    it('should handle large arrays efficiently', () => {
      const size = 10000;
      const values = Array.from({ length: size }, (_, i) => i + 1);
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      expect(tree.size).toBe(size);

      // Test query
      const sum = tree.query(0, 999);
      expect(sum).toBe((1000 * 1001) / 2); // Sum formula: n(n+1)/2

      // Test update
      tree.update(500, 10000);
      expect(tree.get(500)).toBe(10000);
    });

    it('should handle many updates efficiently', () => {
      const tree = new SegmentTree({
        values: Array(100).fill(1),
        type: AggregationType.SUM,
      });

      // Perform many updates
      for (let i = 0; i < 100; i++) {
        tree.update(i, i * 2);
      }

      expect(tree.total).toBe(9900); // Sum of 0, 2, 4, ..., 198
    });
  });
});
