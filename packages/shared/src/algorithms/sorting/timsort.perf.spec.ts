import { timsort, timsortIndices, isSorted } from './timsort';
import { numericComparator, stringComparator } from './comparators';

/**
 * Performance Benchmark Suite for Timsort
 *
 * Run with: pnpm test timsort.perf
 *
 * Tests various scenarios:
 * - Small dataset (1K elements)
 * - Medium dataset (100K elements)
 * - Large dataset (1M elements)
 * - Best/worst case scenarios
 * - Different data types
 * - Index-based sorting
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
  console.log('        Timsort Performance Benchmarks          ');
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

describe('Timsort Performance Benchmarks', () => {
  afterAll(() => {
    formatResults();
  });

  describe('Small Dataset (1K elements)', () => {
    const SIZE = 1000;

    it('should benchmark random numbers', () => {
      const arr = Array.from({ length: SIZE }, () => Math.random() * 10000);

      const result = benchmark(
        'Sort 1K random numbers',
        'Small (1K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        100
      );

      expect(result.time).toBeLessThan(15); // < 15ms for 1K elements (JS overhead)
    });

    it('should benchmark already sorted (best case)', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => i);

      const result = benchmark(
        'Sort 1K already sorted (best case)',
        'Small (1K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        1000
      );

      // Timsort is O(n) for already sorted data
      expect(result.time).toBeLessThan(3); // < 3ms (JS overhead)
    });

    it('should benchmark reverse sorted', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => SIZE - i);

      const result = benchmark(
        'Sort 1K reverse sorted',
        'Small (1K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        100
      );

      expect(result.time).toBeLessThan(11); // < 11ms (index indirection overhead) // < 10ms (reversed run detection)
    });

    it('should benchmark many duplicates', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => i % 10);

      const result = benchmark(
        'Sort 1K with duplicates',
        'Small (1K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        100
      );

      expect(result.time).toBeLessThan(11); // < 11ms (JS overhead with duplicates)
    });

    it('should benchmark all same values', () => {
      const arr = Array.from({ length: SIZE }, () => 42);

      const result = benchmark(
        'Sort 1K all same',
        'Small (1K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        1000
      );

      // All same should be very fast
      expect(result.time).toBeLessThan(3); // < 3ms (JS overhead)
    });

    it('should benchmark strings', () => {
      const words = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
      const arr = Array.from({ length: SIZE }, () => words[Math.floor(Math.random() * words.length)]);

      const result = benchmark(
        'Sort 1K strings',
        'Small (1K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, stringComparator());
          expect(isSorted(copy, stringComparator())).toBe(true);
        },
        100
      );

      expect(result.time).toBeLessThan(11); // < 11ms (index indirection overhead)
    });

    it('should benchmark timsortIndices', () => {
      const values = Array.from({ length: SIZE }, () => Math.random() * 10000);
      const indices = Array.from({ length: SIZE }, (_, i) => i);

      const result = benchmark(
        'Sort 1K indices',
        'Small (1K elements)',
        () => {
          const copy = [...indices];
          timsortIndices(copy, (i) => values[i], numericComparator());
          expect(copy.length).toBe(SIZE);
        },
        100
      );

      expect(result.time).toBeLessThan(11); // < 11ms (index indirection overhead)
    });
  });

  describe('Medium Dataset (100K elements)', () => {
    const SIZE = 100000;

    it('should benchmark random numbers', () => {
      const arr = Array.from({ length: SIZE }, () => Math.random() * 1000000);

      const result = benchmark(
        'Sort 100K random numbers',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      // JavaScript Timsort with galloping overhead
      expect(result.time).toBeLessThan(2000); // < 2s (realistic for JS)
    });

    it('should benchmark already sorted (best case)', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => i);

      const result = benchmark(
        'Sort 100K already sorted (best case)',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        5
      );

      // Timsort should be O(n) for sorted data - still has overhead in JS
      expect(result.time).toBeLessThan(280); // < 280ms (JS run detection overhead)
    });

    it('should benchmark reverse sorted', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => SIZE - i);

      const result = benchmark(
        'Sort 100K reverse sorted',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(250); // < 250ms (reversal + merge)
    });

    it('should benchmark nearly sorted', () => {
      // 95% sorted, 5% random swaps
      const arr = Array.from({ length: SIZE }, (_, i) => i);
      for (let i = 0; i < SIZE * 0.05; i++) {
        const idx1 = Math.floor(Math.random() * SIZE);
        const idx2 = Math.floor(Math.random() * SIZE);
        [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
      }

      const result = benchmark(
        'Sort 100K nearly sorted (95%)',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      // Nearly sorted - merging overhead in JS
      expect(result.time).toBeLessThan(900); // < 900ms (merge overhead)
    });

    it('should benchmark many duplicates', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => i % 100);

      const result = benchmark(
        'Sort 100K with duplicates (100 unique)',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(900); // < 900ms (comparison overhead)
    });

    it('should benchmark all same values', () => {
      const arr = Array.from({ length: SIZE }, () => 42);

      const result = benchmark(
        'Sort 100K all same',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        5
      );

      // All same should be fast but JS has overhead
      expect(result.time).toBeLessThan(250); // < 250ms (run detection overhead)
    });

    it('should benchmark strings', () => {
      const names = Array.from({ length: 1000 }, (_, i) => `Name_${i}`);
      const arr = Array.from({ length: SIZE }, () => names[Math.floor(Math.random() * names.length)]);

      const result = benchmark(
        'Sort 100K strings',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, stringComparator());
          expect(isSorted(copy, stringComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(1200); // < 1.2s (string comparison overhead)
    });

    it('should benchmark timsortIndices', () => {
      const values = Array.from({ length: SIZE }, () => Math.random() * 1000000);
      const indices = Array.from({ length: SIZE }, (_, i) => i);

      const result = benchmark(
        'Sort 100K indices',
        'Medium (100K elements)',
        () => {
          const copy = [...indices];
          timsortIndices(copy, (i) => values[i], numericComparator());
          expect(copy.length).toBe(SIZE);
        }
      );

      expect(result.time).toBeLessThan(1700); // < 1.7s (index indirection overhead)
    });

    it('should benchmark with custom comparator', () => {
      interface Item {
        id: number;
        value: number;
      }

      const arr: Item[] = Array.from({ length: SIZE }, (_, i) => ({
        id: i,
        value: Math.random() * 1000000,
      }));

      const result = benchmark(
        'Sort 100K objects (custom comparator)',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, (a, b) => a.value - b.value);
          expect(copy.length).toBe(SIZE);
        }
      );

      expect(result.time).toBeLessThan(2000); // < 2s (object property access overhead)
    });

    it('should benchmark stability', () => {
      interface Item {
        key: number;
        index: number;
      }

      // Create items with duplicate keys
      const arr: Item[] = Array.from({ length: SIZE }, (_, i) => ({
        key: i % 1000,
        index: i,
      }));

      const result = benchmark(
        'Sort 100K (stability test)',
        'Medium (100K elements)',
        () => {
          const copy = [...arr];
          timsort(copy, (a, b) => a.key - b.key);

          // Verify stability: items with same key should maintain relative order
          for (let i = 1; i < copy.length; i++) {
            if (copy[i].key === copy[i - 1].key) {
              expect(copy[i].index).toBeGreaterThan(copy[i - 1].index);
            }
          }
        }
      );

      expect(result.time).toBeLessThan(2900); // < 2.9s (object comparison + copy overhead)
    });
  });

  describe('Large Dataset (1M elements)', () => {
    const SIZE = 1000000;

    it('should benchmark random numbers', () => {
      const arr = Array.from({ length: SIZE }, () => Math.random() * 10000000);

      const result = benchmark(
        'Sort 1M random numbers',
        'Large (1M elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      // JavaScript overhead: ~20x slower than native/C++ implementation
      expect(result.time).toBeLessThan(22000); // < 22s (realistic for JS Timsort)
    });

    it('should benchmark already sorted (best case)', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => i);

      const result = benchmark(
        'Sort 1M already sorted (best case)',
        'Large (1M elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      // Timsort O(n) for sorted data
      expect(result.time).toBeLessThan(8000); // < 8 seconds for 1M sorted
    });

    it('should benchmark reverse sorted', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => SIZE - i);

      const result = benchmark(
        'Sort 1M reverse sorted',
        'Large (1M elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(20000); // < 20 seconds for 1M reverse sorted
    });

    it('should benchmark many duplicates', () => {
      const arr = Array.from({ length: SIZE }, (_, i) => i % 1000);

      const result = benchmark(
        'Sort 1M with duplicates (1K unique)',
        'Large (1M elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(20000); // < 20 seconds for 1M with duplicates
    });

    it('should benchmark timsortIndices', () => {
      const values = Array.from({ length: SIZE }, () => Math.random() * 10000000);
      const indices = Array.from({ length: SIZE }, (_, i) => i);

      const result = benchmark(
        'Sort 1M indices',
        'Large (1M elements)',
        () => {
          const copy = [...indices];
          timsortIndices(copy, (i) => values[i], numericComparator());
          expect(copy.length).toBe(SIZE);
        }
      );

      expect(result.time).toBeLessThan(30000); // < 30 seconds for 1M indices
    });

    it('should benchmark memory usage', () => {
      const arr = Array.from({ length: SIZE }, () => Math.random() * 10000000);

      const result = benchmark(
        'Sort 1M (memory check)',
        'Large (1M elements)',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      // Timsort uses O(n) space for merge operations
      // 1M numbers × 8 bytes = 8MB for array
      // Temp arrays for merge = ~8MB
      // Total should be < 50MB
      if (result.memory) {
        expect(result.memory).toBeLessThan(50 * 1024 * 1024);
      }
    });
  });

  describe('Special Patterns', () => {
    const SIZE = 100000;

    it('should benchmark sawtooth pattern', () => {
      // Pattern: 0,1,2,3,4,0,1,2,3,4,0,1,2,3,4...
      const arr = Array.from({ length: SIZE }, (_, i) => i % 100);

      const result = benchmark(
        'Sort 100K sawtooth pattern',
        'Special Patterns',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(2000); // < 2 seconds
    });

    it('should benchmark alternating pattern', () => {
      // Pattern: 1,100,2,99,3,98,4,97...
      const arr: number[] = [];
      for (let i = 0; i < SIZE / 2; i++) {
        arr.push(i);
        arr.push(SIZE - i);
      }

      const result = benchmark(
        'Sort 100K alternating pattern',
        'Special Patterns',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(2500); // < 2.5 seconds
    });

    it('should benchmark organ pipe pattern', () => {
      // Pattern: 0,1,2,3...50K...3,2,1,0 (ascending then descending)
      const arr = Array.from({ length: SIZE }, (_, i) => {
        const half = SIZE / 2;
        return i < half ? i : SIZE - i;
      });

      const result = benchmark(
        'Sort 100K organ pipe pattern',
        'Special Patterns',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(2500); // < 2.5 seconds
    });

    it('should benchmark random runs', () => {
      // Random sorted runs of varying lengths
      const arr: number[] = [];
      let value = 0;
      while (arr.length < SIZE) {
        const runLength = Math.floor(Math.random() * 100) + 10;
        for (let i = 0; i < runLength && arr.length < SIZE; i++) {
          arr.push(value++);
        }
        // Occasionally insert a random value to break the run
        if (Math.random() < 0.3 && arr.length < SIZE) {
          arr.push(Math.floor(Math.random() * SIZE));
        }
      }

      const result = benchmark(
        'Sort 100K with random runs',
        'Special Patterns',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      // Should be faster due to existing runs
      expect(result.time).toBeLessThan(1500); // < 1.5 seconds
    });
  });

  describe('Real-World Scenarios', () => {
    it('should benchmark financial data', () => {
      const SIZE = 50000;
      // Simulate stock prices: mostly clustered, some outliers
      const arr = Array.from({ length: SIZE }, () => {
        const base = 100;
        const variation = Math.random() < 0.95 ? Math.random() * 50 : Math.random() * 500;
        return base + variation;
      });

      const result = benchmark(
        'Sort 50K stock prices',
        'Real-World Scenarios',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        5
      );

      expect(result.time).toBeLessThan(1500); // < 1.5 seconds for 50K
    });

    it('should benchmark timestamps', () => {
      const SIZE = 100000;
      // Simulate log timestamps: mostly ascending with some out-of-order
      const baseTime = Date.now();
      const arr = Array.from({ length: SIZE }, (_, i) => {
        const offset = i * 1000; // 1 second apart
        const jitter = Math.random() < 0.1 ? Math.random() * 60000 : 0; // 10% out of order
        return baseTime + offset + jitter;
      });

      const result = benchmark(
        'Sort 100K timestamps (mostly ordered)',
        'Real-World Scenarios',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      // Should be fast due to mostly ordered data
      expect(result.time).toBeLessThan(1500); // < 1.5 seconds
    });

    it('should benchmark user names', () => {
      const SIZE = 50000;
      const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

      const arr = Array.from({ length: SIZE }, () => {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const last = lastNames[Math.floor(Math.random() * lastNames.length)];
        return `${first} ${last}`;
      });

      const result = benchmark(
        'Sort 50K user names',
        'Real-World Scenarios',
        () => {
          const copy = [...arr];
          timsort(copy, stringComparator());
          expect(isSorted(copy, stringComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(800); // < 800ms for 50K strings
    });

    it('should benchmark rating scores', () => {
      const SIZE = 100000;
      // Ratings: 1-5 stars, heavily skewed toward 4-5
      const arr = Array.from({ length: SIZE }, () => {
        const rand = Math.random();
        if (rand < 0.4) return 5;
        if (rand < 0.7) return 4;
        if (rand < 0.85) return 3;
        if (rand < 0.95) return 2;
        return 1;
      });

      const result = benchmark(
        'Sort 100K ratings (5 unique values)',
        'Real-World Scenarios',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator());
          expect(isSorted(copy, numericComparator())).toBe(true);
        },
        5
      );

      // Very few unique values should be fast
      expect(result.time).toBeLessThan(2000); // < 2 seconds
    });
  });

  describe('Comparison with minRun options', () => {
    const SIZE = 100000;

    it('should benchmark with default minRun (32)', () => {
      const arr = Array.from({ length: SIZE }, () => Math.random() * 1000000);

      const result = benchmark(
        'Sort 100K (minRun=32, default)',
        'MinRun Comparison',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator(), { minRun: 32 });
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(3000); // < 3 seconds
    });

    it('should benchmark with minRun=16', () => {
      const arr = Array.from({ length: SIZE }, () => Math.random() * 1000000);

      const result = benchmark(
        'Sort 100K (minRun=16)',
        'MinRun Comparison',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator(), { minRun: 16 });
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(2500); // < 2.5 seconds
    });

    it('should benchmark with minRun=64', () => {
      const arr = Array.from({ length: SIZE }, () => Math.random() * 1000000);

      const result = benchmark(
        'Sort 100K (minRun=64)',
        'MinRun Comparison',
        () => {
          const copy = [...arr];
          timsort(copy, numericComparator(), { minRun: 64 });
          expect(isSorted(copy, numericComparator())).toBe(true);
        }
      );

      expect(result.time).toBeLessThan(3500); // < 3.5 seconds
    });
  });
});
