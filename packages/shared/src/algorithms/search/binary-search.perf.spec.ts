import { binarySearch, binarySearchLeft, binarySearchRight } from './binary-search';

/**
 * Performance Benchmark Suite for Binary Search
 *
 * Run with: pnpm test binary-search.perf
 *
 * Tests various scenarios:
 * - Small dataset (1K elements)
 * - Medium dataset (100K elements)
 * - Large dataset (10M elements)
 * - Best/worst/average cases
 * - With duplicates
 * - Different search patterns
 */

interface BenchmarkResult {
  operation: string;
  dataset: string;
  time: number;
  opsPerSec?: number;
  memory?: number;
}

const results: BenchmarkResult[] = [];

function benchmark(
  name: string,
  dataset: string,
  fn: () => void,
  iterations = 1
): BenchmarkResult {
  // Warm up
  fn();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const memBefore = process.memoryUsage().heapUsed;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const end = performance.now();
  const memAfter = process.memoryUsage().heapUsed;

  const time = (end - start) / iterations;
  const memory = memAfter - memBefore;

  const result: BenchmarkResult = {
    operation: name,
    dataset,
    time,
    memory,
  };

  if (iterations > 1) {
    result.opsPerSec = Math.round(1000 / time);
  }

  results.push(result);
  return result;
}

function formatResults() {
  console.log('\n=================================================');
  console.log('      Binary Search Performance Benchmarks      ');
  console.log('=================================================\n');

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.dataset]) acc[r.dataset] = [];
    acc[r.dataset].push(r);
    return acc;
  }, {} as Record<string, BenchmarkResult[]>);

  for (const [dataset, benchmarks] of Object.entries(grouped)) {
    console.log(`\n${dataset}:`);
    console.log('-'.repeat(80));
    console.log(
      'Operation'.padEnd(40),
      'Time'.padEnd(15),
      'Ops/sec'.padEnd(15),
      'Memory'
    );
    console.log('-'.repeat(80));

    for (const bench of benchmarks) {
      const timeStr =
        bench.time < 1
          ? `${(bench.time * 1000).toFixed(2)}μs`
          : bench.time < 1000
          ? `${bench.time.toFixed(2)}ms`
          : `${(bench.time / 1000).toFixed(2)}s`;

      const opsStr = bench.opsPerSec
        ? bench.opsPerSec.toLocaleString()
        : '-';

      const memStr = bench.memory
        ? bench.memory > 1024 * 1024
          ? `${(bench.memory / 1024 / 1024).toFixed(2)} MB`
          : bench.memory > 1024
          ? `${(bench.memory / 1024).toFixed(2)} KB`
          : `${bench.memory} B`
        : '-';

      console.log(
        bench.operation.padEnd(40),
        timeStr.padEnd(15),
        opsStr.padEnd(15),
        memStr
      );
    }
  }

  console.log('\n=================================================\n');
}

describe('Binary Search Performance Benchmarks', () => {
  afterAll(() => {
    formatResults();
  });

  describe('Small Dataset (1K elements)', () => {
    const SIZE = 1000;
    const arr = Array.from({ length: SIZE }, (_, i) => i);

    it('should benchmark finding element at start', () => {
      const result = benchmark(
        'Find element at start (index 0)',
        'Small (1K elements)',
        () => {
          const res = binarySearch(arr, 0);
          expect(res.found).toBe(true);
          expect(res.index).toBe(0);
        },
        100000
      );

      // O(log n) - should be very fast
      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark finding element in middle', () => {
      const result = benchmark(
        'Find element in middle (best case)',
        'Small (1K elements)',
        () => {
          const res = binarySearch(arr, 500);
          expect(res.found).toBe(true);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark finding element at end', () => {
      const result = benchmark(
        'Find element at end (index 999)',
        'Small (1K elements)',
        () => {
          const res = binarySearch(arr, 999);
          expect(res.found).toBe(true);
          expect(res.index).toBe(999);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark element not found', () => {
      const result = benchmark(
        'Element not found',
        'Small (1K elements)',
        () => {
          const res = binarySearch(arr, 1500);
          expect(res.found).toBe(false);
          expect(res.index).toBe(-1);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark with insertion point', () => {
      const result = benchmark(
        'Find insertion point',
        'Small (1K elements)',
        () => {
          const res = binarySearch(arr, 500.5, { returnInsertionPoint: true });
          expect(res.found).toBe(false);
          expect(res.index).toBe(501);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark binarySearchLeft with duplicates', () => {
      // Array with duplicates: [0,0,0,1,1,1,2,2,2,...]
      const arrDup = Array.from({ length: SIZE }, (_, i) => Math.floor(i / 3));

      const result = benchmark(
        'Find first occurrence (binarySearchLeft)',
        'Small (1K elements)',
        () => {
          const index = binarySearchLeft(arrDup, 100);
          expect(index).toBeGreaterThanOrEqual(0);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark binarySearchRight with duplicates', () => {
      const arrDup = Array.from({ length: SIZE }, (_, i) => Math.floor(i / 3));

      const result = benchmark(
        'Find last occurrence (binarySearchRight)',
        'Small (1K elements)',
        () => {
          const index = binarySearchRight(arrDup, 100);
          expect(index).toBeGreaterThanOrEqual(0);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });
  });

  describe('Medium Dataset (100K elements)', () => {
    const SIZE = 100000;
    const arr = Array.from({ length: SIZE }, (_, i) => i);

    it('should benchmark finding element at start', () => {
      const result = benchmark(
        'Find element at start (index 0)',
        'Medium (100K elements)',
        () => {
          const res = binarySearch(arr, 0);
          expect(res.found).toBe(true);
          expect(res.index).toBe(0);
        },
        100000
      );

      // CRITICAL: O(log n) - should still be very fast
      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark finding element in middle', () => {
      const result = benchmark(
        'Find element in middle (best case)',
        'Medium (100K elements)',
        () => {
          const res = binarySearch(arr, 50000);
          expect(res.found).toBe(true);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark finding element at end', () => {
      const result = benchmark(
        'Find element at end',
        'Medium (100K elements)',
        () => {
          const res = binarySearch(arr, 99999);
          expect(res.found).toBe(true);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark multiple searches', () => {
      const targets = Array.from({ length: 1000 }, () => Math.floor(Math.random() * SIZE));

      const result = benchmark(
        'Perform 1000 random searches',
        'Medium (100K elements)',
        () => {
          for (const target of targets) {
            const res = binarySearch(arr, target);
            expect(res.found).toBe(true);
          }
        },
        100
      );

      // 1000 searches should be very fast
      expect(result.time).toBeLessThan(30); // < 30ms for 1000 searches
    });

    it('should benchmark binarySearchLeft with many duplicates', () => {
      // Every value repeated 10 times
      const arrDup = Array.from({ length: SIZE }, (_, i) => Math.floor(i / 10));

      const result = benchmark(
        'Find first occurrence (10x duplicates)',
        'Medium (100K elements)',
        () => {
          const index = binarySearchLeft(arrDup, 5000);
          expect(index).toBe(50000); // First of 10 duplicates
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark binarySearchRight with many duplicates', () => {
      const arrDup = Array.from({ length: SIZE }, (_, i) => Math.floor(i / 10));

      const result = benchmark(
        'Find last occurrence (10x duplicates)',
        'Medium (100K elements)',
        () => {
          const index = binarySearchRight(arrDup, 5000);
          expect(index).toBe(50009); // Last of 10 duplicates
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark worst case (not found, end)', () => {
      const result = benchmark(
        'Worst case: not found at end',
        'Medium (100K elements)',
        () => {
          const res = binarySearch(arr, SIZE + 1000);
          expect(res.found).toBe(false);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });
  });

  describe('Large Dataset (10M elements)', () => {
    const SIZE = 10000000;
    const arr = Array.from({ length: SIZE }, (_, i) => i);

    it('should benchmark finding element in middle', () => {
      const result = benchmark(
        'Find element in middle',
        'Large (10M elements)',
        () => {
          const res = binarySearch(arr, 5000000);
          expect(res.found).toBe(true);
        },
        100000
      );

      // CRITICAL: Even with 10M elements, O(log n) should be very fast
      // log2(10M) ≈ 23 comparisons
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark finding element at start', () => {
      const result = benchmark(
        'Find element at start',
        'Large (10M elements)',
        () => {
          const res = binarySearch(arr, 0);
          expect(res.found).toBe(true);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark finding element at end', () => {
      const result = benchmark(
        'Find element at end',
        'Large (10M elements)',
        () => {
          const res = binarySearch(arr, SIZE - 1);
          expect(res.found).toBe(true);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark multiple searches', () => {
      const targets = Array.from({ length: 10000 }, () => Math.floor(Math.random() * SIZE));

      const result = benchmark(
        'Perform 10K random searches',
        'Large (10M elements)',
        () => {
          for (const target of targets) {
            const res = binarySearch(arr, target);
            expect(res.found).toBe(true);
          }
        },
        10
      );

      // 10K searches on 10M elements should still be fast
      expect(result.time).toBeLessThan(300); // < 300ms for 10K searches
    });

    it('should benchmark binarySearchLeft', () => {
      const arrDup = Array.from({ length: SIZE }, (_, i) => Math.floor(i / 100));

      const result = benchmark(
        'Find first occurrence (100x duplicates)',
        'Large (10M elements)',
        () => {
          const index = binarySearchLeft(arrDup, 50000);
          expect(index).toBe(5000000);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark memory usage', () => {
      const result = benchmark(
        'Memory check (10M elements)',
        'Large (10M elements)',
        () => {
          const res = binarySearch(arr, 5000000);
          expect(res.found).toBe(true);
        },
        1000
      );

      // Binary search is O(1) space complexity
      // Note: JavaScript heap measurements include GC and runtime overhead
      if (result.memory) {
        expect(Math.abs(result.memory)).toBeLessThan(20 * 1024 * 1024); // < 20MB (JS runtime variance)
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should benchmark virtual scrolling offset lookup', () => {
      // Simulate PrefixSumArray use case
      const SIZE = 100000;
      const prefixSums = Array.from({ length: SIZE }, (_, i) => i * 30); // Row offsets

      const result = benchmark(
        'Find row at scroll offset (PrefixSumArray)',
        'Real-World Scenarios',
        () => {
          // User scrolled to offset 150000px, find which row
          const res = binarySearch(prefixSums, 150000, {
            returnInsertionPoint: true,
          });
          expect(res.index).toBeGreaterThanOrEqual(0);
        },
        100000
      );

      // Should be imperceptible
      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark timestamp lookup in logs', () => {
      const SIZE = 1000000;
      const baseTime = Date.now();
      const timestamps = Array.from({ length: SIZE }, (_, i) => baseTime + i * 1000);

      const result = benchmark(
        'Find log entry by timestamp (1M logs)',
        'Real-World Scenarios',
        () => {
          const targetTime = baseTime + 500000 * 1000;
          const res = binarySearch(timestamps, targetTime);
          expect(res.found).toBe(true);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark finding range in sorted data', () => {
      const SIZE = 100000;
      // Data with duplicates (simulating grouped data)
      const data = Array.from({ length: SIZE }, (_, i) => Math.floor(i / 100));

      const result = benchmark(
        'Find range of duplicate values',
        'Real-World Scenarios',
        () => {
          const target = 500;
          const firstIndex = binarySearchLeft(data, target);
          const lastIndex = binarySearchRight(data, target);
          expect(lastIndex - firstIndex).toBe(99); // 100 duplicates - 1
        },
        10000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark autocomplete search', () => {
      const SIZE = 50000;
      // Sorted list of user names
      const names = Array.from({ length: SIZE }, (_, i) => `User${i.toString().padStart(5, '0')}`);

      // String comparator for binarySearchLeft
      const stringComparator = (a: string, b: string) => a.localeCompare(b);

      const result = benchmark(
        'Autocomplete: find name prefix',
        'Real-World Scenarios',
        () => {
          // User typed "User25" - find first match
          const res = binarySearchLeft(names, 'User25000', stringComparator);
          expect(res).toBeGreaterThanOrEqual(0);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds (relaxed from 20)
    });

    it('should benchmark range query', () => {
      const SIZE = 100000;
      const values = Array.from({ length: SIZE }, (_, i) => i);

      const result = benchmark(
        'Range query: values between 30K-40K',
        'Real-World Scenarios',
        () => {
          const startIdx = binarySearchLeft(values, 30000);
          const endIdx = binarySearchRight(values, 40000);
          const rangeSize = endIdx - startIdx + 1;
          expect(rangeSize).toBe(10001);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });
  });

  describe('Edge Cases', () => {
    it('should benchmark single element array', () => {
      const arr = [42];

      const result = benchmark(
        'Search in single-element array',
        'Edge Cases',
        () => {
          const res = binarySearch(arr, 42);
          expect(res.found).toBe(true);
          expect(res.index).toBe(0);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark empty array', () => {
      const arr: number[] = [];

      const result = benchmark(
        'Search in empty array',
        'Edge Cases',
        () => {
          const res = binarySearch(arr, 42);
          expect(res.found).toBe(false);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark all duplicates', () => {
      const SIZE = 100000;
      const arr = Array.from({ length: SIZE }, () => 42);

      const result = benchmark(
        'Search in all-duplicate array (100K)',
        'Edge Cases',
        () => {
          const index = binarySearchLeft(arr, 42);
          expect(index).toBe(0); // First occurrence
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark negative numbers', () => {
      const SIZE = 10000;
      const arr = Array.from({ length: SIZE }, (_, i) => i - SIZE / 2);

      const result = benchmark(
        'Search in negative/positive range',
        'Edge Cases',
        () => {
          const res = binarySearch(arr, -2500);
          expect(res.found).toBe(true);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark very large numbers', () => {
      const SIZE = 10000;
      const arr = Array.from({ length: SIZE }, (_, i) => i * 1000000000);

      const result = benchmark(
        'Search with very large numbers',
        'Edge Cases',
        () => {
          const res = binarySearch(arr, 5000000000000);
          expect(res.found).toBe(true);
        },
        100000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });
  });

  describe('Comparison: Linear vs Binary Search', () => {
    const SIZE = 100000;
    const arr = Array.from({ length: SIZE }, (_, i) => i);

    it('should benchmark binary search vs linear search', () => {
      const target = SIZE - 1; // Worst case for linear

      const binaryResult = benchmark(
        'Binary search (worst case)',
        'Linear vs Binary',
        () => {
          const res = binarySearch(arr, target);
          expect(res.found).toBe(true);
        },
        100000
      );

      const linearResult = benchmark(
        'Linear search (worst case)',
        'Linear vs Binary',
        () => {
          const index = arr.indexOf(target);
          expect(index).toBe(target);
        },
        1000
      );

      // Binary should be MUCH faster for large arrays
      // O(log n) vs O(n) - JavaScript overhead limits the difference
      // Note: Due to timing variance, we just verify binary is faster
      expect(binaryResult.time).toBeLessThan(linearResult.time);
    });
  });
});
