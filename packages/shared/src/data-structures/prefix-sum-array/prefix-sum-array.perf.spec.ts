import { PrefixSumArray } from './prefix-sum-array';

/**
 * Performance Benchmark Suite for PrefixSumArray
 *
 * Run with: pnpm test prefix-sum-array.perf
 *
 * Tests various scenarios:
 * - Small dataset (1K elements)
 * - Medium dataset (100K elements)
 * - Large dataset (1M elements)
 * - Virtual scrolling scenarios
 * - Update performance
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
  console.log('      PrefixSumArray Performance Benchmarks     ');
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

describe('PrefixSumArray Performance Benchmarks', () => {
  afterAll(() => {
    formatResults();
  });

  describe('Small Dataset (1K elements)', () => {
    const SIZE = 1000;

    it('should benchmark creation', () => {
      const values = Array.from({ length: SIZE }, () => 30); // Uniform row heights

      const result = benchmark(
        'Create (1K uniform values)',
        'Small (1K elements)',
        () => {
          const psa = new PrefixSumArray({ values });
          expect(psa.length).toBe(SIZE);
        },
        1000
      );

      expect(result.time).toBeLessThan(1);
    });

    it('should benchmark creation with variable heights', () => {
      const values = Array.from({ length: SIZE }, () => 20 + Math.random() * 40);

      const result = benchmark(
        'Create (1K variable values)',
        'Small (1K elements)',
        () => {
          const psa = new PrefixSumArray({ values });
          expect(psa.length).toBe(SIZE);
        },
        1000
      );

      expect(result.time).toBeLessThan(1);
    });

    it('should benchmark getOffset', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'getOffset (single)',
        'Small (1K elements)',
        () => {
          const offset = psa.getOffset(500);
          expect(offset).toBe(500 * 30);
        },
        100000
      );

      // Should be O(1) - array access
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark getRangeSum', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'getRangeSum (100 elements)',
        'Small (1K elements)',
        () => {
          const sum = psa.getRangeSum(100, 200);
          expect(sum).toBe(100 * 30);
        },
        100000
      );

      // Should be O(1) - two array accesses
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark findIndexAtOffset', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'findIndexAtOffset (binary search)',
        'Small (1K elements)',
        () => {
          const index = psa.findIndexAtOffset(15000); // Offset in middle
          expect(index).toBe(500);
        },
        10000
      );

      // Binary search: O(log n)
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark update', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'update (single element)',
        'Small (1K elements)',
        () => {
          psa.update(500, 60);
        },
        1000
      );

      // Update is O(n) worst case, but for 1K elements should be fast
      expect(result.time).toBeLessThan(0.5);
    });
  });

  describe('Medium Dataset (100K elements)', () => {
    const SIZE = 100000;

    it('should benchmark creation', () => {
      const values = Array.from({ length: SIZE }, () => 30);

      const result = benchmark(
        'Create (100K uniform)',
        'Medium (100K elements)',
        () => {
          const psa = new PrefixSumArray({ values });
          expect(psa.length).toBe(SIZE);
        },
        10
      );

      expect(result.time).toBeLessThan(50); // < 50ms for 100K elements
    });

    it('should benchmark creation with variable values', () => {
      const values = Array.from({ length: SIZE }, () => 20 + Math.random() * 40);

      const result = benchmark(
        'Create (100K variable)',
        'Medium (100K elements)',
        () => {
          const psa = new PrefixSumArray({ values });
          expect(psa.length).toBe(SIZE);
        },
        10
      );

      expect(result.time).toBeLessThan(100); // Random generation takes time
    });

    it('should benchmark single getOffset', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'getOffset (single)',
        'Medium (100K elements)',
        () => {
          const offset = psa.getOffset(50000);
          expect(offset).toBe(50000 * 30);
        },
        100000
      );

      // CRITICAL: O(1) even with 100K elements
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark bulk getOffset (1K lookups)', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Bulk getOffset (1K lookups)',
        'Medium (100K elements)',
        () => {
          for (let i = 0; i < 1000; i++) {
            const offset = psa.getOffset(i * 100);
            expect(offset).toBe(i * 100 * 30);
          }
        },
        100
      );

      expect(result.time).toBeLessThan(35); // < 35ms for 1000 lookups
    });

    it('should benchmark findIndexAtOffset', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'findIndexAtOffset (binary search)',
        'Medium (100K elements)',
        () => {
          const index = psa.findIndexAtOffset(1500000); // Middle
          expect(index).toBe(50000);
        },
        10000
      );

      // Binary search: O(log 100K) ≈ 17 comparisons
      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark sequential findIndexAtOffset', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Sequential findIndexAtOffset (100x)',
        'Medium (100K elements)',
        () => {
          for (let i = 0; i < 100; i++) {
            const offset = i * 30000; // Every 1000 rows
            const index = psa.findIndexAtOffset(offset);
            expect(index).toBeGreaterThanOrEqual(0);
          }
        },
        100
      );

      expect(result.time).toBeLessThan(5);
    });

    it('should benchmark update at beginning', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Update at beginning',
        'Medium (100K elements)',
        () => {
          psa.update(0, 60);
        }
      );

      // Worst case: O(n) - must update all subsequent sums
      expect(result.time).toBeLessThan(5);
    });

    it('should benchmark update at end', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Update at end',
        'Medium (100K elements)',
        () => {
          psa.update(SIZE - 1, 60);
        },
        1000
      );

      // Best case: O(1) - only one sum to update
      expect(result.time).toBeLessThan(0.1);
    });

    it('should benchmark push', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Push (append)',
        'Medium (100K elements)',
        () => {
          psa.push(40);
          psa.pop(); // Reset for next iteration
        },
        10000
      );

      // Push is O(1)
      expect(result.time).toBeLessThan(0.05);
    });

    it('should benchmark getRangeSum', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'getRangeSum (1K elements)',
        'Medium (100K elements)',
        () => {
          const sum = psa.getRangeSum(10000, 11000);
          expect(sum).toBe(1000 * 30);
        },
        100000
      );

      // O(1) - two array accesses
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });
  });

  describe('Large Dataset (1M elements)', () => {
    const SIZE = 1000000;

    it('should benchmark creation', () => {
      const values = Array.from({ length: SIZE }, () => 30);

      const result = benchmark(
        'Create (1M uniform)',
        'Large (1M elements)',
        () => {
          const psa = new PrefixSumArray({ values });
          expect(psa.length).toBe(SIZE);
        }
      );

      expect(result.time).toBeLessThan(500); // < 500ms for 1M elements
    });

    it('should benchmark single getOffset', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'getOffset (single)',
        'Large (1M elements)',
        () => {
          const offset = psa.getOffset(500000);
          expect(offset).toBe(500000 * 30);
        },
        100000
      );

      // CRITICAL: O(1) even with 1M elements
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark findIndexAtOffset', () => {
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'findIndexAtOffset',
        'Large (1M elements)',
        () => {
          const index = psa.findIndexAtOffset(15000000); // Middle
          expect(index).toBe(500000);
        },
        10000
      );

      // Binary search: O(log 1M) ≈ 20 comparisons
      expect(result.time).toBeLessThan(0.15); // < 150 microseconds
    });

    it('should benchmark memory usage', () => {
      const values = Array.from({ length: SIZE }, () => 30);

      const result = benchmark(
        'Memory for 1M elements',
        'Large (1M elements)',
        () => {
          const psa = new PrefixSumArray({ values });
          expect(psa.length).toBe(SIZE);
        }
      );

      // Two arrays: values (8MB) + sums (8MB) = ~16MB
      if (result.memory) {
        expect(result.memory).toBeLessThan(30 * 1024 * 1024); // < 30MB
      }
    });
  });

  describe('Virtual Scrolling Scenarios', () => {
    it('should benchmark scrolling simulation (10K rows)', () => {
      const SIZE = 10000;
      // Variable row heights: 20-60px
      const values = Array.from({ length: SIZE }, () => 20 + Math.random() * 40);
      const psa = new PrefixSumArray({ values });

      const VIEWPORT_HEIGHT = 600; // 600px viewport
      let scrollOffset = 0;

      const result = benchmark(
        'Scroll through 10K rows',
        'Virtual Scrolling',
        () => {
          // Simulate scrolling down 100px
          scrollOffset += 100;
          const startRow = psa.findIndexAtOffset(scrollOffset);
          const endOffset = scrollOffset + VIEWPORT_HEIGHT;
          const endRow = psa.findIndexAtOffset(endOffset);

          expect(endRow).toBeGreaterThan(startRow);

          // Reset for next iteration
          if (scrollOffset >= psa.total - VIEWPORT_HEIGHT) {
            scrollOffset = 0;
          }
        },
        10000
      );

      // Each scroll should be imperceptible
      expect(result.time).toBeLessThan(0.5); // < 0.5ms per scroll
    });

    it('should benchmark viewport rendering (100K rows)', () => {
      const SIZE = 100000;
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const VIEWPORT_HEIGHT = 600;
      const ROW_HEIGHT = 30;
      const VISIBLE_ROWS = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);

      const result = benchmark(
        'Render viewport (20 visible rows)',
        'Virtual Scrolling',
        () => {
          // User scrolled to middle
          const scrollOffset = psa.total / 2;
          const startRow = psa.findIndexAtOffset(scrollOffset);
          const endRow = startRow + VISIBLE_ROWS;

          // Calculate position of each visible row
          for (let row = startRow; row < endRow; row++) {
            const yOffset = psa.getOffset(row);
            expect(yOffset).toBeGreaterThanOrEqual(0);
          }
        },
        1000
      );

      // Viewport rendering should be fast
      expect(result.time).toBeLessThan(1); // < 1ms
    });

    it('should benchmark jump to row (100K rows)', () => {
      const SIZE = 100000;
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Jump to specific row',
        'Virtual Scrolling',
        () => {
          // Jump to row 75000
          const offset = psa.getOffset(75000);
          const verifyRow = psa.findIndexAtOffset(offset);
          expect(verifyRow).toBe(75000);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.2);
    });

    it('should benchmark row resize during scroll', () => {
      const SIZE = 10000;
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Resize row during scroll',
        'Virtual Scrolling',
        () => {
          // User resizes a row in the middle
          psa.update(5000, 60);

          // Find new scroll position
          const scrollOffset = 150000;
          const row = psa.findIndexAtOffset(scrollOffset);
          expect(row).toBeGreaterThanOrEqual(0);

          // Reset
          psa.update(5000, 30);
        },
        100
      );

      expect(result.time).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should benchmark all zero values', () => {
      const SIZE = 10000;
      const values = Array.from({ length: SIZE }, () => 0);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'All zero values',
        'Edge Cases',
        () => {
          const total = psa.total;
          const index = psa.findIndexAtOffset(0);
          expect(total).toBe(0);
          expect(index).toBe(0);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.1);
    });

    it('should benchmark very large values', () => {
      const SIZE = 10000;
      const values = Array.from({ length: SIZE }, () => 1000000); // 1M pixels per row
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Very large values',
        'Edge Cases',
        () => {
          const offset = psa.getOffset(5000);
          expect(offset).toBe(5000000000); // 5 billion
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05);
    });

    it('should benchmark mixed small and large values', () => {
      const SIZE = 10000;
      const values = Array.from({ length: SIZE }, (_, i) =>
        i % 100 === 0 ? 1000 : 20
      ); // Occasional large rows
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Mixed small/large values',
        'Edge Cases',
        () => {
          // Find position of large row
          const offset = psa.getOffset(500);
          expect(offset).toBeGreaterThan(0);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05);
    });

    it('should benchmark sequential updates', () => {
      const SIZE = 1000;
      const values = Array.from({ length: SIZE }, () => 30);
      const psa = new PrefixSumArray({ values });

      const result = benchmark(
        'Sequential updates (100x)',
        'Edge Cases',
        () => {
          // Update 100 consecutive rows
          for (let i = 0; i < 100; i++) {
            psa.update(i, 40);
          }
          // Reset
          for (let i = 0; i < 100; i++) {
            psa.update(i, 30);
          }
        },
        10
      );

      expect(result.time).toBeLessThan(50);
    });
  });
});
