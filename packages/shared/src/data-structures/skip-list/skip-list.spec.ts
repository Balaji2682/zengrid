import { SkipList } from './skip-list';

describe('SkipList', () => {
  describe('Construction', () => {
    it('should create empty skip list', () => {
      const list = new SkipList<number, string>();
      expect(list.size).toBe(0);
      expect(list.isEmpty).toBe(true);
    });

    it('should create with custom comparator', () => {
      const list = new SkipList<number, string>({
        comparator: (a, b) => b - a, // Reverse order
      });
      list.set(1, 'one');
      list.set(2, 'two');
      list.set(3, 'three');

      expect(list.keys()).toEqual([3, 2, 1]);
    });

    it('should create with custom max level', () => {
      const list = new SkipList<number, string>({ maxLevel: 16 });
      expect(list.getStats().maxLevel).toBe(16);
    });

    it('should create using static from()', () => {
      const list = SkipList.from([
        [1, 'one'],
        [2, 'two'],
        [3, 'three'],
      ]);
      expect(list.size).toBe(3);
      expect(list.get(2)).toBe('two');
    });
  });

  describe('set() and get()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
    });

    it('should insert new entries', () => {
      list.set(5, 'five');
      list.set(2, 'two');
      list.set(8, 'eight');

      expect(list.size).toBe(3);
      expect(list.get(5)).toBe('five');
      expect(list.get(2)).toBe('two');
      expect(list.get(8)).toBe('eight');
    });

    it('should update existing entries', () => {
      list.set(5, 'five');
      const oldValue = list.set(5, 'FIVE');

      expect(oldValue).toBe('five');
      expect(list.get(5)).toBe('FIVE');
      expect(list.size).toBe(1);
    });

    it('should return undefined for non-existent keys', () => {
      list.set(5, 'five');
      expect(list.get(10)).toBeUndefined();
    });

    it('should handle many insertions', () => {
      for (let i = 0; i < 100; i++) {
        list.set(i, `value-${i}`);
      }

      expect(list.size).toBe(100);
      expect(list.get(50)).toBe('value-50');
      expect(list.get(99)).toBe('value-99');
    });

    it('should handle insertions in random order', () => {
      const keys = [5, 2, 8, 1, 9, 3, 7, 4, 6];
      keys.forEach(key => list.set(key, `val-${key}`));

      expect(list.size).toBe(keys.length);
      keys.forEach(key => {
        expect(list.get(key)).toBe(`val-${key}`);
      });
    });
  });

  describe('has()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
      list.set(5, 'five');
      list.set(10, 'ten');
    });

    it('should return true for existing keys', () => {
      expect(list.has(5)).toBe(true);
      expect(list.has(10)).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(list.has(1)).toBe(false);
      expect(list.has(15)).toBe(false);
    });
  });

  describe('delete()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
      list.set(5, 'five');
      list.set(2, 'two');
      list.set(8, 'eight');
      list.set(1, 'one');
      list.set(10, 'ten');
    });

    it('should delete existing entries', () => {
      expect(list.delete(5)).toBe(true);
      expect(list.size).toBe(4);
      expect(list.has(5)).toBe(false);
    });

    it('should return false for non-existent keys', () => {
      expect(list.delete(100)).toBe(false);
      expect(list.size).toBe(5);
    });

    it('should handle deleting all entries', () => {
      expect(list.delete(1)).toBe(true);
      expect(list.delete(2)).toBe(true);
      expect(list.delete(5)).toBe(true);
      expect(list.delete(8)).toBe(true);
      expect(list.delete(10)).toBe(true);

      expect(list.size).toBe(0);
      expect(list.isEmpty).toBe(true);
    });

    it('should handle delete at boundaries', () => {
      expect(list.delete(1)).toBe(true); // Min
      expect(list.delete(10)).toBe(true); // Max

      expect(list.keys()).toEqual([2, 5, 8]);
    });
  });

  describe('keys(), values(), entries()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
      list.set(5, 'five');
      list.set(2, 'two');
      list.set(8, 'eight');
      list.set(1, 'one');
    });

    it('should return keys in sorted order', () => {
      expect(list.keys()).toEqual([1, 2, 5, 8]);
    });

    it('should return values in sorted order by key', () => {
      expect(list.values()).toEqual(['one', 'two', 'five', 'eight']);
    });

    it('should return entries in sorted order', () => {
      expect(list.entries()).toEqual([
        [1, 'one'],
        [2, 'two'],
        [5, 'five'],
        [8, 'eight'],
      ]);
    });

    it('should return empty arrays for empty list', () => {
      const emptyList = new SkipList<number, string>();
      expect(emptyList.keys()).toEqual([]);
      expect(emptyList.values()).toEqual([]);
      expect(emptyList.entries()).toEqual([]);
    });
  });

  describe('range()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
      for (let i = 1; i <= 10; i++) {
        list.set(i, `value-${i}`);
      }
    });

    it('should return entries in range', () => {
      const result = list.range(3, 7);

      expect(result).toEqual([
        { key: 3, value: 'value-3' },
        { key: 4, value: 'value-4' },
        { key: 5, value: 'value-5' },
        { key: 6, value: 'value-6' },
        { key: 7, value: 'value-7' },
      ]);
    });

    it('should return full range', () => {
      const result = list.range(1, 10);
      expect(result.length).toBe(10);
    });

    it('should return empty for non-overlapping range', () => {
      const result = list.range(20, 30);
      expect(result).toEqual([]);
    });

    it('should return single element range', () => {
      const result = list.range(5, 5);
      expect(result).toEqual([{ key: 5, value: 'value-5' }]);
    });

    it('should handle partial range at boundaries', () => {
      const result = list.range(8, 15);
      expect(result).toEqual([
        { key: 8, value: 'value-8' },
        { key: 9, value: 'value-9' },
        { key: 10, value: 'value-10' },
      ]);
    });
  });

  describe('min() and max()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
    });

    it('should return undefined for empty list', () => {
      expect(list.min()).toBeUndefined();
      expect(list.max()).toBeUndefined();
    });

    it('should return min and max for single element', () => {
      list.set(5, 'five');

      expect(list.min()).toEqual({ key: 5, value: 'five' });
      expect(list.max()).toEqual({ key: 5, value: 'five' });
    });

    it('should return correct min and max', () => {
      list.set(5, 'five');
      list.set(2, 'two');
      list.set(8, 'eight');
      list.set(1, 'one');
      list.set(10, 'ten');

      expect(list.min()).toEqual({ key: 1, value: 'one' });
      expect(list.max()).toEqual({ key: 10, value: 'ten' });
    });

    it('should update after deletions', () => {
      list.set(1, 'one');
      list.set(5, 'five');
      list.set(10, 'ten');

      list.delete(1);
      list.delete(10);

      expect(list.min()).toEqual({ key: 5, value: 'five' });
      expect(list.max()).toEqual({ key: 5, value: 'five' });
    });
  });

  describe('getKth()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
      for (let i = 1; i <= 10; i++) {
        list.set(i, `value-${i}`);
      }
    });

    it('should return kth element', () => {
      expect(list.getKth(0)).toEqual({ key: 1, value: 'value-1' });
      expect(list.getKth(4)).toEqual({ key: 5, value: 'value-5' });
      expect(list.getKth(9)).toEqual({ key: 10, value: 'value-10' });
    });

    it('should return undefined for invalid k', () => {
      expect(list.getKth(-1)).toBeUndefined();
      expect(list.getKth(10)).toBeUndefined();
      expect(list.getKth(100)).toBeUndefined();
    });

    it('should work for single element', () => {
      const singleList = new SkipList<number, string>();
      singleList.set(5, 'five');

      expect(singleList.getKth(0)).toEqual({ key: 5, value: 'five' });
    });
  });

  describe('countRange()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
      for (let i = 1; i <= 10; i++) {
        list.set(i, `value-${i}`);
      }
    });

    it('should count entries in range', () => {
      expect(list.countRange(3, 7)).toBe(5);
      expect(list.countRange(1, 10)).toBe(10);
      expect(list.countRange(5, 5)).toBe(1);
    });

    it('should return 0 for empty range', () => {
      expect(list.countRange(20, 30)).toBe(0);
    });
  });

  describe('floor() and ceiling()', () => {
    let list: SkipList<number, string>;

    beforeEach(() => {
      list = new SkipList<number, string>();
      list.set(2, 'two');
      list.set(5, 'five');
      list.set(8, 'eight');
      list.set(10, 'ten');
    });

    it('should find floor', () => {
      expect(list.floor(7)).toEqual({ key: 5, value: 'five' });
      expect(list.floor(5)).toEqual({ key: 5, value: 'five' });
      expect(list.floor(3)).toEqual({ key: 2, value: 'two' });
      expect(list.floor(10)).toEqual({ key: 10, value: 'ten' });
    });

    it('should return undefined when no floor exists', () => {
      expect(list.floor(1)).toBeUndefined();
    });

    it('should find ceiling', () => {
      expect(list.ceiling(3)).toEqual({ key: 5, value: 'five' });
      expect(list.ceiling(5)).toEqual({ key: 5, value: 'five' });
      expect(list.ceiling(7)).toEqual({ key: 8, value: 'eight' });
      expect(list.ceiling(2)).toEqual({ key: 2, value: 'two' });
    });

    it('should return undefined when no ceiling exists', () => {
      expect(list.ceiling(11)).toBeUndefined();
    });
  });

  describe('forEach()', () => {
    it('should iterate in sorted order', () => {
      const list = new SkipList<number, string>();
      list.set(5, 'five');
      list.set(2, 'two');
      list.set(8, 'eight');

      const keys: number[] = [];
      const values: string[] = [];

      list.forEach((value, key) => {
        keys.push(key);
        values.push(value);
      });

      expect(keys).toEqual([2, 5, 8]);
      expect(values).toEqual(['two', 'five', 'eight']);
    });

    it('should not iterate on empty list', () => {
      const list = new SkipList<number, string>();
      let count = 0;

      list.forEach(() => {
        count++;
      });

      expect(count).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear all entries', () => {
      const list = new SkipList<number, string>();
      list.set(1, 'one');
      list.set(2, 'two');
      list.set(3, 'three');

      list.clear();

      expect(list.size).toBe(0);
      expect(list.isEmpty).toBe(true);
      expect(list.keys()).toEqual([]);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      const list = new SkipList<number, string>();

      for (let i = 1; i <= 100; i++) {
        list.set(i, `value-${i}`);
      }

      const stats = list.getStats();

      expect(stats.size).toBe(100);
      expect(stats.level).toBeGreaterThanOrEqual(0);
      expect(stats.maxLevel).toBe(32);
      expect(stats.averageLevel).toBeGreaterThan(0);
      expect(stats.memoryBytes).toBeGreaterThan(0);
    });

    it('should return zero stats for empty list', () => {
      const list = new SkipList<number, string>();
      const stats = list.getStats();

      expect(stats.size).toBe(0);
      expect(stats.level).toBe(0);
      expect(stats.averageLevel).toBe(0);
    });
  });

  describe('validate()', () => {
    it('should validate correct structure', () => {
      const list = new SkipList<number, string>();

      for (let i = 1; i <= 50; i++) {
        list.set(i, `value-${i}`);
      }

      expect(list.validate()).toBe(true);
    });

    it('should validate after deletions', () => {
      const list = new SkipList<number, string>();

      for (let i = 1; i <= 50; i++) {
        list.set(i, `value-${i}`);
      }

      for (let i = 10; i <= 20; i++) {
        list.delete(i);
      }

      expect(list.validate()).toBe(true);
    });

    it('should validate empty list', () => {
      const list = new SkipList<number, string>();
      expect(list.validate()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate insertions', () => {
      const list = new SkipList<number, string>();

      list.set(5, 'five-1');
      list.set(5, 'five-2');
      list.set(5, 'five-3');

      expect(list.size).toBe(1);
      expect(list.get(5)).toBe('five-3');
    });

    it('should handle negative keys', () => {
      const list = new SkipList<number, string>();

      list.set(-5, 'negative');
      list.set(0, 'zero');
      list.set(5, 'positive');

      expect(list.keys()).toEqual([-5, 0, 5]);
    });

    it('should handle string keys', () => {
      const list = new SkipList<string, number>();

      list.set('apple', 1);
      list.set('banana', 2);
      list.set('cherry', 3);

      expect(list.keys()).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should handle object values', () => {
      const list = new SkipList<number, { name: string; age: number }>();

      list.set(1, { name: 'Alice', age: 25 });
      list.set(2, { name: 'Bob', age: 30 });

      expect(list.get(1)).toEqual({ name: 'Alice', age: 25 });
    });

    it('should handle large dataset', () => {
      const list = new SkipList<number, string>();
      const n = 10000;

      for (let i = 0; i < n; i++) {
        list.set(i, `value-${i}`);
      }

      expect(list.size).toBe(n);
      expect(list.get(5000)).toBe('value-5000');
      expect(list.validate()).toBe(true);
    });
  });

  describe('Use Case: Sorted Column Data', () => {
    it('should maintain sorted order for grid column', () => {
      const sortedColumn = new SkipList<number, string>();

      // Simulate adding rows with values
      sortedColumn.set(100, 'Product A');
      sortedColumn.set(50, 'Product B');
      sortedColumn.set(200, 'Product C');
      sortedColumn.set(25, 'Product D');

      // Get all in sorted order
      expect(sortedColumn.values()).toEqual([
        'Product D',
        'Product B',
        'Product A',
        'Product C',
      ]);

      // Range query: products with value 50-150
      const inRange = sortedColumn.range(50, 150);
      expect(inRange.map(r => r.value)).toEqual(['Product B', 'Product A']);
    });

    it('should efficiently find median', () => {
      const list = new SkipList<number, number>();

      // Add dataset
      const values = [5, 2, 8, 1, 9, 3, 7, 4, 6];
      values.forEach(v => list.set(v, v));

      // Find median (middle element)
      const medianIndex = Math.floor(list.size / 2);
      const median = list.getKth(medianIndex);

      expect(median?.key).toBe(5);
    });

    it('should support dynamic sorting', () => {
      const list = new SkipList<number, string>();

      // Initial data
      list.set(3, 'three');
      list.set(1, 'one');
      list.set(2, 'two');

      expect(list.keys()).toEqual([1, 2, 3]);

      // Update: remove and re-insert with new key
      list.delete(2);
      list.set(4, 'four');

      expect(list.keys()).toEqual([1, 3, 4]);
    });
  });

  describe('toString()', () => {
    it('should return string representation', () => {
      const list = new SkipList<number, string>();
      list.set(1, 'one');
      list.set(2, 'two');

      const str = list.toString();
      expect(str).toContain('SkipList');
      expect(str).toContain('size: 2');
    });
  });
});
