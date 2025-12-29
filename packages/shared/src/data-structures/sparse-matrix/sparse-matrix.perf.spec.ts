import { SparseMatrix } from './sparse-matrix';

/**
 * Performance Benchmark Suite for SparseMatrix
 *
 * Run with: pnpm test sparse-matrix.perf
 *
 * Tests various scenarios:
 * - Small dataset (1K cells)
 * - Medium dataset (100K cells)
 * - Large dataset (1M cells)
 * - Very sparse dataset (1M potential, 10K actual)
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
  console.log('        SparseMatrix Performance Benchmarks      ');
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
      'Operation'.padEnd(35),
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
        bench.operation.padEnd(35),
        timeStr.padEnd(15),
        opsStr.padEnd(15),
        memStr
      );
    }
  }

  console.log('\n=================================================\n');
}

describe('SparseMatrix Performance Benchmarks', () => {
  afterAll(() => {
    formatResults();
  });

  describe('Small Dataset (1K cells)', () => {
    const ROWS = 100;
    const COLS = 10;
    const CELLS = ROWS * COLS; // 1,000 cells

    it('should benchmark fill operation', () => {
      const result = benchmark('Fill 1K cells', 'Small (1K cells)', () => {
        const matrix = new SparseMatrix<number>();
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            matrix.set(row, col, row * COLS + col);
          }
        }
      });

      expect(result.time).toBeLessThan(100);
    });

    it('should benchmark single cell access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get single cell',
        'Small (1K cells)',
        () => {
          const value = matrix.get(50, 5);
          expect(value).toBe(505);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark row access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get row (10 cells)',
        'Small (1K cells)',
        () => {
          const row = matrix.getRow(50);
          expect(row.size).toBe(COLS);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark column access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get column (100 cells)',
        'Small (1K cells)',
        () => {
          const col = matrix.getColumn(5);
          expect(col.size).toBe(ROWS);
        },
        1000
      );

      expect(result.time).toBeLessThan(1);
    });

    it('should benchmark row deletion', () => {
      const result = benchmark('Delete row', 'Small (1K cells)', () => {
        const matrix = new SparseMatrix<number>();
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            matrix.set(row, col, row * COLS + col);
          }
        }
        const deleted = matrix.deleteRow(50);
        expect(deleted).toBe(COLS);
      });

      expect(result.time).toBeLessThan(10);
    });

    it('should benchmark iteration', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Iterate all cells',
        'Small (1K cells)',
        () => {
          let count = 0;
          for (const [, ,] of matrix) {
            count++;
          }
          expect(count).toBe(CELLS);
        },
        100
      );

      expect(result.time).toBeLessThan(10);
    });
  });

  describe('Medium Dataset (100K cells)', () => {
    const ROWS = 1000;
    const COLS = 100;
    const CELLS = ROWS * COLS; // 100,000 cells

    it('should benchmark fill operation', () => {
      const result = benchmark('Fill 100K cells', 'Medium (100K cells)', () => {
        const matrix = new SparseMatrix<number>();
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            matrix.set(row, col, row * COLS + col);
          }
        }
        expect(matrix.size).toBe(CELLS);
      });

      expect(result.time).toBeLessThan(500);
    });

    it('should benchmark single cell access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get single cell',
        'Medium (100K cells)',
        () => {
          const value = matrix.get(500, 50);
          expect(value).toBe(50050);
        },
        10000
      );

      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark row access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get row (100 cells)',
        'Medium (100K cells)',
        () => {
          const row = matrix.getRow(500);
          expect(row.size).toBe(COLS);
        },
        10000
      );

      // Critical: Should be O(1), not O(total cells)!
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark column access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get column (1K cells)',
        'Medium (100K cells)',
        () => {
          const col = matrix.getColumn(50);
          expect(col.size).toBe(ROWS);
        },
        1000
      );

      // Should iterate only 1K rows, not 100K cells
      expect(result.time).toBeLessThan(1);
    });

    it('should benchmark bulk row access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get 100 rows (10K cells)',
        'Medium (100K cells)',
        () => {
          for (let i = 0; i < 100; i++) {
            const row = matrix.getRow(i);
            expect(row.size).toBe(COLS);
          }
        },
        100
      );

      // 100 rows should be very fast with O(1) access
      expect(result.time).toBeLessThan(5);
    });

    it('should benchmark row deletion', () => {
      const result = benchmark('Delete row', 'Medium (100K cells)', () => {
        const matrix = new SparseMatrix<number>();
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            matrix.set(row, col, row * COLS + col);
          }
        }
        const deleted = matrix.deleteRow(500);
        expect(deleted).toBe(COLS);
      });

      expect(result.time).toBeLessThan(20);
    });

    it('should benchmark column deletion', () => {
      const result = benchmark('Delete column', 'Medium (100K cells)', () => {
        const matrix = new SparseMatrix<number>();
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            matrix.set(row, col, row * COLS + col);
          }
        }
        const deleted = matrix.deleteColumn(50);
        expect(deleted).toBe(ROWS);
      });

      expect(result.time).toBeLessThan(50);
    });
  });

  describe('Large Dataset (1M cells)', () => {
    const ROWS = 10000;
    const COLS = 100;
    const CELLS = ROWS * COLS; // 1,000,000 cells

    it('should benchmark fill operation', () => {
      const result = benchmark('Fill 1M cells', 'Large (1M cells)', () => {
        const matrix = new SparseMatrix<number>();
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            matrix.set(row, col, row * COLS + col);
          }
        }
        expect(matrix.size).toBe(CELLS);
      });

      expect(result.time).toBeLessThan(5000);
    });

    it('should benchmark single cell access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get single cell',
        'Large (1M cells)',
        () => {
          const value = matrix.get(5000, 50);
          expect(value).toBe(500050);
        },
        10000
      );

      // Should still be constant time!
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark row access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark('Get row (100 cells)', 'Large (1M cells)', () => {
        const row = matrix.getRow(5000);
        expect(row.size).toBe(COLS);
      }, 10000);

      // CRITICAL: O(1) even with 1M cells!
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark column access', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          matrix.set(row, col, row * COLS + col);
        }
      }

      const result = benchmark(
        'Get column (10K cells)',
        'Large (1M cells)',
        () => {
          const col = matrix.getColumn(50);
          expect(col.size).toBe(ROWS);
        },
        100
      );

      // Should iterate only 10K rows, not 1M cells
      expect(result.time).toBeLessThan(10);
    });

    it('should benchmark row deletion', () => {
      const result = benchmark('Delete row', 'Large (1M cells)', () => {
        const matrix = new SparseMatrix<number>();
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            matrix.set(row, col, row * COLS + col);
          }
        }
        const deleted = matrix.deleteRow(5000);
        expect(deleted).toBe(COLS);
      });

      expect(result.time).toBeLessThan(200);
    });
  });

  describe('Very Sparse Dataset', () => {
    // 1M potential cells, but only 10K filled (1% sparse)
    const ACTUAL_CELLS = 10000;

    it('should benchmark sparse fill', () => {
      const result = benchmark(
        'Fill 10K cells (1% sparse)',
        'Very Sparse (1M potential)',
        () => {
          const matrix = new SparseMatrix<number>();
          for (let i = 0; i < ACTUAL_CELLS; i++) {
            const row = i * 100; // Spread across many rows
            const col = i % 100;
            matrix.set(row, col, i);
          }
          expect(matrix.size).toBe(ACTUAL_CELLS);
        }
      );

      expect(result.time).toBeLessThan(100);
    });

    it('should benchmark sparse row access', () => {
      const matrix = new SparseMatrix<number>();
      for (let i = 0; i < ACTUAL_CELLS; i++) {
        const row = i * 100;
        const col = i % 100;
        matrix.set(row, col, i);
      }

      const result = benchmark(
        'Get row (large index)',
        'Very Sparse (1M potential)',
        () => {
          const row = matrix.getRow(500000); // Very large row index
          expect(row.size).toBeLessThanOrEqual(1);
        },
        10000
      );

      // Should be O(1) regardless of row index size!
      expect(result.time).toBeLessThan(0.05); // < 50 microseconds
    });

    it('should benchmark sparse column access', () => {
      const matrix = new SparseMatrix<number>();
      for (let i = 0; i < ACTUAL_CELLS; i++) {
        const row = i * 100;
        const col = i % 100;
        matrix.set(row, col, i);
      }

      const result = benchmark(
        'Get column (from sparse)',
        'Very Sparse (1M potential)',
        () => {
          const col = matrix.getColumn(50);
          expect(col.size).toBeGreaterThan(0);
        },
        1000
      );

      // Should only iterate rows with data (~10K), not 1M potential rows
      expect(result.time).toBeLessThan(5);
    });

    it('should benchmark memory efficiency', () => {
      const result = benchmark(
        'Memory for 10K cells',
        'Very Sparse (1M potential)',
        () => {
          const matrix = new SparseMatrix<number>();
          for (let i = 0; i < ACTUAL_CELLS; i++) {
            const row = i * 100;
            const col = i % 100;
            matrix.set(row, col, i);
          }
          expect(matrix.size).toBe(ACTUAL_CELLS);
        }
      );

      // Memory should scale with actual cells, not potential cells
      // Expect roughly 1-2 MB for 10K cells (not 100+ MB for 1M potential)
      if (result.memory) {
        expect(result.memory).toBeLessThan(5 * 1024 * 1024); // < 5 MB
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should benchmark viewport rendering (100 cells)', () => {
      // Simulate grid with 10K rows × 100 columns
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < 10000; row++) {
        for (let col = 0; col < 100; col++) {
          matrix.set(row, col, row * 100 + col);
        }
      }

      const result = benchmark(
        'Render viewport (10 rows × 10 cols)',
        'Real-World Scenarios',
        () => {
          // Get 10 visible rows
          for (let row = 500; row < 510; row++) {
            const rowData = matrix.getRow(row);
            // Get 10 visible columns
            for (let col = 0; col < 10; col++) {
              const value = rowData.get(col);
              expect(value).toBeDefined();
            }
          }
        },
        1000
      );

      // Viewport rendering should be extremely fast
      expect(result.time).toBeLessThan(3.5); // < 3.5ms (allow slight variance)
    });

    it('should benchmark scroll (load 20 new rows)', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < 10000; row++) {
        for (let col = 0; col < 100; col++) {
          matrix.set(row, col, row * 100 + col);
        }
      }

      const result = benchmark(
        'Scroll down (load 20 rows)',
        'Real-World Scenarios',
        () => {
          for (let row = 510; row < 530; row++) {
            const rowData = matrix.getRow(row);
            expect(rowData.size).toBe(100);
          }
        },
        1000
      );

      // Scrolling should not cause lag
      expect(result.time).toBeLessThan(2);
    });

    it('should benchmark copy/paste (10 rows)', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < 1000; row++) {
        for (let col = 0; col < 100; col++) {
          matrix.set(row, col, row * 100 + col);
        }
      }

      const result = benchmark(
        'Copy 10 rows (1K cells)',
        'Real-World Scenarios',
        () => {
          const clipboard: Map<number, number>[] = [];
          for (let row = 100; row < 110; row++) {
            clipboard.push(new Map(matrix.getRow(row)));
          }
          expect(clipboard).toHaveLength(10);
        },
        100
      );

      expect(result.time).toBeLessThan(5);
    });

    it('should benchmark row selection (100 rows)', () => {
      const matrix = new SparseMatrix<number>();
      for (let row = 0; row < 10000; row++) {
        for (let col = 0; col < 100; col++) {
          matrix.set(row, col, row * 100 + col);
        }
      }

      const result = benchmark(
        'Select 100 rows',
        'Real-World Scenarios',
        () => {
          const selected: Map<number, number>[] = [];
          for (let row = 0; row < 100; row++) {
            selected.push(new Map(matrix.getRow(row)));
          }
          expect(selected).toHaveLength(100);
        },
        100
      );

      expect(result.time).toBeLessThan(10);
    });

    it('should benchmark bulk delete (delete 100 rows)', () => {
      const result = benchmark(
        'Delete 100 rows',
        'Real-World Scenarios',
        () => {
          const matrix = new SparseMatrix<number>();
          for (let row = 0; row < 1000; row++) {
            for (let col = 0; col < 100; col++) {
              matrix.set(row, col, row * 100 + col);
            }
          }

          let totalDeleted = 0;
          for (let row = 100; row < 200; row++) {
            totalDeleted += matrix.deleteRow(row);
          }
          expect(totalDeleted).toBe(10000); // 100 rows × 100 cols
        },
        10
      );

      expect(result.time).toBeLessThan(50);
    });
  });
});
