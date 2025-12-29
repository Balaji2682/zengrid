/**
 * IndexMap tests
 */

import { IndexMap } from './index-map';

describe('IndexMap', () => {
  describe('Basic Operations', () => {
    it('should create an empty IndexMap', () => {
      const map = new IndexMap<string, number>();
      expect(map.size).toBe(0);
      expect(map.hasReverseMapping).toBe(false);
    });

    it('should set and get values by key', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(map.get('c')).toBe(3);
      expect(map.size).toBe(3);
    });

    it('should update existing values without changing index', () => {
      const map = new IndexMap<string, number>();
      const idx1 = map.set('a', 1);
      map.set('b', 2);
      const idx3 = map.set('a', 10); // Update 'a'

      expect(idx1).toBe(idx3); // Same index
      expect(map.get('a')).toBe(10);
      expect(map.getByIndex(0)?.value).toBe(10);
      expect(map.size).toBe(2);
    });

    it('should return correct index when setting', () => {
      const map = new IndexMap<string, string>();
      expect(map.set('first', 'A')).toBe(0);
      expect(map.set('second', 'B')).toBe(1);
      expect(map.set('third', 'C')).toBe(2);
    });
  });

  describe('Index-based Access', () => {
    it('should get entries by index', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const entry0 = map.getByIndex(0);
      expect(entry0).toEqual({ key: 'a', value: 1, index: 0 });

      const entry1 = map.getByIndex(1);
      expect(entry1).toEqual({ key: 'b', value: 2, index: 1 });

      const entry2 = map.getByIndex(2);
      expect(entry2).toEqual({ key: 'c', value: 3, index: 2 });
    });

    it('should get keys by index', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      expect(map.getKeyByIndex(0)).toBe('a');
      expect(map.getKeyByIndex(1)).toBe('b');
      expect(map.getKeyByIndex(2)).toBeUndefined();
      expect(map.getKeyByIndex(-1)).toBeUndefined();
    });

    it('should get values by index', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      expect(map.getValueByIndex(0)).toBe(1);
      expect(map.getValueByIndex(1)).toBe(2);
      expect(map.getValueByIndex(2)).toBeUndefined();
    });

    it('should return undefined for out-of-bounds indices', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);

      expect(map.getByIndex(-1)).toBeUndefined();
      expect(map.getByIndex(100)).toBeUndefined();
      expect(map.getKeyByIndex(-1)).toBeUndefined();
      expect(map.getValueByIndex(100)).toBeUndefined();
    });
  });

  describe('indexOf', () => {
    it('should return correct index for existing keys', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      expect(map.indexOf('a')).toBe(0);
      expect(map.indexOf('b')).toBe(1);
      expect(map.indexOf('c')).toBe(2);
    });

    it('should return -1 for non-existent keys', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);

      expect(map.indexOf('b')).toBe(-1);
      expect(map.indexOf('xyz')).toBe(-1);
    });
  });

  describe('has and hasValue', () => {
    it('should check key existence', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);

      expect(map.has('a')).toBe(true);
      expect(map.has('b')).toBe(false);
    });

    it('should check value existence without reverse mapping (O(n))', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      expect(map.hasValue(1)).toBe(true);
      expect(map.hasValue(2)).toBe(true);
      expect(map.hasValue(3)).toBe(false);
    });

    it('should check value existence with reverse mapping (O(1))', () => {
      const map = new IndexMap<string, number>({ enableReverseMapping: true });
      map.set('a', 1);
      map.set('b', 2);

      expect(map.hasValue(1)).toBe(true);
      expect(map.hasValue(2)).toBe(true);
      expect(map.hasValue(3)).toBe(false);
    });
  });

  describe('Reverse Mapping', () => {
    it('should get keys by value when reverse mapping is enabled', () => {
      const map = new IndexMap<string, number>({ enableReverseMapping: true });
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 1); // Duplicate value

      const keysFor1 = map.getKeysByValue(1);
      expect(keysFor1).toHaveLength(2);
      expect(keysFor1).toContain('a');
      expect(keysFor1).toContain('c');

      const keysFor2 = map.getKeysByValue(2);
      expect(keysFor2).toEqual(['b']);

      const keysFor3 = map.getKeysByValue(3);
      expect(keysFor3).toEqual([]);
    });

    it('should get keys by value with linear search when reverse mapping is disabled', () => {
      const map = new IndexMap<string, number>({ enableReverseMapping: false });
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 1); // Duplicate value

      const keysFor1 = map.getKeysByValue(1);
      expect(keysFor1).toHaveLength(2);
      expect(keysFor1).toContain('a');
      expect(keysFor1).toContain('c');
    });

    it('should update reverse mapping when values change', () => {
      const map = new IndexMap<string, number>({ enableReverseMapping: true });
      map.set('a', 1);
      map.set('b', 2);

      expect(map.getKeysByValue(1)).toEqual(['a']);

      map.set('a', 2); // Change value

      expect(map.getKeysByValue(1)).toEqual([]);
      expect(map.getKeysByValue(2)).toHaveLength(2);
      expect(map.getKeysByValue(2)).toContain('a');
      expect(map.getKeysByValue(2)).toContain('b');
    });

    it('should report correct hasReverseMapping flag', () => {
      const map1 = new IndexMap<string, number>();
      expect(map1.hasReverseMapping).toBe(false);

      const map2 = new IndexMap<string, number>({ enableReverseMapping: true });
      expect(map2.hasReverseMapping).toBe(true);
    });
  });

  describe('Deletion', () => {
    it('should delete by key and reindex', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const deleted = map.delete('b');

      expect(deleted).toBe(true);
      expect(map.size).toBe(2);
      expect(map.has('b')).toBe(false);

      // Check reindexing
      expect(map.indexOf('a')).toBe(0);
      expect(map.indexOf('c')).toBe(1); // Was 2, now 1

      expect(map.getByIndex(0)).toEqual({ key: 'a', value: 1, index: 0 });
      expect(map.getByIndex(1)).toEqual({ key: 'c', value: 3, index: 1 });
      expect(map.getByIndex(2)).toBeUndefined();
    });

    it('should delete by index and reindex', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const deleted = map.deleteByIndex(1); // Delete 'b'

      expect(deleted).toBe(true);
      expect(map.size).toBe(2);
      expect(map.has('b')).toBe(false);
      expect(map.indexOf('c')).toBe(1);
    });

    it('should return false when deleting non-existent key', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);

      expect(map.delete('b')).toBe(false);
      expect(map.size).toBe(1);
    });

    it('should return false when deleting invalid index', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);

      expect(map.deleteByIndex(-1)).toBe(false);
      expect(map.deleteByIndex(100)).toBe(false);
      expect(map.size).toBe(1);
    });

    it('should update reverse mapping on deletion', () => {
      const map = new IndexMap<string, number>({ enableReverseMapping: true });
      map.set('a', 1);
      map.set('b', 1);
      map.set('c', 2);

      map.delete('a');

      expect(map.getKeysByValue(1)).toEqual(['b']);
      expect(map.getKeysByValue(2)).toEqual(['c']);
    });
  });

  describe('Clear', () => {
    it('should clear all entries', () => {
      const map = new IndexMap<string, number>({ enableReverseMapping: true });
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      map.clear();

      expect(map.size).toBe(0);
      expect(map.has('a')).toBe(false);
      expect(map.getByIndex(0)).toBeUndefined();
      expect(map.getKeysByValue(1)).toEqual([]);
    });
  });

  describe('Iteration and Array Methods', () => {
    it('should return keys in insertion order', () => {
      const map = new IndexMap<string, number>();
      map.set('c', 3);
      map.set('a', 1);
      map.set('b', 2);

      expect(map.keys()).toEqual(['c', 'a', 'b']);
    });

    it('should return values in insertion order', () => {
      const map = new IndexMap<string, number>();
      map.set('c', 3);
      map.set('a', 1);
      map.set('b', 2);

      expect(map.values()).toEqual([3, 1, 2]);
    });

    it('should return entries in insertion order', () => {
      const map = new IndexMap<string, number>();
      map.set('c', 3);
      map.set('a', 1);

      expect(map.entries()).toEqual([
        ['c', 3],
        ['a', 1],
      ]);
    });

    it('should iterate with forEach', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      const results: Array<{ value: number; key: string; index: number }> = [];
      map.forEach((value, key, index) => {
        results.push({ value, key, index });
      });

      expect(results).toEqual([
        { value: 1, key: 'a', index: 0 },
        { value: 2, key: 'b', index: 1 },
      ]);
    });

    it('should find first matching entry', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const key = map.find((value) => value > 1);
      expect(key).toBe('b');

      const notFound = map.find((value) => value > 10);
      expect(notFound).toBeUndefined();
    });

    it('should filter entries', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.set('d', 4);

      const filtered = map.filter((value) => value % 2 === 0);

      expect(filtered.size).toBe(2);
      expect(filtered.get('b')).toBe(2);
      expect(filtered.get('d')).toBe(4);
      expect(filtered.has('a')).toBe(false);
    });

    it('should map values to new IndexMap', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const mapped = map.map((value) => value * 10);

      expect(mapped.size).toBe(3);
      expect(mapped.get('a')).toBe(10);
      expect(mapped.get('b')).toBe(20);
      expect(mapped.get('c')).toBe(30);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create from array of entries', () => {
      const entries: Array<[string, number]> = [
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ];

      const map = IndexMap.from(entries);

      expect(map.size).toBe(3);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(map.indexOf('c')).toBe(2);
    });

    it('should create from Map', () => {
      const sourceMap = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);

      const indexMap = IndexMap.fromMap(sourceMap);

      expect(indexMap.size).toBe(2);
      expect(indexMap.get('a')).toBe(1);
      expect(indexMap.get('b')).toBe(2);
    });

    it('should create from object', () => {
      const obj = { a: 1, b: 2, c: 3 };

      const map = IndexMap.fromObject(obj);

      expect(map.size).toBe(3);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
    });

    it('should respect options in factory methods', () => {
      const map = IndexMap.from(
        [
          ['a', 1],
          ['b', 2],
        ],
        { enableReverseMapping: true }
      );

      expect(map.hasReverseMapping).toBe(true);
      expect(map.getKeysByValue(1)).toEqual(['a']);
    });
  });

  describe('Conversion Methods', () => {
    it('should convert to object', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      const obj = map.toObject();

      expect(obj).toEqual({ a: 1, b: 2 });
    });

    it('should convert to Map', () => {
      const indexMap = new IndexMap<string, number>();
      indexMap.set('a', 1);
      indexMap.set('b', 2);

      const regularMap = indexMap.toMap();

      expect(regularMap.size).toBe(2);
      expect(regularMap.get('a')).toBe(1);
      expect(regularMap.get('b')).toBe(2);
    });

    it('should have meaningful toString', () => {
      const map = new IndexMap<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      const str = map.toString();

      expect(str).toContain('IndexMap');
      expect(str).toContain('a: 1');
      expect(str).toContain('b: 2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle various key types', () => {
      const map = new IndexMap<number, string>();
      map.set(1, 'one');
      map.set(2, 'two');

      expect(map.get(1)).toBe('one');
      expect(map.indexOf(2)).toBe(1);
    });

    it('should handle object keys', () => {
      const key1 = { id: 1 };
      const key2 = { id: 2 };
      const map = new IndexMap<object, string>();

      map.set(key1, 'first');
      map.set(key2, 'second');

      expect(map.get(key1)).toBe('first');
      expect(map.get(key2)).toBe('second');
      expect(map.size).toBe(2);
    });

    it('should handle null and undefined values', () => {
      const map = new IndexMap<string, any>();
      map.set('null', null);
      map.set('undefined', undefined);

      expect(map.get('null')).toBeNull();
      expect(map.get('undefined')).toBeUndefined();
      expect(map.has('null')).toBe(true);
      expect(map.has('undefined')).toBe(true);
    });

    it('should maintain correct state after multiple operations', () => {
      const map = new IndexMap<string, number>();

      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.delete('b');
      map.set('d', 4);
      map.set('a', 10); // Update

      expect(map.size).toBe(3);
      expect(map.get('a')).toBe(10);
      expect(map.indexOf('a')).toBe(0);
      expect(map.indexOf('c')).toBe(1);
      expect(map.indexOf('d')).toBe(2);
      expect(map.has('b')).toBe(false);
    });

    it('should work with large datasets', () => {
      const map = new IndexMap<string, number>();
      const n = 10000;

      // Insert
      for (let i = 0; i < n; i++) {
        map.set(`key${i}`, i);
      }

      expect(map.size).toBe(n);

      // Access
      expect(map.get('key5000')).toBe(5000);
      expect(map.indexOf('key9999')).toBe(9999);
      expect(map.getValueByIndex(1000)).toBe(1000);

      // Delete
      map.delete('key5000');
      expect(map.size).toBe(n - 1);
      expect(map.has('key5000')).toBe(false);
    });
  });

  describe('Performance Characteristics', () => {
    it('should have O(1) lookup by key', () => {
      const map = new IndexMap<string, number>();
      for (let i = 0; i < 1000; i++) {
        map.set(`key${i}`, i);
      }

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        map.get(`key${i}`);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should have O(1) lookup by index', () => {
      const map = new IndexMap<string, number>();
      for (let i = 0; i < 1000; i++) {
        map.set(`key${i}`, i);
      }

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        map.getByIndex(i);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should have O(1) reverse lookup with enableReverseMapping', () => {
      const map = new IndexMap<string, number>({ enableReverseMapping: true });
      for (let i = 0; i < 1000; i++) {
        map.set(`key${i}`, i);
      }

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        map.getKeysByValue(i);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should be reasonably fast
    });
  });
});
