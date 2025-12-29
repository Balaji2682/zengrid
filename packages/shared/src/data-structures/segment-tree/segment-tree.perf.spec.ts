import { SegmentTree } from './segment-tree';
import { AggregationType } from './segment-tree.interface';

/**
 * Performance Benchmark Suite for SegmentTree
 *
 * Run with: pnpm test segment-tree.perf
 *
 * Tests various scenarios:
 * - Small dataset (1K elements)
 * - Medium dataset (100K elements)
 * - Large dataset (1M elements)
 * - Different aggregation types
 * - Query vs Update performance
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
  console.log('       SegmentTree Performance Benchmarks       ');
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

describe('SegmentTree Performance Benchmarks', () => {
  afterAll(() => {
    formatResults();
  });

  describe('Small Dataset (1K elements)', () => {
    const SIZE = 1000;
    const values = Array.from({ length: SIZE }, (_, i) => i + 1);

    it('should benchmark tree construction (SUM)', () => {
      const result = benchmark('Build tree (SUM)', 'Small (1K)', () => {
        const tree = new SegmentTree({
          values,
          type: AggregationType.SUM,
        });
        expect(tree.size).toBe(SIZE);
      });

      expect(result.time).toBeLessThan(10); // < 10ms
    });

    it('should benchmark tree construction (MIN)', () => {
      const result = benchmark('Build tree (MIN)', 'Small (1K)', () => {
        const tree = new SegmentTree({
          values,
          type: AggregationType.MIN,
        });
        expect(tree.size).toBe(SIZE);
      });

      expect(result.time).toBeLessThan(10);
    });

    it('should benchmark range query (SUM)', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Range query (full range)',
        'Small (1K)',
        () => {
          const sum = tree.query(0, SIZE - 1);
          expect(sum).toBe((SIZE * (SIZE + 1)) / 2);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark point query', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Point query (single element)',
        'Small (1K)',
        () => {
          const val = tree.get(500);
          expect(val).toBe(501);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark point update', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Point update',
        'Small (1K)',
        () => {
          tree.update(500, 1000);
        },
        1000
      );

      expect(result.time).toBeLessThan(0.5); // < 500 microseconds
    });

    it('should benchmark range update (lazy)', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
        lazy: true,
      });

      const result = benchmark(
        'Range update (lazy)',
        'Small (1K)',
        () => {
          tree.rangeUpdate(100, 500, 10);
        },
        100
      );

      expect(result.time).toBeLessThan(1); // < 1ms
    });
  });

  describe('Medium Dataset (100K elements)', () => {
    const SIZE = 100000;
    const values = Array.from({ length: SIZE }, (_, i) => i + 1);

    it('should benchmark tree construction (SUM)', () => {
      const result = benchmark('Build tree (SUM)', 'Medium (100K)', () => {
        const tree = new SegmentTree({
          values,
          type: AggregationType.SUM,
        });
        expect(tree.size).toBe(SIZE);
      });

      expect(result.time).toBeLessThan(500); // < 500ms
    });

    it('should benchmark tree construction (MIN)', () => {
      const result = benchmark('Build tree (MIN)', 'Medium (100K)', () => {
        const tree = new SegmentTree({
          values,
          type: AggregationType.MIN,
        });
        expect(tree.size).toBe(SIZE);
      });

      expect(result.time).toBeLessThan(500);
    });

    it('should benchmark tree construction (MAX)', () => {
      const result = benchmark('Build tree (MAX)', 'Medium (100K)', () => {
        const tree = new SegmentTree({
          values,
          type: AggregationType.MAX,
        });
        expect(tree.size).toBe(SIZE);
      });

      expect(result.time).toBeLessThan(500);
    });

    it('should benchmark range query (full range)', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Range query (full range)',
        'Medium (100K)',
        () => {
          const sum = tree.query(0, SIZE - 1);
          expect(sum).toBeGreaterThan(0);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark range query (partial range)', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Range query (10% range)',
        'Medium (100K)',
        () => {
          const sum = tree.query(10000, 20000);
          expect(sum).toBeGreaterThan(0);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark point update', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Point update',
        'Medium (100K)',
        () => {
          tree.update(50000, 10000);
        },
        1000
      );

      expect(result.time).toBeLessThan(0.5); // < 500 microseconds
    });

    it('should benchmark range update (lazy)', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
        lazy: true,
      });

      const result = benchmark(
        'Range update (10% range, lazy)',
        'Medium (100K)',
        () => {
          tree.rangeUpdate(10000, 20000, 100);
        },
        100
      );

      expect(result.time).toBeLessThan(2); // < 2ms
    });

    it('should benchmark MIN queries', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.MIN,
      });

      const result = benchmark(
        'MIN query (10% range)',
        'Medium (100K)',
        () => {
          const min = tree.query(20000, 30000);
          expect(min).toBe(20001);
        },
        1000
      );

      expect(result.time).toBeLessThan(0.1);
    });

    it('should benchmark MAX queries', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.MAX,
      });

      const result = benchmark(
        'MAX query (10% range)',
        'Medium (100K)',
        () => {
          const max = tree.query(20000, 30000);
          expect(max).toBe(30001);
        },
        1000
      );

      expect(result.time).toBeLessThan(0.1);
    });
  });

  describe('Large Dataset (1M elements)', () => {
    const SIZE = 1000000;
    const values = Array.from({ length: SIZE }, (_, i) => i + 1);

    it('should benchmark tree construction (SUM)', () => {
      const result = benchmark('Build tree (SUM)', 'Large (1M)', () => {
        const tree = new SegmentTree({
          values,
          type: AggregationType.SUM,
        });
        expect(tree.size).toBe(SIZE);
      });

      expect(result.time).toBeLessThan(5000); // < 5s
    });

    it('should benchmark range query (full range)', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Range query (full range)',
        'Large (1M)',
        () => {
          const sum = tree.query(0, SIZE - 1);
          expect(sum).toBeGreaterThan(0);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark range query (1% range)', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Range query (1% range)',
        'Large (1M)',
        () => {
          const sum = tree.query(100000, 110000);
          expect(sum).toBeGreaterThan(0);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.1); // < 100 microseconds
    });

    it('should benchmark point update', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Point update',
        'Large (1M)',
        () => {
          tree.update(500000, 100000);
        },
        1000
      );

      expect(result.time).toBeLessThan(1); // < 1ms
    });
  });

  describe('Query Pattern Comparisons', () => {
    const SIZE = 10000;
    const values = Array.from({ length: SIZE }, (_, i) => i + 1);

    it('should benchmark many small queries', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        '1000 small range queries',
        'Query Patterns',
        () => {
          for (let i = 0; i < 1000; i++) {
            const start = i % (SIZE - 10);
            tree.query(start, start + 10);
          }
        }
      );

      expect(result.time).toBeLessThan(20); // < 20ms for 1000 queries
    });

    it('should benchmark alternating query/update', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        '500 alternating query/update',
        'Query Patterns',
        () => {
          for (let i = 0; i < 500; i++) {
            tree.query(i % SIZE, (i + 100) % SIZE);
            tree.update(i % SIZE, i);
          }
        }
      );

      expect(result.time).toBeLessThan(50); // < 50ms
    });

    it('should benchmark nested range queries', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        '100 nested range queries',
        'Query Patterns',
        () => {
          for (let size = 10; size < 1000; size += 10) {
            tree.query(0, size);
          }
        }
      );

      expect(result.time).toBeLessThan(10);
    });
  });

  describe('Status Bar Use Cases', () => {
    it('should benchmark selection aggregations', () => {
      const SIZE = 100000;
      const cellValues = Array.from({ length: SIZE }, () =>
        Math.floor(Math.random() * 1000)
      );
      const tree = new SegmentTree({
        values: cellValues,
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Status bar sum (1000 selections)',
        'Status Bar Use Cases',
        () => {
          // Simulate 1000 different selection changes
          for (let i = 0; i < 1000; i++) {
            const start = Math.floor(Math.random() * (SIZE - 100));
            const end = start + Math.floor(Math.random() * 100);
            tree.query(start, end);
          }
        }
      );

      expect(result.time).toBeLessThan(50); // < 50ms for 1000 queries
    });

    it('should benchmark min/max for selected range', () => {
      const SIZE = 50000;
      const values = Array.from({ length: SIZE }, () =>
        Math.floor(Math.random() * 10000)
      );
      const minTree = new SegmentTree({
        values,
        type: AggregationType.MIN,
      });
      const maxTree = new SegmentTree({
        values,
        type: AggregationType.MAX,
      });

      const result = benchmark(
        'Min/Max queries (500 each)',
        'Status Bar Use Cases',
        () => {
          for (let i = 0; i < 500; i++) {
            const start = Math.floor(Math.random() * (SIZE - 1000));
            const end = start + 1000;
            minTree.query(start, end);
            maxTree.query(start, end);
          }
        }
      );

      expect(result.time).toBeLessThan(50); // < 50ms for 1000 queries
    });

    it('should benchmark dynamic cell updates', () => {
      const SIZE = 10000;
      const tree = new SegmentTree({
        values: Array(SIZE).fill(100),
        type: AggregationType.SUM,
      });

      const result = benchmark(
        'Cell edit + query (100 edits)',
        'Status Bar Use Cases',
        () => {
          for (let i = 0; i < 100; i++) {
            tree.update(i, 200);
            tree.query(0, SIZE - 1); // Get new total
          }
        }
      );

      expect(result.time).toBeLessThan(20); // < 20ms
    });
  });

  describe('Lazy Propagation Performance', () => {
    const SIZE = 50000;
    const values = Array.from({ length: SIZE }, (_, i) => i + 1);

    it('should benchmark lazy vs non-lazy range updates', () => {
      const lazyTree = new SegmentTree({
        values: [...values],
        type: AggregationType.SUM,
        lazy: true,
      });

      const lazyResult = benchmark(
        'Range update WITH lazy',
        'Lazy Propagation',
        () => {
          lazyTree.rangeUpdate(1000, 10000, 50);
        },
        100
      );

      const nonLazyTree = new SegmentTree({
        values: [...values],
        type: AggregationType.SUM,
        lazy: false,
      });

      const nonLazyResult = benchmark(
        'Range update WITHOUT lazy',
        'Lazy Propagation',
        () => {
          nonLazyTree.rangeUpdate(1000, 10000, 50);
        },
        10
      );

      // Lazy should be significantly faster for large range updates
      expect(lazyResult.time).toBeLessThan(nonLazyResult.time);
      expect(result.time).toBeLessThan(5); // < 5ms with lazy
    });

    it('should benchmark multiple range updates with lazy', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
        lazy: true,
      });

      const result = benchmark(
        'Multiple range updates (50)',
        'Lazy Propagation',
        () => {
          for (let i = 0; i < 50; i++) {
            const start = i * 1000;
            const end = start + 500;
            tree.rangeUpdate(start, Math.min(end, SIZE - 1), 10);
          }
        }
      );

      expect(result.time).toBeLessThan(50); // < 50ms
    });

    it('should benchmark query after lazy updates', () => {
      const tree = new SegmentTree({
        values,
        type: AggregationType.SUM,
        lazy: true,
      });

      // Apply some lazy updates
      tree.rangeUpdate(1000, 10000, 100);
      tree.rangeUpdate(5000, 15000, 50);

      const result = benchmark(
        'Query after lazy updates',
        'Lazy Propagation',
        () => {
          tree.query(0, SIZE - 1);
        },
        1000
      );

      expect(result.time).toBeLessThan(0.5); // < 500 microseconds
    });
  });

  describe('Memory Efficiency', () => {
    it('should measure memory for small tree', () => {
      const SIZE = 1000;
      const result = benchmark(
        'Memory: 1K elements',
        'Memory Efficiency',
        () => {
          const tree = new SegmentTree({
            values: Array(SIZE).fill(1),
            type: AggregationType.SUM,
          });
          expect(tree.size).toBe(SIZE);
        }
      );

      // Tree should use O(4n) space
      // For 1K numbers: ~4K numbers × 8 bytes = ~32KB
      expect(result.memory).toBeLessThan(100 * 1024); // < 100KB
    });

    it('should measure memory for large tree', () => {
      const SIZE = 100000;
      const result = benchmark(
        'Memory: 100K elements',
        'Memory Efficiency',
        () => {
          const tree = new SegmentTree({
            values: Array(SIZE).fill(1),
            type: AggregationType.SUM,
          });
          expect(tree.size).toBe(SIZE);
        }
      );

      // Tree should use O(4n) space
      // For 100K numbers: ~400K numbers × 8 bytes = ~3.2MB
      expect(result.memory).toBeLessThan(10 * 1024 * 1024); // < 10MB
    });
  });
});
