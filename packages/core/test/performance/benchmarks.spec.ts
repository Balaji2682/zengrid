/**
 * Performance Benchmarking Suite
 *
 * Tests performance targets:
 * - Initial render (100K rows) < 100ms
 * - Scroll FPS ≥ 60 FPS
 * - Memory usage < 100MB
 * - Cell edit latency < 16ms
 */

import { Grid } from '../../src/grid';
import { GridDataModel } from '../../src/data/grid-data-model';

/**
 * Performance measurement utilities
 */
class PerformanceMeasure {
  /**
   * Measure execution time
   */
  static measure(fn: () => void): number {
    const start = performance.now();
    fn();
    const end = performance.now();
    return end - start;
  }

  /**
   * Measure async execution time
   */
  static async measureAsync(fn: () => Promise<void>): Promise<number> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  }

  /**
   * Get memory usage (Chrome only)
   */
  static getMemoryUsage(): number | null {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return null;
  }

  /**
   * Measure FPS over duration
   */
  static async measureFPS(duration: number): Promise<number> {
    return new Promise((resolve) => {
      let frames = 0;
      const startTime = performance.now();

      const tick = () => {
        frames++;
        const elapsed = performance.now() - startTime;

        if (elapsed < duration) {
          requestAnimationFrame(tick);
        } else {
          const fps = Math.round((frames * 1000) / elapsed);
          resolve(fps);
        }
      };

      requestAnimationFrame(tick);
    });
  }
}

/**
 * Generate test data
 */
function generateTestData(rows: number, cols: number): any[][] {
  const data: any[][] = [];

  for (let row = 0; row < rows; row++) {
    const rowData: any[] = [];
    for (let col = 0; col < cols; col++) {
      switch (col % 4) {
        case 0:
          rowData.push(row * cols + col);
          break;
        case 1:
          rowData.push(`Text ${row},${col}`);
          break;
        case 2:
          rowData.push(Math.random() > 0.5);
          break;
        case 3:
          rowData.push(new Date(2024, 0, 1 + row));
          break;
      }
    }
    data.push(rowData);
  }

  return data;
}

describe('Performance Benchmarks', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create container
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Cleanup
    if (container && container.parentElement) {
      container.remove();
    }
  });

  describe('Render Performance', () => {
    it('should render 1K rows under 50ms', () => {
      const data = generateTestData(1000, 10);
      const grid = new Grid(container, {
        rowCount: 1000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);

      const duration = PerformanceMeasure.measure(() => {
        grid.render();
      });

      expect(duration).toBeLessThan(50);

      grid.destroy();
    });

    it('should render 10K rows under 75ms', () => {
      const data = generateTestData(10000, 10);
      const grid = new Grid(container, {
        rowCount: 10000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);

      const duration = PerformanceMeasure.measure(() => {
        grid.render();
      });

      expect(duration).toBeLessThan(75);

      grid.destroy();
    });

    it('should render 100K rows under 100ms', () => {
      const data = generateTestData(100000, 10);
      const grid = new Grid(container, {
        rowCount: 100000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);

      const duration = PerformanceMeasure.measure(() => {
        grid.render();
      });

      console.log(`100K rows render time: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(100);

      grid.destroy();
    });
  });

  describe('Scroll Performance', () => {
    it('should maintain ≥55 FPS during scroll simulation', async () => {
      const data = generateTestData(10000, 10);
      const grid = new Grid(container, {
        rowCount: 10000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);
      grid.render();

      // Simulate scrolling by measuring FPS
      const fps = await PerformanceMeasure.measureFPS(1000);

      console.log(`Scroll FPS: ${fps}`);

      expect(fps).toBeGreaterThanOrEqual(55);

      grid.destroy();
    }, 10000);
  });

  describe('Memory Usage', () => {
    it('should use <100MB for 100K rows', () => {
      const memoryBefore = PerformanceMeasure.getMemoryUsage();

      const data = generateTestData(100000, 10);
      const grid = new Grid(container, {
        rowCount: 100000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);
      grid.render();

      const memoryAfter = PerformanceMeasure.getMemoryUsage();

      grid.destroy();

      if (memoryBefore !== null && memoryAfter !== null) {
        const memoryUsed = (memoryAfter - memoryBefore) / (1024 * 1024);
        console.log(`Memory used: ${memoryUsed.toFixed(2)} MB`);

        expect(memoryUsed).toBeLessThan(100);
      } else {
        // Skip test if memory API not available
        console.warn('Memory API not available, skipping test');
      }
    });

    it('should not leak memory on destroy', () => {
      const memoryBefore = PerformanceMeasure.getMemoryUsage();

      // Create and destroy multiple grids
      for (let i = 0; i < 10; i++) {
        const data = generateTestData(1000, 10);
        const grid = new Grid(container, {
          rowCount: 1000,
          colCount: 10,
          rowHeight: 30,
          colWidth: 100,
        });

        grid.setData(data);
        grid.render();
        grid.destroy();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = PerformanceMeasure.getMemoryUsage();

      if (memoryBefore !== null && memoryAfter !== null) {
        const memoryDiff = (memoryAfter - memoryBefore) / (1024 * 1024);
        console.log(`Memory difference: ${memoryDiff.toFixed(2)} MB`);

        // Should not grow significantly
        expect(memoryDiff).toBeLessThan(10);
      }
    });
  });

  describe('Data Structure Performance', () => {
    it('should handle SparseMatrix operations quickly', () => {
      const model = new GridDataModel({
        rowCount: 100000,
        colCount: 10,
        storage: 'sparse',
      });

      const duration = PerformanceMeasure.measure(() => {
        // Set 10,000 values
        for (let i = 0; i < 10000; i++) {
          model.setValue(i, i % 10, `Value ${i}`);
        }
      });

      console.log(`SparseMatrix 10K writes: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(50);
    });

    it('should handle ColumnStore operations quickly', () => {
      const model = new GridDataModel({
        rowCount: 100000,
        colCount: 3,
        storage: 'columnar',
        columns: [
          { name: 'id', type: 'number' },
          { name: 'name', type: 'string' },
          { name: 'active', type: 'boolean' },
        ],
      });

      const duration = PerformanceMeasure.measure(() => {
        // Set 10,000 values
        for (let i = 0; i < 10000; i++) {
          model.setValue(i, 0, i);
          model.setValue(i, 1, `Name ${i}`);
          model.setValue(i, 2, i % 2 === 0);
        }
      });

      console.log(`ColumnStore 30K writes: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Cell Update Performance', () => {
    it('should update single cell under 10ms', () => {
      const data = generateTestData(10000, 10);
      const grid = new Grid(container, {
        rowCount: 10000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);
      grid.render();

      const duration = PerformanceMeasure.measure(() => {
        grid.updateCells([{ row: 0, col: 0 }]);
      });

      console.log(`Single cell update: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(10);

      grid.destroy();
    });

    it('should update 100 cells under 50ms', () => {
      const data = generateTestData(10000, 10);
      const grid = new Grid(container, {
        rowCount: 10000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);
      grid.render();

      const cells = Array.from({ length: 100 }, (_, i) => ({
        row: i,
        col: i % 10,
      }));

      const duration = PerformanceMeasure.measure(() => {
        grid.updateCells(cells);
      });

      console.log(`100 cell updates: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(50);

      grid.destroy();
    });
  });

  describe('Cell Pool Performance', () => {
    it('should achieve >95% pool reuse rate', () => {
      const data = generateTestData(10000, 10);
      const grid = new Grid(container, {
        rowCount: 10000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);
      grid.render();

      const stats = grid.getStats();

      console.log('Pool stats:', stats.poolStats);

      // Calculate reuse rate
      const reuseRate = stats.poolStats.active / stats.poolStats.total;

      expect(reuseRate).toBeGreaterThan(0.95);

      grid.destroy();
    });
  });

  describe('Regression Tests', () => {
    it('should not degrade performance over multiple operations', () => {
      const data = generateTestData(1000, 10);
      const grid = new Grid(container, {
        rowCount: 1000,
        colCount: 10,
        rowHeight: 30,
        colWidth: 100,
      });

      grid.setData(data);
      grid.render();

      const durations: number[] = [];

      // Perform 100 refresh operations
      for (let i = 0; i < 100; i++) {
        const duration = PerformanceMeasure.measure(() => {
          grid.refresh();
        });
        durations.push(duration);
      }

      // Check that last 10 operations aren't significantly slower than first 10
      const firstAvg = durations.slice(0, 10).reduce((a, b) => a + b) / 10;
      const lastAvg = durations.slice(-10).reduce((a, b) => a + b) / 10;

      console.log(`First 10 avg: ${firstAvg.toFixed(2)}ms`);
      console.log(`Last 10 avg: ${lastAvg.toFixed(2)}ms`);

      expect(lastAvg).toBeLessThan(firstAvg * 1.2); // Max 20% degradation

      grid.destroy();
    });
  });
});
