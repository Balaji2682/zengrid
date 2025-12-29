import { ColumnStore } from './column-store';

/**
 * Performance Benchmark Suite for ColumnStore
 *
 * Run with: pnpm test column-store.perf
 *
 * Tests various scenarios:
 * - Small dataset (1K rows)
 * - Medium dataset (100K rows)
 * - Large dataset (1M rows)
 * - Aggregations with/without nulls
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
  console.log('        ColumnStore Performance Benchmarks       ');
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

describe('ColumnStore Performance Benchmarks', () => {
  afterAll(() => {
    formatResults();
  });

  describe('Small Dataset (1K rows)', () => {
    const ROWS = 1000;

    it('should benchmark store creation', () => {
      const result = benchmark('Create store with 5 columns', 'Small (1K rows)', () => {
        const store = new ColumnStore({
          rowCount: ROWS,
          columns: [
            { name: 'id', type: 'int32' },
            { name: 'name', type: 'string' },
            { name: 'value', type: 'float64' },
            { name: 'active', type: 'boolean' },
            { name: 'score', type: 'float64' },
          ],
        });
        expect(store.rowCount).toBe(ROWS);
      });

      expect(result.time).toBeLessThan(50);
    });

    it('should benchmark setValue operations', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'value', type: 'float64' }],
      });

      const result = benchmark(
        'Set 1K values',
        'Small (1K rows)',
        () => {
          for (let i = 0; i < ROWS; i++) {
            store.setValue(i, 'value', i * 1.5);
          }
        }
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark getValue operations', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'value', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'value', i * 1.5);
      }

      const result = benchmark(
        'Get single value',
        'Small (1K rows)',
        () => {
          const val = store.getValue(500, 'value');
          expect(val).toBe(750);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark getRow operations', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [
          { name: 'id', type: 'int32' },
          { name: 'value', type: 'float64' },
          { name: 'name', type: 'string' },
        ],
      });

      const result = benchmark(
        'Get row (3 columns)',
        'Small (1K rows)',
        () => {
          const row = store.getRow(500);
          expect(row).toBeDefined();
        },
        1000
      );

      expect(result.time).toBeLessThan(0.1);
    });

    it('should benchmark aggregation (sum)', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i);
      }

      const result = benchmark(
        'Aggregate sum (1K rows)',
        'Small (1K rows)',
        () => {
          const sum = store.aggregate('values', 'sum');
          expect(sum.count).toBe(ROWS);
        },
        100
      );

      expect(result.time).toBeLessThan(1);
    });
  });

  describe('Medium Dataset (100K rows)', () => {
    const ROWS = 100000;

    it('should benchmark store creation', () => {
      const result = benchmark('Create store with 10 columns', 'Medium (100K rows)', () => {
        const store = new ColumnStore({
          rowCount: ROWS,
          columns: [
            { name: 'id', type: 'int32' },
            { name: 'name', type: 'string' },
            { name: 'email', type: 'string' },
            { name: 'age', type: 'int32' },
            { name: 'salary', type: 'float64' },
            { name: 'score', type: 'float64' },
            { name: 'active', type: 'boolean' },
            { name: 'verified', type: 'boolean' },
            { name: 'rating', type: 'float64' },
            { name: 'balance', type: 'float64' },
          ],
        });
        expect(store.rowCount).toBe(ROWS);
      });

      expect(result.time).toBeLessThan(500);
    });

    it('should benchmark bulk setValue', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      const result = benchmark('Set 100K values', 'Medium (100K rows)', () => {
        for (let i = 0; i < ROWS; i++) {
          store.setValue(i, 'values', i * 1.5);
        }
      });

      expect(result.time).toBeLessThan(150); // < 150ms for bulk set
    });

    it('should benchmark getValue', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'value', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'value', i);
      }

      const result = benchmark(
        'Get single value',
        'Medium (100K rows)',
        () => {
          const val = store.getValue(50000, 'value');
          expect(val).toBe(50000);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark sum aggregation', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i);
      }

      const result = benchmark(
        'Aggregate sum (100K rows)',
        'Medium (100K rows)',
        () => {
          const sum = store.aggregate('values', 'sum');
          expect(sum.count).toBe(ROWS);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark avg aggregation', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i);
      }

      const result = benchmark(
        'Aggregate avg (100K rows)',
        'Medium (100K rows)',
        () => {
          const avg = store.aggregate('values', 'avg');
          expect(avg.count).toBe(ROWS);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark min aggregation', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i);
      }

      const result = benchmark(
        'Aggregate min (100K rows)',
        'Medium (100K rows)',
        () => {
          const min = store.aggregate('values', 'min');
          expect(min.value).toBe(0);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark max aggregation', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i);
      }

      const result = benchmark(
        'Aggregate max (100K rows)',
        'Medium (100K rows)',
        () => {
          const max = store.aggregate('values', 'max');
          expect(max.value).toBe(ROWS - 1);
        },
        10
      );

      expect(result.time).toBeLessThan(25); // < 25ms (allow slight variance)
    });

    it('should benchmark count aggregation', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i);
      }

      const result = benchmark(
        'Aggregate count (100K rows)',
        'Medium (100K rows)',
        () => {
          const count = store.aggregate('values', 'count');
          expect(count.value).toBe(ROWS);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });
  });

  describe('Large Dataset (1M rows)', () => {
    const ROWS = 1000000;

    it('should benchmark store creation', () => {
      const result = benchmark('Create store with 5 columns', 'Large (1M rows)', () => {
        const store = new ColumnStore({
          rowCount: ROWS,
          columns: [
            { name: 'id', type: 'int32' },
            { name: 'value', type: 'float64' },
            { name: 'score', type: 'float64' },
            { name: 'active', type: 'boolean' },
            { name: 'name', type: 'string' },
          ],
        });
        expect(store.rowCount).toBe(ROWS);
      });

      expect(result.time).toBeLessThan(2000);
    });

    it('should benchmark getValue', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'value', type: 'float64' }],
      });

      const result = benchmark(
        'Get single value',
        'Large (1M rows)',
        () => {
          const val = store.getValue(500000, 'value');
          expect(val).toBeDefined();
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark sum aggregation', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      // Fill with sample data
      for (let i = 0; i < 1000; i++) {
        store.setValue(i, 'values', i);
      }

      const result = benchmark(
        'Aggregate sum (1M rows)',
        'Large (1M rows)',
        () => {
          const sum = store.aggregate('values', 'sum');
          expect(sum).toBeDefined();
        }
      );

      expect(result.time).toBeLessThan(200); // < 200ms for 1M rows is excellent
    });
  });

  describe('Aggregations with Nulls', () => {
    const ROWS = 100000;

    it('should benchmark sum with 0% nulls (baseline)', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i);
      }

      const result = benchmark(
        'Sum with 0% nulls',
        'Null Handling Performance',
        () => {
          const sum = store.aggregate('values', 'sum');
          expect(sum.count).toBe(ROWS);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark sum with 10% nulls', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        // Every 10th value is null
        store.setValue(i, 'values', i % 10 === 0 ? null : i);
      }

      const result = benchmark(
        'Sum with 10% nulls',
        'Null Handling Performance',
        () => {
          const sum = store.aggregate('values', 'sum');
          expect(sum.count).toBeLessThan(ROWS);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark sum with 50% nulls', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        // Every other value is null
        store.setValue(i, 'values', i % 2 === 0 ? null : i);
      }

      const result = benchmark(
        'Sum with 50% nulls',
        'Null Handling Performance',
        () => {
          const sum = store.aggregate('values', 'sum');
          expect(sum.count).toBe(ROWS / 2);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark avg with 50% nulls', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i % 2 === 0 ? null : i);
      }

      const result = benchmark(
        'Avg with 50% nulls',
        'Null Handling Performance',
        () => {
          const avg = store.aggregate('values', 'avg');
          expect(avg.count).toBe(ROWS / 2);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark min with 50% nulls', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i % 2 === 0 ? null : i);
      }

      const result = benchmark(
        'Min with 50% nulls',
        'Null Handling Performance',
        () => {
          const min = store.aggregate('values', 'min');
          expect(min.count).toBe(ROWS / 2);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });

    it('should benchmark count with 50% nulls', () => {
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [{ name: 'values', type: 'float64' }],
      });

      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'values', i % 2 === 0 ? null : i);
      }

      const result = benchmark(
        'Count with 50% nulls',
        'Null Handling Performance',
        () => {
          const count = store.aggregate('values', 'count');
          expect(count.value).toBe(ROWS / 2);
        },
        10
      );

      expect(result.time).toBeLessThan(20); // < 20ms is still very fast
    });
  });

  describe('Real-World Scenarios', () => {
    it('should benchmark financial data processing', () => {
      const ROWS = 50000;
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [
          { name: 'transaction_id', type: 'int32' },
          { name: 'amount', type: 'float64' },
          { name: 'fee', type: 'float64' },
          { name: 'balance', type: 'float64' },
        ],
      });

      // Populate financial data
      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'transaction_id', i);
        store.setValue(i, 'amount', Math.random() * 1000);
        store.setValue(i, 'fee', Math.random() * 10);
        store.setValue(i, 'balance', Math.random() * 10000);
      }

      const result = benchmark(
        'Calculate total transactions',
        'Real-World Scenarios',
        () => {
          const totalAmount = store.aggregate('amount', 'sum');
          const totalFees = store.aggregate('fee', 'sum');
          const avgBalance = store.aggregate('balance', 'avg');

          expect(totalAmount.count).toBe(ROWS);
          expect(totalFees.count).toBe(ROWS);
          expect(avgBalance.count).toBe(ROWS);
        }
      );

      expect(result.time).toBeLessThan(30);
    });

    it('should benchmark user analytics', () => {
      const ROWS = 100000;
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [
          { name: 'user_id', type: 'int32' },
          { name: 'page_views', type: 'int32' },
          { name: 'session_time', type: 'float64' },
          { name: 'purchases', type: 'int32' },
        ],
      });

      // Populate analytics data with some nulls
      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'user_id', i);
        store.setValue(i, 'page_views', Math.floor(Math.random() * 100));
        store.setValue(i, 'session_time', i % 10 === 0 ? null : Math.random() * 3600);
        store.setValue(i, 'purchases', i % 5 === 0 ? null : Math.floor(Math.random() * 10));
      }

      const result = benchmark(
        'Calculate user metrics',
        'Real-World Scenarios',
        () => {
          const totalViews = store.aggregate('page_views', 'sum');
          const avgSessionTime = store.aggregate('session_time', 'avg');
          const totalPurchases = store.aggregate('purchases', 'count');

          expect(totalViews).toBeDefined();
          expect(avgSessionTime).toBeDefined();
          expect(totalPurchases).toBeDefined();
        }
      );

      expect(result.time).toBeLessThan(60); // < 60ms for 100K rows × 3 aggregations (allow variance)
    });

    it('should benchmark sensor data aggregation', () => {
      const ROWS = 200000; // 200K sensor readings
      const store = new ColumnStore({
        rowCount: ROWS,
        columns: [
          { name: 'timestamp', type: 'int32' },
          { name: 'temperature', type: 'float64' },
          { name: 'humidity', type: 'float64' },
          { name: 'pressure', type: 'float64' },
        ],
      });

      // Populate sensor data with occasional null readings
      for (let i = 0; i < ROWS; i++) {
        store.setValue(i, 'timestamp', i);
        store.setValue(i, 'temperature', i % 20 === 0 ? null : 20 + Math.random() * 10);
        store.setValue(i, 'humidity', i % 15 === 0 ? null : 40 + Math.random() * 30);
        store.setValue(i, 'pressure', i % 25 === 0 ? null : 1000 + Math.random() * 50);
      }

      const result = benchmark(
        'Calculate sensor statistics',
        'Real-World Scenarios',
        () => {
          const avgTemp = store.aggregate('temperature', 'avg');
          const minHumidity = store.aggregate('humidity', 'min');
          const maxPressure = store.aggregate('pressure', 'max');

          expect(avgTemp.count).toBeLessThan(ROWS);
          expect(minHumidity.count).toBeLessThan(ROWS);
          expect(maxPressure.count).toBeLessThan(ROWS);
        }
      );

      expect(result.time).toBeLessThan(110); // < 110ms for 200K rows × 3 aggregations (allow variance)
    });
  });
});
