import { LRUCache } from './lru-cache';

/**
 * Performance benchmarks for LRU Cache
 *
 * These tests verify that operations maintain O(1) time complexity
 * regardless of cache size.
 */
describe('LRUCache Performance', () => {
  describe('O(1) Set Performance', () => {
    it('should set 10,000 items in O(1) time per operation', () => {
      const cache = new LRUCache<number, string>({ capacity: 10000 });

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        cache.set(i, `value-${i}`);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / 10000;

      console.log(`Set 10,000 items in ${totalTime.toFixed(2)}ms (${avgTime.toFixed(4)}ms per item)`);

      expect(totalTime).toBeLessThan(100); // Should be very fast
      expect(avgTime).toBeLessThan(0.01); // Less than 0.01ms per item
    });

    it('should maintain constant time as cache grows', () => {
      const sizes = [1000, 5000, 10000];
      const timings: number[] = [];

      for (const size of sizes) {
        const cache = new LRUCache<number, string>({ capacity: size });

        const start = performance.now();
        for (let i = 0; i < 100; i++) {
          cache.set(i, `value-${i}`);
        }
        const end = performance.now();

        timings.push((end - start) / 100);
      }

      console.log('Set timings by cache size:', timings.map((t, i) => `${sizes[i]}: ${t.toFixed(4)}ms`));

      // Time should not grow significantly with cache size (O(1) property)
      const ratio = timings[2] / timings[0];
      expect(ratio).toBeLessThan(2); // Should be roughly constant, not linear
    });
  });

  describe('O(1) Get Performance', () => {
    it('should get 10,000 items in O(1) time per operation', () => {
      const cache = new LRUCache<number, string>({ capacity: 10000 });

      // Populate cache
      for (let i = 0; i < 10000; i++) {
        cache.set(i, `value-${i}`);
      }

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        cache.get(i);
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / 10000;

      console.log(`Get 10,000 items in ${totalTime.toFixed(2)}ms (${avgTime.toFixed(4)}ms per item)`);

      expect(totalTime).toBeLessThan(50);
      expect(avgTime).toBeLessThan(0.005);
    });

    it('should maintain constant get time as cache grows', () => {
      const sizes = [1000, 5000, 10000];
      const timings: number[] = [];

      for (const size of sizes) {
        const cache = new LRUCache<number, string>({ capacity: size });

        // Populate
        for (let i = 0; i < size; i++) {
          cache.set(i, `value-${i}`);
        }

        const start = performance.now();
        for (let i = 0; i < 100; i++) {
          cache.get(i);
        }
        const end = performance.now();

        timings.push((end - start) / 100);
      }

      console.log('Get timings by cache size:', timings.map((t, i) => `${sizes[i]}: ${t.toFixed(4)}ms`));

      const ratio = timings[2] / timings[0];
      expect(ratio).toBeLessThan(2);
    });
  });

  describe('O(1) Delete Performance', () => {
    it('should delete items in O(1) time', () => {
      const cache = new LRUCache<number, string>({ capacity: 10000 });

      for (let i = 0; i < 10000; i++) {
        cache.set(i, `value-${i}`);
      }

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        cache.delete(i);
      }

      const end = performance.now();
      const avgTime = (end - start) / 1000;

      console.log(`Delete 1,000 items in ${(end - start).toFixed(2)}ms (${avgTime.toFixed(4)}ms per item)`);

      expect(avgTime).toBeLessThan(0.01);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not grow beyond capacity', () => {
      const capacity = 1000;
      const cache = new LRUCache<number, string>({ capacity });

      for (let i = 0; i < 10000; i++) {
        cache.set(i, `value-${i}`);
      }

      expect(cache.size()).toBe(capacity);
    });

    it('should report reasonable memory usage', () => {
      const cache = new LRUCache<string, string>({
        capacity: 1000,
        trackStats: true,
      });

      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      const stats = cache.getStats();

      console.log(`Memory usage for 1,000 entries: ${(stats.memoryBytes / 1024).toFixed(2)} KB`);

      expect(stats.memoryBytes).toBeGreaterThan(0);
      expect(stats.memoryBytes).toBeLessThan(1024 * 1024); // Less than 1MB
    });
  });

  describe('Cache Hit Rate Performance', () => {
    it('should demonstrate high hit rate for repeated access', () => {
      const cache = new LRUCache<number, string>({
        capacity: 100,
        trackStats: true,
      });

      // Populate
      for (let i = 0; i < 100; i++) {
        cache.set(i, `value-${i}`);
      }

      // Access hot keys repeatedly
      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < 50; i++) {
          cache.get(i);
        }
      }

      const stats = cache.getStats();

      console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
      console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);

      expect(stats.hitRate).toBeGreaterThan(0.95); // Should be very high
    });

    it('should show low hit rate with random access pattern', () => {
      const cache = new LRUCache<number, string>({
        capacity: 100,
        trackStats: true,
      });

      // Random access - lots of misses
      for (let i = 0; i < 1000; i++) {
        const key = Math.floor(Math.random() * 1000);
        let value = cache.get(key);

        if (!value) {
          value = `value-${key}`;
          cache.set(key, value);
        }
      }

      const stats = cache.getStats();

      console.log(`Random access hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);

      expect(stats.hitRate).toBeLessThan(0.5); // Lower hit rate expected
    });
  });

  describe('Real-World Scenarios', () => {
    it('should efficiently cache formula results', () => {
      interface FormulaResult {
        value: number;
        computeTime: number;
      }

      const cache = new LRUCache<string, FormulaResult>({
        capacity: 500,
        trackStats: true,
      });

      // Simulate expensive formula calculations
      const computeFormula = (_formula: string): FormulaResult => {
        // Simulate computation
        let result = 0;
        for (let i = 0; i < 1000; i++) {
          result += Math.random();
        }
        return { value: result, computeTime: 5 };
      };

      const formulas = Array.from({ length: 100 }, (_, i) => `=SUM(A1:A${i + 1})`);

      const start = performance.now();

      // Access formulas repeatedly (cache should help)
      for (let round = 0; round < 10; round++) {
        formulas.forEach(formula => {
          let result = cache.get(formula);
          if (!result) {
            result = computeFormula(formula);
            cache.set(formula, result);
          }
        });
      }

      const end = performance.now();
      const stats = cache.getStats();

      console.log(`Formula cache performance: ${(end - start).toFixed(2)}ms`);
      console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);

      expect(stats.hitRate).toBeGreaterThan(0.8); // Most should hit cache
    });

    it('should efficiently cache rendered cells', () => {
      interface RenderedCell {
        html: string;
        renderTime: number;
      }

      const cache = new LRUCache<string, RenderedCell>({
        capacity: 1000,
        trackStats: true,
      });

      const renderCell = (row: number, col: number): RenderedCell => {
        return {
          html: `<div>Cell ${row},${col}</div>`,
          renderTime: 1,
        };
      };

      const start = performance.now();

      // Simulate scrolling - repeated access to visible cells
      for (let scrollPos = 0; scrollPos < 100; scrollPos++) {
        for (let row = scrollPos; row < scrollPos + 20; row++) {
          for (let col = 0; col < 10; col++) {
            const key = `${row},${col}`;
            let cell = cache.get(key);

            if (!cell) {
              cell = renderCell(row, col);
              cache.set(key, cell);
            }
          }
        }
      }

      const end = performance.now();
      const stats = cache.getStats();

      console.log(`Cell rendering with cache: ${(end - start).toFixed(2)}ms`);
      console.log(`Cache efficiency: ${(stats.hitRate * 100).toFixed(2)}% hit rate`);

      expect(stats.hitRate).toBeGreaterThan(0.7);
    });
  });

  describe('Comparison with Plain Object', () => {
    it('should compare LRU Cache vs Plain Object for bounded memory', () => {
      const capacity = 1000;

      // Plain object (no eviction)
      const plainObj: Record<number, string> = {};
      const plainStart = performance.now();

      for (let i = 0; i < 10000; i++) {
        plainObj[i] = `value-${i}`;
      }

      const plainEnd = performance.now();
      const plainTime = plainEnd - plainStart;
      const plainSize = Object.keys(plainObj).length;

      // LRU Cache (with eviction)
      const cache = new LRUCache<number, string>({ capacity });
      const cacheStart = performance.now();

      for (let i = 0; i < 10000; i++) {
        cache.set(i, `value-${i}`);
      }

      const cacheEnd = performance.now();
      const cacheTime = cacheEnd - cacheStart;
      const cacheSize = cache.size();

      console.log('Plain Object:', { time: plainTime.toFixed(2), size: plainSize });
      console.log('LRU Cache:', { time: cacheTime.toFixed(2), size: cacheSize });

      expect(cacheSize).toBe(capacity); // Bounded
      expect(plainSize).toBe(10000); // Unbounded - memory leak!
      expect(cacheTime).toBeLessThan(plainTime * 3); // Reasonable overhead
    });
  });
});
