import { SingleColumnSorter } from './single-column-sorter';
import type { DataAccessor } from '../../data/data-accessor';

/**
 * Mock DataAccessor for testing
 */
class MockDataAccessor implements DataAccessor {
  constructor(private data: any[][]) {}

  getValue(row: number, col: number | string): any {
    const colIndex = typeof col === 'string' ? parseInt(col, 10) : col;
    return this.data[row]?.[colIndex];
  }

  getRow(row: number): Iterable<[number | string, any]> {
    const rowData = this.data[row] || [];
    return rowData.map((value, col) => [col, value] as [number, any]);
  }

  getColumn(col: number | string): Iterable<[number, any]> {
    const colIndex = typeof col === 'string' ? parseInt(col, 10) : col;
    return this.data.map((row, rowIndex) => [rowIndex, row[colIndex]] as [number, any]);
  }

  get rowCount(): number {
    return this.data.length;
  }

  get colCount(): number {
    return this.data[0]?.length || 0;
  }

  getColumnIds(): ReadonlyArray<number | string> {
    return Array.from({ length: this.colCount }, (_, i) => i);
  }
}

describe('SingleColumnSorter', () => {
  let sorter: SingleColumnSorter;

  beforeEach(() => {
    sorter = new SingleColumnSorter();
  });

  describe('Numeric sorting', () => {
    it('should sort numbers in ascending order', () => {
      const data = [[5], [2], [8], [1], [3]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(5);
      expect(indexMap.toDataIndex(0)).toBe(3); // 1
      expect(indexMap.toDataIndex(1)).toBe(1); // 2
      expect(indexMap.toDataIndex(2)).toBe(4); // 3
      expect(indexMap.toDataIndex(3)).toBe(0); // 5
      expect(indexMap.toDataIndex(4)).toBe(2); // 8
    });

    it('should sort numbers in descending order', () => {
      const data = [[5], [2], [8], [1], [3]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'desc' });

      expect(indexMap.toDataIndex(0)).toBe(2); // 8
      expect(indexMap.toDataIndex(1)).toBe(0); // 5
      expect(indexMap.toDataIndex(2)).toBe(4); // 3
      expect(indexMap.toDataIndex(3)).toBe(1); // 2
      expect(indexMap.toDataIndex(4)).toBe(3); // 1
    });

    it('should handle negative numbers', () => {
      const data = [[5], [-2], [8], [-10], [0]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.toDataIndex(0)).toBe(3); // -10
      expect(indexMap.toDataIndex(1)).toBe(1); // -2
      expect(indexMap.toDataIndex(2)).toBe(4); // 0
      expect(indexMap.toDataIndex(3)).toBe(0); // 5
      expect(indexMap.toDataIndex(4)).toBe(2); // 8
    });

    it('should handle decimal numbers', () => {
      const data = [[5.5], [2.1], [8.9], [2.11], [3.0]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.toDataIndex(0)).toBe(1); // 2.1
      expect(indexMap.toDataIndex(1)).toBe(3); // 2.11
      expect(indexMap.toDataIndex(2)).toBe(4); // 3.0
      expect(indexMap.toDataIndex(3)).toBe(0); // 5.5
      expect(indexMap.toDataIndex(4)).toBe(2); // 8.9
    });

    it('should handle NaN values', () => {
      const data = [[5], [NaN], [2], [NaN], [1]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      // NaN values should be pushed to the end
      expect(indexMap.toDataIndex(0)).toBe(4); // 1
      expect(indexMap.toDataIndex(1)).toBe(2); // 2
      expect(indexMap.toDataIndex(2)).toBe(0); // 5
      expect(indexMap.toDataIndex(3)).toBe(1); // NaN
      expect(indexMap.toDataIndex(4)).toBe(3); // NaN
    });
  });

  describe('String sorting', () => {
    it('should sort strings in ascending order (case-sensitive)', () => {
      const data = [['Charlie'], ['Alice'], ['Bob'], ['alice']];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, {
        direction: 'asc',
        caseSensitive: true,
      });

      // Get the sorted values
      const values = [
        accessor.getValue(indexMap.toDataIndex(0), 0),
        accessor.getValue(indexMap.toDataIndex(1), 0),
        accessor.getValue(indexMap.toDataIndex(2), 0),
        accessor.getValue(indexMap.toDataIndex(3), 0),
      ];

      // Verify they're sorted (localeCompare puts lowercase before uppercase)
      expect(values).toEqual(['alice', 'Alice', 'Bob', 'Charlie']);
    });

    it('should sort strings in ascending order (case-insensitive)', () => {
      const data = [['Charlie'], ['Alice'], ['Bob'], ['alice']];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, {
        direction: 'asc',
        caseSensitive: false,
      });

      const values = [
        accessor.getValue(indexMap.toDataIndex(0), 0),
        accessor.getValue(indexMap.toDataIndex(1), 0),
        accessor.getValue(indexMap.toDataIndex(2), 0),
        accessor.getValue(indexMap.toDataIndex(3), 0),
      ];

      // Either Alice or alice can be first (stable sort preserves order)
      expect(values[0].toLowerCase()).toBe('alice');
      expect(values[1].toLowerCase()).toBe('alice');
      expect(values[2]).toBe('Bob');
      expect(values[3]).toBe('Charlie');
    });

    it('should sort strings in descending order', () => {
      const data = [['Charlie'], ['Alice'], ['Bob']];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'desc' });

      expect(indexMap.toDataIndex(0)).toBe(0); // Charlie
      expect(indexMap.toDataIndex(1)).toBe(2); // Bob
      expect(indexMap.toDataIndex(2)).toBe(1); // Alice
    });
  });

  describe('Null and undefined handling', () => {
    it('should place nulls last by default (ascending)', () => {
      const data = [[5], [null], [2], [undefined], [1]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, {
        direction: 'asc',
        nullPosition: 'last',
      });

      expect(indexMap.toDataIndex(0)).toBe(4); // 1
      expect(indexMap.toDataIndex(1)).toBe(2); // 2
      expect(indexMap.toDataIndex(2)).toBe(0); // 5
      expect(indexMap.toDataIndex(3)).toBe(1); // null
      expect(indexMap.toDataIndex(4)).toBe(3); // undefined
    });

    it('should place nulls first when specified (ascending)', () => {
      const data = [[5], [null], [2], [undefined], [1]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, {
        direction: 'asc',
        nullPosition: 'first',
      });

      expect(indexMap.toDataIndex(0)).toBe(1); // null
      expect(indexMap.toDataIndex(1)).toBe(3); // undefined
      expect(indexMap.toDataIndex(2)).toBe(4); // 1
      expect(indexMap.toDataIndex(3)).toBe(2); // 2
      expect(indexMap.toDataIndex(4)).toBe(0); // 5
    });

    it('should treat nulls naturally when specified (ascending)', () => {
      const data = [[5], [null], [2], [undefined], [1]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, {
        direction: 'asc',
        nullPosition: 'natural',
      });

      expect(indexMap.toDataIndex(0)).toBe(1); // null (smallest)
      expect(indexMap.toDataIndex(1)).toBe(3); // undefined (smallest)
      expect(indexMap.toDataIndex(2)).toBe(4); // 1
      expect(indexMap.toDataIndex(3)).toBe(2); // 2
      expect(indexMap.toDataIndex(4)).toBe(0); // 5
    });

    it('should treat nulls naturally when specified (descending)', () => {
      const data = [[5], [null], [2], [undefined], [1]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, {
        direction: 'desc',
        nullPosition: 'natural',
      });

      expect(indexMap.toDataIndex(0)).toBe(0); // 5
      expect(indexMap.toDataIndex(1)).toBe(2); // 2
      expect(indexMap.toDataIndex(2)).toBe(4); // 1
      expect(indexMap.toDataIndex(3)).toBe(1); // null (treated as smallest, so last in desc)
      expect(indexMap.toDataIndex(4)).toBe(3); // undefined
    });
  });

  describe('Boolean sorting', () => {
    it('should sort booleans (false < true)', () => {
      const data = [[true], [false], [true], [false]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(accessor.getValue(indexMap.toDataIndex(0), 0)).toBe(false);
      expect(accessor.getValue(indexMap.toDataIndex(1), 0)).toBe(false);
      expect(accessor.getValue(indexMap.toDataIndex(2), 0)).toBe(true);
      expect(accessor.getValue(indexMap.toDataIndex(3), 0)).toBe(true);
    });
  });

  describe('Date sorting', () => {
    it('should sort dates in ascending order', () => {
      const data = [
        [new Date('2023-01-15')],
        [new Date('2023-01-10')],
        [new Date('2023-01-20')],
      ];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.toDataIndex(0)).toBe(1); // 2023-01-10
      expect(indexMap.toDataIndex(1)).toBe(0); // 2023-01-15
      expect(indexMap.toDataIndex(2)).toBe(2); // 2023-01-20
    });

    it('should sort dates in descending order', () => {
      const data = [
        [new Date('2023-01-15')],
        [new Date('2023-01-10')],
        [new Date('2023-01-20')],
      ];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'desc' });

      expect(indexMap.toDataIndex(0)).toBe(2); // 2023-01-20
      expect(indexMap.toDataIndex(1)).toBe(0); // 2023-01-15
      expect(indexMap.toDataIndex(2)).toBe(1); // 2023-01-10
    });
  });

  describe('Mixed type sorting', () => {
    it('should handle mixed types by converting to strings', () => {
      const data = [[5], ['hello'], [3], ['world'], [1]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      // When types are mixed, they're compared as strings
      const values = [
        accessor.getValue(indexMap.toDataIndex(0), 0),
        accessor.getValue(indexMap.toDataIndex(1), 0),
        accessor.getValue(indexMap.toDataIndex(2), 0),
        accessor.getValue(indexMap.toDataIndex(3), 0),
        accessor.getValue(indexMap.toDataIndex(4), 0),
      ];

      // Should be sorted lexicographically: "1", "3", "5", "hello", "world"
      expect(values).toEqual([1, 3, 5, 'hello', 'world']);
    });
  });

  describe('Identity map (no sorting)', () => {
    it('should return identity map when direction is null', () => {
      const data = [[5], [2], [8], [1], [3]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: null });

      expect(indexMap.length).toBe(5);
      expect(indexMap.toDataIndex(0)).toBe(0);
      expect(indexMap.toDataIndex(1)).toBe(1);
      expect(indexMap.toDataIndex(2)).toBe(2);
      expect(indexMap.toDataIndex(3)).toBe(3);
      expect(indexMap.toDataIndex(4)).toBe(4);
    });
  });

  describe('Stability', () => {
    it('should maintain relative order for equal values', () => {
      const data = [
        [1, 'A'],
        [2, 'B'],
        [1, 'C'],
        [2, 'D'],
        [1, 'E'],
      ];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      // All rows with value 1 should maintain their relative order (A, C, E)
      const firstThree = [
        accessor.getValue(indexMap.toDataIndex(0), 1),
        accessor.getValue(indexMap.toDataIndex(1), 1),
        accessor.getValue(indexMap.toDataIndex(2), 1),
      ];

      expect(firstThree).toEqual(['A', 'C', 'E']);

      // All rows with value 2 should maintain their relative order (B, D)
      const lastTwo = [
        accessor.getValue(indexMap.toDataIndex(3), 1),
        accessor.getValue(indexMap.toDataIndex(4), 1),
      ];

      expect(lastTwo).toEqual(['B', 'D']);
    });
  });

  describe('Empty and edge cases', () => {
    it('should handle empty data', () => {
      const data: any[][] = [];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(0);
    });

    it('should handle single row', () => {
      const data = [[42]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(1);
      expect(indexMap.toDataIndex(0)).toBe(0);
    });
  });

  describe('IndexMap bidirectional mapping', () => {
    it('should support toDataIndex and toVisualIndex', () => {
      const data = [[5], [2], [8], [1]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      // Visual row 0 (smallest value) should be data row 3 (value 1)
      expect(indexMap.toDataIndex(0)).toBe(3);
      expect(indexMap.toVisualIndex(3)).toBe(0);

      // Visual row 1 should be data row 1 (value 2)
      expect(indexMap.toDataIndex(1)).toBe(1);
      expect(indexMap.toVisualIndex(1)).toBe(1);

      // Visual row 2 should be data row 0 (value 5)
      expect(indexMap.toDataIndex(2)).toBe(0);
      expect(indexMap.toVisualIndex(0)).toBe(2);

      // Visual row 3 (largest value) should be data row 2 (value 8)
      expect(indexMap.toDataIndex(3)).toBe(2);
      expect(indexMap.toVisualIndex(2)).toBe(3);
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle empty strings vs null', () => {
      const data = [[''], ['hello'], [null], [undefined], ['world']];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, {
        direction: 'asc',
        nullPosition: 'last',
      });

      const values = [
        accessor.getValue(indexMap.toDataIndex(0), 0),
        accessor.getValue(indexMap.toDataIndex(1), 0),
        accessor.getValue(indexMap.toDataIndex(2), 0),
        accessor.getValue(indexMap.toDataIndex(3), 0),
        accessor.getValue(indexMap.toDataIndex(4), 0),
      ];

      // Empty string should sort before other strings, nulls should be last
      expect(values[0]).toBe('');
      expect(values[1]).toBe('hello');
      expect(values[2]).toBe('world');
      expect(values[3]).toBe(null);
      expect(values[4]).toBe(undefined);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const data = [['short'], [longString], ['medium text'], ['']];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(4);
      // Should not crash with long strings
      expect(accessor.getValue(indexMap.toDataIndex(0), 0)).toBe('');
    });

    it('should handle special characters in strings', () => {
      const data = [
        ['hello'],
        ['héllo'],
        ['hello!'],
        ['@hello'],
        ['#hello'],
        ['hello123'],
      ];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(6);
      // All values should be sorted (localeCompare handles special chars)
      const sorted = Array.from({ length: 6 }, (_, i) =>
        accessor.getValue(indexMap.toDataIndex(i), 0)
      );
      expect(sorted).toBeDefined();
    });

    it('should handle Infinity and -Infinity', () => {
      const data = [[5], [Infinity], [-Infinity], [0], [100]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(accessor.getValue(indexMap.toDataIndex(0), 0)).toBe(-Infinity);
      expect(accessor.getValue(indexMap.toDataIndex(4), 0)).toBe(Infinity);
    });

    it('should handle very large numbers', () => {
      const data = [
        [Number.MAX_SAFE_INTEGER],
        [Number.MAX_SAFE_INTEGER + 1],
        [Number.MIN_SAFE_INTEGER],
        [0],
      ];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(accessor.getValue(indexMap.toDataIndex(0), 0)).toBe(Number.MIN_SAFE_INTEGER);
      expect(accessor.getValue(indexMap.toDataIndex(3), 0)).toBeGreaterThanOrEqual(
        Number.MAX_SAFE_INTEGER
      );
    });

    it('should handle all same values (no swaps needed)', () => {
      const data = Array.from({ length: 100 }, () => [42]);
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(100);
      // All values are same, stable sort should preserve original order
      for (let i = 0; i < 100; i++) {
        expect(accessor.getValue(indexMap.toDataIndex(i), 0)).toBe(42);
      }
    });

    it('should handle mixed null positioning in descending order', () => {
      const data = [[5], [null], [2], [undefined], [8]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, {
        direction: 'desc',
        nullPosition: 'first',
      });

      const values = [
        accessor.getValue(indexMap.toDataIndex(0), 0),
        accessor.getValue(indexMap.toDataIndex(1), 0),
        accessor.getValue(indexMap.toDataIndex(2), 0),
        accessor.getValue(indexMap.toDataIndex(3), 0),
        accessor.getValue(indexMap.toDataIndex(4), 0),
      ];

      // Nulls first, then descending numbers
      expect(values[0]).toBe(null);
      expect(values[1]).toBe(undefined);
      expect(values[2]).toBe(8);
      expect(values[3]).toBe(5);
      expect(values[4]).toBe(2);
    });

    it('should handle column with only nulls', () => {
      const data = [[null], [undefined], [null], [null], [undefined]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(5);
      // All nulls, should maintain stable order
      for (let i = 0; i < 5; i++) {
        const value = accessor.getValue(indexMap.toDataIndex(i), 0);
        expect(value === null || value === undefined).toBe(true);
      }
    });

    it('should handle scientific notation numbers', () => {
      const data = [[1e10], [1e-10], [1e5], [1e-5], [0]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      const values = [
        accessor.getValue(indexMap.toDataIndex(0), 0),
        accessor.getValue(indexMap.toDataIndex(1), 0),
        accessor.getValue(indexMap.toDataIndex(2), 0),
        accessor.getValue(indexMap.toDataIndex(3), 0),
        accessor.getValue(indexMap.toDataIndex(4), 0),
      ];

      // Check order is correct (ascending)
      expect(values[0]).toBeLessThanOrEqual(values[1]);
      expect(values[1]).toBeLessThanOrEqual(values[2]);
      expect(values[2]).toBeLessThanOrEqual(values[3]);
      expect(values[3]).toBeLessThanOrEqual(values[4]);
      expect(values[4]).toBe(1e10); // Largest should be at end
    });

    it('should handle unicode strings', () => {
      const data = [['中文'], ['日本語'], ['한국어'], ['English'], ['Русский']];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(5);
      // localeCompare should handle unicode properly
      const sorted = Array.from({ length: 5 }, (_, i) =>
        accessor.getValue(indexMap.toDataIndex(i), 0)
      );
      expect(sorted).toBeDefined();
    });

    it('should handle whitespace-only strings', () => {
      const data = [['   '], [''], ['\t'], ['\n'], ['a']];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(5);
      const sorted = Array.from({ length: 5 }, (_, i) =>
        accessor.getValue(indexMap.toDataIndex(i), 0)
      );
      expect(sorted).toBeDefined();
    });

    it('should handle number strings vs numbers', () => {
      const data = [[100], ['50'], [25], ['200'], [10]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      // Mixed types should be compared as strings
      const sorted = Array.from({ length: 5 }, (_, i) =>
        accessor.getValue(indexMap.toDataIndex(i), 0)
      );
      expect(sorted).toBeDefined();
      // "10", "100", "200", "25", "50" (lexicographic order)
    });

    it('should handle zero vs negative zero', () => {
      const data = [[0], [-0], [1], [-1]];
      const accessor = new MockDataAccessor(data);

      const indexMap = sorter.sort(accessor, 0, { direction: 'asc' });

      expect(indexMap.length).toBe(4);
      expect(accessor.getValue(indexMap.toDataIndex(0), 0)).toBe(-1);
      expect(accessor.getValue(indexMap.toDataIndex(3), 0)).toBe(1);
    });
  });
});
