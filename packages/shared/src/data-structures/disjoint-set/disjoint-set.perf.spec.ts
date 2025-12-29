/**
 * Performance benchmarks for Disjoint Set
 */

import { DisjointSet } from './disjoint-set';
import { DisjointSetUtils } from './disjoint-set.interface';

describe('DisjointSet Performance', () => {
  describe('Small Dataset (1K elements)', () => {
    it('should handle initialization efficiently', () => {
      const n = 1000;
      const start = performance.now();

      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      const end = performance.now();
      const time = end - start;

      expect(ds.size).toBe(n);
      expect(time).toBeLessThan(50); // Should be very fast
      console.log(`  Initialization (${n} elements): ${time.toFixed(2)}ms`);
    });

    it('should handle sequential unions efficiently', () => {
      const n = 1000;
      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      const start = performance.now();

      // Unite all elements sequentially
      for (let i = 0; i < n - 1; i++) {
        ds.union(i, i + 1);
      }

      const end = performance.now();
      const time = end - start;

      expect(ds.numSets).toBe(1);
      expect(time).toBeLessThan(20);
      console.log(`  Sequential unions (${n - 1} unions): ${time.toFixed(2)}ms`);
    });

    it('should handle find operations after unions', () => {
      const n = 1000;
      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      // Create a long chain
      for (let i = 0; i < n - 1; i++) {
        ds.union(i, i + 1);
      }

      const start = performance.now();

      // Find operations should be fast due to path compression
      for (let i = 0; i < n; i++) {
        ds.find(i);
      }

      const end = performance.now();
      const time = end - start;

      expect(time).toBeLessThan(10);
      console.log(`  Find operations (${n} finds): ${time.toFixed(2)}ms`);
    });
  });

  describe('Medium Dataset (10K elements)', () => {
    it('should handle initialization efficiently', () => {
      const n = 10000;
      const start = performance.now();

      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      const end = performance.now();
      const time = end - start;

      expect(ds.size).toBe(n);
      expect(time).toBeLessThan(100);
      console.log(`  Initialization (${n} elements): ${time.toFixed(2)}ms`);
    });

    it('should handle random unions efficiently', () => {
      const n = 10000;
      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      const start = performance.now();

      // Perform random unions
      for (let i = 0; i < n / 2; i++) {
        const a = Math.floor(Math.random() * n);
        const b = Math.floor(Math.random() * n);
        ds.union(a, b);
      }

      const end = performance.now();
      const time = end - start;

      expect(time).toBeLessThan(50);
      console.log(`  Random unions (${n / 2} unions): ${time.toFixed(2)}ms`);
    });

    it('should handle connected queries efficiently', () => {
      const n = 10000;
      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      // Create some unions
      for (let i = 0; i < n / 2; i++) {
        const a = Math.floor(Math.random() * n);
        const b = Math.floor(Math.random() * n);
        ds.union(a, b);
      }

      const start = performance.now();

      // Perform connected queries
      for (let i = 0; i < 1000; i++) {
        const a = Math.floor(Math.random() * n);
        const b = Math.floor(Math.random() * n);
        ds.connected(a, b);
      }

      const end = performance.now();
      const time = end - start;

      expect(time).toBeLessThan(20);
      console.log(`  Connected queries (1000 queries): ${time.toFixed(2)}ms`);
    });
  });

  describe('Large Dataset (100K elements)', () => {
    it('should handle initialization efficiently', () => {
      const n = 100000;
      const start = performance.now();

      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      const end = performance.now();
      const time = end - start;

      expect(ds.size).toBe(n);
      expect(time).toBeLessThan(500);
      console.log(`  Initialization (${n} elements): ${time.toFixed(2)}ms`);
    });

    it('should demonstrate path compression benefits', () => {
      const n = 100000;
      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      // Create a very long chain
      for (let i = 0; i < n - 1; i++) {
        ds.union(i, i + 1);
      }

      // First find (before compression)
      const start1 = performance.now();
      ds.find(n - 1);
      const end1 = performance.now();
      const time1 = end1 - start1;

      // Second find (after compression)
      const start2 = performance.now();
      ds.find(n - 1);
      const end2 = performance.now();
      const time2 = end2 - start2;

      console.log(`  First find (before compression): ${time1.toFixed(4)}ms`);
      console.log(`  Second find (after compression): ${time2.toFixed(4)}ms`);
      console.log(`  Speedup: ${(time1 / time2).toFixed(2)}x`);

      // Second find should be faster due to path compression
      expect(time2).toBeLessThanOrEqual(time1);
    });

    it('should handle mixed operations efficiently', () => {
      const n = 100000;
      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      const start = performance.now();

      // Mix of operations
      for (let i = 0; i < 10000; i++) {
        const op = Math.random();
        const a = Math.floor(Math.random() * n);
        const b = Math.floor(Math.random() * n);

        if (op < 0.5) {
          ds.union(a, b);
        } else if (op < 0.8) {
          ds.connected(a, b);
        } else {
          ds.find(a);
        }
      }

      const end = performance.now();
      const time = end - start;

      expect(time).toBeLessThan(200);
      console.log(`  Mixed operations (10K ops): ${time.toFixed(2)}ms`);
    });
  });

  describe('Merged Cells Use Case', () => {
    it('should handle grid cell merging efficiently', () => {
      const rows = 100;
      const cols = 100;
      const totalCells = rows * cols;

      const ds = new DisjointSet<[number, number]>({
        hashFn: DisjointSetUtils.gridHashFn,
        equalityFn: DisjointSetUtils.gridEqualityFn,
      });

      // Initialize grid
      const start1 = performance.now();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ds.makeSet([row, col]);
        }
      }
      const end1 = performance.now();
      const initTime = end1 - start1;

      expect(ds.size).toBe(totalCells);
      console.log(`  Grid initialization (${rows}x${cols}): ${initTime.toFixed(2)}ms`);

      // Merge some cells horizontally and vertically
      const start2 = performance.now();
      let mergeCount = 0;

      // Horizontal merges
      for (let row = 0; row < rows; row += 5) {
        for (let col = 0; col < cols - 2; col++) {
          ds.union([row, col], [row, col + 1]);
          mergeCount++;
        }
      }

      // Vertical merges
      for (let col = 0; col < cols; col += 5) {
        for (let row = 0; row < rows - 2; row++) {
          ds.union([row, col], [row + 1, col]);
          mergeCount++;
        }
      }

      const end2 = performance.now();
      const mergeTime = end2 - start2;

      console.log(`  Cell merging (${mergeCount} merges): ${mergeTime.toFixed(2)}ms`);

      // Query merged regions
      const start3 = performance.now();
      for (let i = 0; i < 1000; i++) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        ds.getSetSize([row, col]);
      }
      const end3 = performance.now();
      const queryTime = end3 - start3;

      console.log(`  Merge size queries (1000 queries): ${queryTime.toFixed(2)}ms`);
      expect(mergeTime).toBeLessThan(100);
      expect(queryTime).toBeLessThan(20);
    });
  });

  describe('Memory Efficiency', () => {
    it('should have reasonable memory usage', () => {
      const n = 10000;
      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      // Perform some unions
      for (let i = 0; i < n / 2; i++) {
        ds.union(i * 2, i * 2 + 1);
      }

      const stats = ds.getStats();
      const estimatedMemory = DisjointSetUtils.estimateMemory(n);

      console.log(`  Elements: ${stats.totalElements}`);
      console.log(`  Sets: ${stats.numSets}`);
      console.log(`  Estimated memory: ${(estimatedMemory / 1024).toFixed(2)} KB`);
      console.log(`  Actual memory (approx): ${(stats.memoryBytes / 1024).toFixed(2)} KB`);

      expect(stats.memoryBytes).toBeGreaterThan(0);
      expect(stats.memoryBytes).toBeLessThan(estimatedMemory * 2); // Within reasonable bounds
    });
  });

  describe('Union by Rank Efficiency', () => {
    it('should keep tree height low with union by rank', () => {
      const n = 10000;
      const ds = new DisjointSet<number>({
        initialElements: Array.from({ length: n }, (_, i) => i),
      });

      // Build a balanced structure using union by rank
      const start = performance.now();

      // Merge pairs, then pairs of pairs, etc.
      let step = 1;
      while (step < n) {
        for (let i = 0; i < n; i += step * 2) {
          if (i + step < n) {
            ds.union(i, i + step);
          }
        }
        step *= 2;
      }

      const end = performance.now();
      const time = end - start;

      expect(ds.numSets).toBe(1);
      expect(time).toBeLessThan(50);
      console.log(`  Balanced merging (${n} elements): ${time.toFixed(2)}ms`);

      // Find operations should be very fast on balanced tree
      const start2 = performance.now();
      for (let i = 0; i < n; i++) {
        ds.find(i);
      }
      const end2 = performance.now();
      const findTime = end2 - start2;

      console.log(`  Find on balanced tree (${n} finds): ${findTime.toFixed(2)}ms`);
      expect(findTime).toBeLessThan(20);
    });
  });

  describe('Amortized Complexity', () => {
    it('should demonstrate near-constant amortized time', () => {
      const sizes = [1000, 5000, 10000, 50000];
      const timesPerOp: number[] = [];

      for (const n of sizes) {
        const ds = new DisjointSet<number>({
          initialElements: Array.from({ length: n }, (_, i) => i),
        });

        const operations = n;
        const start = performance.now();

        for (let i = 0; i < operations; i++) {
          const op = Math.random();
          const a = Math.floor(Math.random() * n);
          const b = Math.floor(Math.random() * n);

          if (op < 0.7) {
            ds.union(a, b);
          } else {
            ds.find(a);
          }
        }

        const end = performance.now();
        const timePerOp = (end - start) / operations;
        timesPerOp.push(timePerOp);

        console.log(`  n=${n.toLocaleString()}: ${timePerOp.toFixed(6)}ms per operation`);
      }

      // Time per operation should not grow significantly with n
      // This demonstrates the near-constant amortized complexity
      const firstTime = timesPerOp[0];
      const lastTime = timesPerOp[timesPerOp.length - 1];
      const ratio = lastTime / firstTime;

      console.log(`  Growth ratio: ${ratio.toFixed(2)}x`);

      // Should grow very slowly (near-constant)
      expect(ratio).toBeLessThan(10);
    });
  });
});
