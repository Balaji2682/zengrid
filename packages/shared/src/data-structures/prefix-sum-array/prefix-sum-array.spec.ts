import { PrefixSumArray } from './prefix-sum-array';

describe('PrefixSumArray', () => {
  describe('Construction', () => {
    it('should create empty array', () => {
      const psa = new PrefixSumArray();
      expect(psa.length).toBe(0);
      expect(psa.total).toBe(0);
    });

    it('should create from values', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30] });
      expect(psa.length).toBe(3);
      expect(psa.total).toBe(60);
    });

    it('should create using static from()', () => {
      const psa = PrefixSumArray.from([5, 10, 15]);
      expect(psa.length).toBe(3);
      expect(psa.total).toBe(30);
    });
  });

  describe('getOffset()', () => {
    it('should return cumulative sum up to index', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30, 40] });

      expect(psa.getOffset(0)).toBe(0); // Sum before index 0
      expect(psa.getOffset(1)).toBe(10); // Sum of [10]
      expect(psa.getOffset(2)).toBe(30); // Sum of [10, 20]
      expect(psa.getOffset(3)).toBe(60); // Sum of [10, 20, 30]
      expect(psa.getOffset(4)).toBe(100); // Sum of all
    });

    it('should throw on invalid index', () => {
      const psa = new PrefixSumArray({ values: [10, 20] });

      expect(() => psa.getOffset(-1)).toThrow(RangeError);
      expect(() => psa.getOffset(3)).toThrow(RangeError);
    });
  });

  describe('getSumUpTo()', () => {
    it('should return cumulative sum including index', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30, 40] });

      expect(psa.getSumUpTo(0)).toBe(10); // Sum including index 0
      expect(psa.getSumUpTo(1)).toBe(30); // Sum of [10, 20]
      expect(psa.getSumUpTo(2)).toBe(60); // Sum of [10, 20, 30]
      expect(psa.getSumUpTo(3)).toBe(100); // Sum of all
    });
  });

  describe('getRangeSum()', () => {
    it('should return sum of range [start, end)', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30, 40, 50] });

      expect(psa.getRangeSum(0, 0)).toBe(0); // Empty range
      expect(psa.getRangeSum(0, 1)).toBe(10); // [10]
      expect(psa.getRangeSum(1, 3)).toBe(50); // [20, 30]
      expect(psa.getRangeSum(0, 5)).toBe(150); // All elements
      expect(psa.getRangeSum(2, 4)).toBe(70); // [30, 40]
    });

    it('should throw on invalid range', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30] });

      expect(() => psa.getRangeSum(-1, 2)).toThrow(RangeError);
      expect(() => psa.getRangeSum(0, 4)).toThrow(RangeError);
      expect(() => psa.getRangeSum(2, 1)).toThrow(RangeError);
    });
  });

  describe('findIndexAtOffset()', () => {
    it('should find index containing offset', () => {
      // Values: [30, 40, 50, 30, 60]
      // Offsets: 0, 30, 70, 120, 150, 210
      const psa = new PrefixSumArray({ values: [30, 40, 50, 30, 60] });

      expect(psa.findIndexAtOffset(0)).toBe(0); // At start
      expect(psa.findIndexAtOffset(15)).toBe(0); // Within first element
      expect(psa.findIndexAtOffset(30)).toBe(1); // Exact boundary
      expect(psa.findIndexAtOffset(50)).toBe(1); // Within second element
      expect(psa.findIndexAtOffset(100)).toBe(2); // Within third element
      expect(psa.findIndexAtOffset(200)).toBe(4); // Within last element
      expect(psa.findIndexAtOffset(300)).toBe(5); // Beyond end
    });

    it('should handle negative offset', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30] });
      expect(psa.findIndexAtOffset(-10)).toBe(0);
    });

    it('should handle offset beyond total', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30] });
      expect(psa.findIndexAtOffset(1000)).toBe(3);
    });
  });

  describe('update()', () => {
    it('should update value and recalculate sums', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30, 40] });

      psa.update(1, 25); // Change 20 to 25

      expect(psa.getValue(1)).toBe(25);
      expect(psa.getOffset(2)).toBe(35); // 10 + 25
      expect(psa.getOffset(3)).toBe(65); // 10 + 25 + 30
      expect(psa.total).toBe(105); // 10 + 25 + 30 + 40
    });

    it('should handle decreasing value', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30] });

      psa.update(1, 15); // Decrease from 20 to 15

      expect(psa.total).toBe(55); // 10 + 15 + 30
    });

    it('should throw on invalid index', () => {
      const psa = new PrefixSumArray({ values: [10, 20] });

      expect(() => psa.update(-1, 15)).toThrow(RangeError);
      expect(() => psa.update(2, 15)).toThrow(RangeError);
    });

    it('should throw on negative value', () => {
      const psa = new PrefixSumArray({ values: [10, 20] });

      expect(() => psa.update(0, -5)).toThrow(RangeError);
    });
  });

  describe('getValue()', () => {
    it('should return original value at index', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30] });

      expect(psa.getValue(0)).toBe(10);
      expect(psa.getValue(1)).toBe(20);
      expect(psa.getValue(2)).toBe(30);
    });

    it('should throw on invalid index', () => {
      const psa = new PrefixSumArray({ values: [10] });

      expect(() => psa.getValue(-1)).toThrow(RangeError);
      expect(() => psa.getValue(1)).toThrow(RangeError);
    });
  });

  describe('push() and pop()', () => {
    it('should push new value', () => {
      const psa = new PrefixSumArray({ values: [10, 20] });

      psa.push(30);

      expect(psa.length).toBe(3);
      expect(psa.getValue(2)).toBe(30);
      expect(psa.total).toBe(60);
    });

    it('should pop last value', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30] });

      const popped = psa.pop();

      expect(popped).toBe(30);
      expect(psa.length).toBe(2);
      expect(psa.total).toBe(30);
    });

    it('should return undefined when popping empty array', () => {
      const psa = new PrefixSumArray();
      expect(psa.pop()).toBeUndefined();
    });

    it('should throw when pushing negative value', () => {
      const psa = new PrefixSumArray();
      expect(() => psa.push(-5)).toThrow(RangeError);
    });
  });

  describe('clear()', () => {
    it('should clear all values', () => {
      const psa = new PrefixSumArray({ values: [10, 20, 30] });

      psa.clear();

      expect(psa.length).toBe(0);
      expect(psa.total).toBe(0);
    });
  });

  describe('Use Case: Variable Row Heights', () => {
    it('should calculate scroll positions for variable heights', () => {
      // Simulate grid with variable row heights
      const rowHeights = [30, 40, 50, 35, 45, 30, 60];
      const psa = PrefixSumArray.from(rowHeights);

      // Total grid height
      expect(psa.total).toBe(290);

      // Find Y position where row 3 starts
      expect(psa.getOffset(3)).toBe(120); // 30 + 40 + 50

      // Find which row is visible at scroll position 100
      const rowIndex = psa.findIndexAtOffset(100);
      expect(rowIndex).toBe(2); // Row 2 (starts at 70, height 50)

      // Update row 2 height from 50 to 60
      psa.update(2, 60);
      expect(psa.total).toBe(300);
      expect(psa.getOffset(3)).toBe(130); // Adjusted offset
    });

    it('should handle dynamic row insertion', () => {
      const psa = PrefixSumArray.from([30, 30, 30]);

      // Insert taller row by updating
      psa.push(100); // Add new row

      expect(psa.length).toBe(4);
      expect(psa.total).toBe(190);

      // Find row at bottom of viewport (150px down)
      const rowAtBottom = psa.findIndexAtOffset(150);
      expect(rowAtBottom).toBe(3); // The new tall row
    });
  });

  describe('Edge Cases', () => {
    it('should handle single element', () => {
      const psa = new PrefixSumArray({ values: [42] });

      expect(psa.getOffset(0)).toBe(0);
      expect(psa.getOffset(1)).toBe(42);
      expect(psa.findIndexAtOffset(20)).toBe(0);
    });

    it('should handle all zeros', () => {
      const psa = new PrefixSumArray({ values: [0, 0, 0] });

      expect(psa.total).toBe(0);
      expect(psa.findIndexAtOffset(0)).toBe(0);
    });

    it('should handle large values', () => {
      const psa = new PrefixSumArray({ values: [1e6, 2e6, 3e6] });

      expect(psa.total).toBe(6e6);
      expect(psa.findIndexAtOffset(3.5e6)).toBe(2);
    });
  });
});
