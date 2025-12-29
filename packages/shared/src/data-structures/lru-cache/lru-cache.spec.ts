import { LRUCache } from './lru-cache';

describe('LRUCache', () => {
  describe('Basic Operations', () => {
    it('should set and get values', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new LRUCache<string, number>();

      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing values', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);
      cache.set('a', 2);

      expect(cache.get('a')).toBe(2);
      expect(cache.size()).toBe(1);
    });

    it('should handle different value types', () => {
      const cache = new LRUCache<string, any>();

      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('object', { foo: 'bar' });
      cache.set('array', [1, 2, 3]);
      cache.set('null', null);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('object')).toEqual({ foo: 'bar' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('null')).toBe(null);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used item when capacity is exceeded', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update LRU order on get', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a'); // 'a' becomes most recently used

      cache.set('d', 4); // Should evict 'b', not 'a'

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update LRU order on set of existing key', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.set('a', 10); // Update 'a', making it most recent

      cache.set('d', 4); // Should evict 'b'

      expect(cache.get('a')).toBe(10);
      expect(cache.get('b')).toBeUndefined();
    });

    it('should call onEvict callback when evicting', () => {
      const onEvict = jest.fn();
      const cache = new LRUCache<string, number>({
        capacity: 2,
        onEvict,
      });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // Evicts 'a'

      expect(onEvict).toHaveBeenCalledWith('a', 1);
      expect(onEvict).toHaveBeenCalledTimes(1);
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should expire entries after TTL', () => {
      const cache = new LRUCache<string, number>({ ttl: 1000 }); // 1 second

      cache.set('a', 1);

      expect(cache.get('a')).toBe(1);

      jest.advanceTimersByTime(1001);

      expect(cache.get('a')).toBeUndefined();
    });

    it('should not expire entries when TTL is 0', () => {
      const cache = new LRUCache<string, number>({ ttl: 0 });

      cache.set('a', 1);

      jest.advanceTimersByTime(10000000);

      expect(cache.get('a')).toBe(1);
    });

    it('should remove expired entries from cache', () => {
      const cache = new LRUCache<string, number>({ ttl: 1000 });

      cache.set('a', 1);
      expect(cache.size()).toBe(1);

      jest.advanceTimersByTime(1001);

      cache.get('a'); // Triggers expiration check
      expect(cache.size()).toBe(0);
    });
  });

  describe('has()', () => {
    it('should return true for existing keys', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);

      expect(cache.has('a')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      const cache = new LRUCache<string, number>();

      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries', () => {
      jest.useFakeTimers();

      const cache = new LRUCache<string, number>({ ttl: 1000 });
      cache.set('a', 1);

      expect(cache.has('a')).toBe(true);

      jest.advanceTimersByTime(1001);

      expect(cache.has('a')).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('delete()', () => {
    it('should delete existing entries', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.size()).toBe(1);
    });

    it('should return false for non-existent keys', () => {
      const cache = new LRUCache<string, number>();

      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should handle deleting the only entry', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);
      cache.delete('a');

      expect(cache.size()).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBeUndefined();
    });

    it('should reset statistics when tracking is enabled', () => {
      const cache = new LRUCache<string, number>({ trackStats: true });

      cache.set('a', 1);
      cache.get('a');
      cache.get('nonexistent');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
    });
  });

  describe('peek()', () => {
    it('should get value without updating LRU order', () => {
      const cache = new LRUCache<string, number>({ capacity: 3 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.peek('a')).toBe(1);

      cache.set('d', 4); // Should still evict 'a' because peek didn't update order

      expect(cache.get('a')).toBeUndefined();
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new LRUCache<string, number>();

      expect(cache.peek('nonexistent')).toBeUndefined();
    });
  });

  describe('keys(), values(), entries()', () => {
    it('should return keys in LRU order (oldest to newest)', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.keys()).toEqual(['a', 'b', 'c']);

      cache.get('a'); // Make 'a' most recent

      expect(cache.keys()).toEqual(['b', 'c', 'a']);
    });

    it('should return values in LRU order', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.values()).toEqual([1, 2, 3]);
    });

    it('should return entries with metadata', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);

      const entries = cache.entries();

      expect(entries).toHaveLength(1);
      expect(entries[0][0]).toBe('a');
      expect(entries[0][1].value).toBe(1);
      expect(entries[0][1].accessCount).toBe(0);
      expect(typeof entries[0][1].createdAt).toBe('number');
      expect(typeof entries[0][1].lastAccessedAt).toBe('number');
    });
  });

  describe('resize()', () => {
    it('should increase capacity', () => {
      const cache = new LRUCache<string, number>({ capacity: 2 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // Evicts 'a'

      expect(cache.has('a')).toBe(false);

      cache.resize(5);
      cache.set('d', 4);
      cache.set('e', 5);

      expect(cache.size()).toBe(4); // b, c, d, e
    });

    it('should decrease capacity and evict entries', () => {
      const cache = new LRUCache<string, number>({ capacity: 5 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);
      cache.set('e', 5);

      cache.resize(3); // Should evict 'a' and 'b'

      expect(cache.size()).toBe(3);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
    });

    it('should throw error for invalid capacity', () => {
      const cache = new LRUCache<string, number>();

      expect(() => cache.resize(0)).toThrow();
      expect(() => cache.resize(-1)).toThrow();
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      const cache = new LRUCache<string, number>({ trackStats: true });

      cache.set('a', 1);

      cache.get('a'); // Hit
      cache.get('b'); // Miss
      cache.get('a'); // Hit
      cache.get('c'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track evictions', () => {
      const cache = new LRUCache<string, number>({
        capacity: 2,
        trackStats: true,
      });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // Evicts 'a'
      cache.set('d', 4); // Evicts 'b'

      const stats = cache.getStats();
      expect(stats.evictions).toBe(2);
    });

    it('should track number of sets', () => {
      const cache = new LRUCache<string, number>({ trackStats: true });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('a', 10); // Update

      const stats = cache.getStats();
      expect(stats.sets).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle capacity of 1', () => {
      const cache = new LRUCache<string, number>({ capacity: 1 });

      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);

      cache.set('b', 2);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
    });

    it('should throw error for capacity <= 0', () => {
      expect(() => new LRUCache({ capacity: 0 })).toThrow();
      expect(() => new LRUCache({ capacity: -1 })).toThrow();
    });

    it('should handle undefined and null values', () => {
      const cache = new LRUCache<string, any>();

      cache.set('undefined', undefined);
      cache.set('null', null);

      // undefined value is stored but get returns undefined
      expect(cache.has('undefined')).toBe(true);
      expect(cache.get('null')).toBe(null);
    });

    it('should handle numeric keys', () => {
      const cache = new LRUCache<number, string>();

      cache.set(1, 'one');
      cache.set(2, 'two');

      expect(cache.get(1)).toBe('one');
      expect(cache.get(2)).toBe('two');
    });

    it('should handle object keys', () => {
      const cache = new LRUCache<object, string>();

      const key1 = { id: 1 };
      const key2 = { id: 2 };

      cache.set(key1, 'one');
      cache.set(key2, 'two');

      expect(cache.get(key1)).toBe('one');
      expect(cache.get(key2)).toBe('two');
      expect(cache.get({ id: 1 })).toBeUndefined(); // Different object reference
    });

    it('should handle rapid successive operations', () => {
      const cache = new LRUCache<number, number>({ capacity: 100 });

      for (let i = 0; i < 1000; i++) {
        cache.set(i, i * 2);
      }

      expect(cache.size()).toBe(100);
      expect(cache.get(899)).toBeUndefined(); // Evicted
      expect(cache.get(999)).toBe(1998); // Recent
    });

    it('should handle empty cache operations', () => {
      const cache = new LRUCache<string, number>();

      expect(cache.size()).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.has('a')).toBe(false);
      expect(cache.delete('a')).toBe(false);
      expect(cache.keys()).toEqual([]);
      expect(cache.values()).toEqual([]);
      expect(cache.entries()).toEqual([]);
    });
  });

  describe('Access Count Tracking', () => {
    it('should track access count on get operations', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);

      cache.get('a');
      cache.get('a');
      cache.get('a');

      const entries = cache.entries();
      expect(entries[0][1].accessCount).toBe(3);
    });

    it('should increment access count on set of existing key', () => {
      const cache = new LRUCache<string, number>();

      cache.set('a', 1);
      cache.set('a', 2);

      const entries = cache.entries();
      expect(entries[0][1].accessCount).toBe(1);
    });
  });
});
