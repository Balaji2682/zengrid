/**
 * Interval Tree tests
 */

import { IntervalTree } from './interval-tree';
import { IntervalUtils } from './interval-tree.interface';

describe('IntervalTree', () => {
  describe('Basic Operations', () => {
    it('should create an empty interval tree', () => {
      const tree = new IntervalTree<string>();
      expect(tree.size).toBe(0);
      expect(tree.isEmpty).toBe(true);
      expect(tree.height).toBe(0);
    });

    it('should insert intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 15, end: 25 }, 'B');
      tree.insert({ start: 30, end: 40 }, 'C');

      expect(tree.size).toBe(3);
      expect(tree.isEmpty).toBe(false);
    });

    it('should return inserted interval with ID', () => {
      const tree = new IntervalTree<string>();
      const interval1 = tree.insert({ start: 10, end: 20 }, 'A');
      const interval2 = tree.insert({ start: 15, end: 25 }, 'B');

      expect(interval1.id).toBeDefined();
      expect(interval2.id).toBeDefined();
      expect(interval1.id).not.toBe(interval2.id);
      expect(interval1.data).toBe('A');
      expect(interval2.data).toBe('B');
    });

    it('should delete intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      const interval2 = tree.insert({ start: 15, end: 25 }, 'B');
      tree.insert({ start: 30, end: 40 }, 'C');

      expect(tree.size).toBe(3);

      const deleted = tree.delete(interval2);
      expect(deleted).toBe(true);
      expect(tree.size).toBe(2);

      const notFound = tree.delete(interval2);
      expect(notFound).toBe(false);
      expect(tree.size).toBe(2);
    });

    it('should delete by ID', () => {
      const tree = new IntervalTree<string>();
      const interval = tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 15, end: 25 }, 'B');

      expect(tree.deleteById(interval.id!)).toBe(true);
      expect(tree.size).toBe(1);
      expect(tree.deleteById(999)).toBe(false);
    });

    it('should clear all intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 15, end: 25 }, 'B');

      tree.clear();
      expect(tree.size).toBe(0);
      expect(tree.isEmpty).toBe(true);
    });
  });

  describe('Overlap Search', () => {
    it('should find overlapping intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 15, end: 25 }, 'B');
      tree.insert({ start: 30, end: 40 }, 'C');
      tree.insert({ start: 5, end: 12 }, 'D');

      const results = tree.search({ start: 18, end: 22 });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.data).sort()).toEqual(['A', 'B']);
    });

    it('should find no overlaps when none exist', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 30, end: 40 }, 'B');

      const results = tree.search({ start: 22, end: 28 });
      expect(results).toHaveLength(0);
    });

    it('should find overlaps at interval boundaries', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 20, end: 30 }, 'B');

      // Point touching at boundary
      const results1 = tree.search({ start: 20, end: 20 });
      expect(results1).toHaveLength(2);

      // Interval ending at boundary
      const results2 = tree.search({ start: 15, end: 20 });
      expect(results2.map((r) => r.data).sort()).toEqual(['A', 'B']);

      // Interval starting at boundary
      const results3 = tree.search({ start: 20, end: 25 });
      expect(results3.map((r) => r.data).sort()).toEqual(['A', 'B']);
    });

    it('should handle single point queries', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 15, end: 25 }, 'B');
      tree.insert({ start: 30, end: 40 }, 'C');

      const results = tree.searchPoint(17);
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.data).sort()).toEqual(['A', 'B']);

      const noResults = tree.searchPoint(28);
      expect(noResults).toHaveLength(0);
    });

    it('should check for overlap existence', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 30, end: 40 }, 'B');

      expect(tree.hasOverlap({ start: 15, end: 25 })).toBe(true);
      expect(tree.hasOverlap({ start: 22, end: 28 })).toBe(false);
      expect(tree.hasOverlap({ start: 35, end: 50 })).toBe(true);
    });
  });

  describe('Containment Queries', () => {
    it('should find contained intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 30 }, 'A');
      tree.insert({ start: 15, end: 25 }, 'B');
      tree.insert({ start: 12, end: 18 }, 'C');
      tree.insert({ start: 5, end: 35 }, 'D');

      const results = tree.searchContained({ start: 10, end: 30 });

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.data).sort()).toEqual(['A', 'B', 'C']);
    });

    it('should find containing intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 30 }, 'A');
      tree.insert({ start: 15, end: 25 }, 'B');
      tree.insert({ start: 5, end: 35 }, 'C');
      tree.insert({ start: 0, end: 50 }, 'D');

      const results = tree.searchContaining({ start: 15, end: 25 });

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.data).sort()).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('Min/Max Operations', () => {
    it('should find minimum interval', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 20, end: 30 }, 'A');
      tree.insert({ start: 10, end: 15 }, 'B');
      tree.insert({ start: 30, end: 40 }, 'C');

      const min = tree.findMin();
      expect(min?.data).toBe('B');
      expect(min?.start).toBe(10);
    });

    it('should find maximum interval (by endpoint)', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 15, end: 45 }, 'B');
      tree.insert({ start: 30, end: 40 }, 'C');

      const max = tree.findMax();
      expect(max?.data).toBe('B');
      expect(max?.end).toBe(45);
    });

    it('should return undefined for empty tree', () => {
      const tree = new IntervalTree<string>();
      expect(tree.findMin()).toBeUndefined();
      expect(tree.findMax()).toBeUndefined();
    });
  });

  describe('Iteration and Traversal', () => {
    it('should return intervals in sorted order', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 30, end: 40 }, 'C');
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 20, end: 30 }, 'B');

      const intervals = tree.inorder();
      expect(intervals).toHaveLength(3);
      expect(intervals.map((i) => i.data)).toEqual(['A', 'B', 'C']);
    });

    it('should iterate with forEach', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 15, end: 25 }, 'B');

      const results: string[] = [];
      tree.forEach((interval) => {
        results.push(interval.data);
      });

      expect(results).toHaveLength(2);
      expect(results).toContain('A');
      expect(results).toContain('B');
    });

    it('should filter intervals', () => {
      const tree = new IntervalTree<number>();
      tree.insert({ start: 10, end: 20 }, 100);
      tree.insert({ start: 15, end: 25 }, 200);
      tree.insert({ start: 30, end: 40 }, 150);

      const filtered = tree.filter((interval) => interval.data > 150);

      expect(filtered.size).toBe(1);
      const intervals = filtered.inorder();
      expect(intervals[0].data).toBe(200);
    });

    it('should map intervals', () => {
      const tree = new IntervalTree<number>();
      tree.insert({ start: 10, end: 20 }, 1);
      tree.insert({ start: 15, end: 25 }, 2);

      const mapped = tree.map((data) => data * 10);

      expect(mapped.size).toBe(2);
      const intervals = mapped.inorder();
      expect(intervals.map((i) => i.data).sort()).toEqual([10, 20]);
    });
  });

  describe('Balanced Tree Option', () => {
    it('should create balanced tree when option is set', () => {
      const tree = new IntervalTree<string>({ balanced: true });

      // Insert in sorted order (worst case for unbalanced BST)
      for (let i = 0; i < 100; i++) {
        tree.insert({ start: i, end: i + 10 }, `Interval${i}`);
      }

      expect(tree.size).toBe(100);

      // Height should be logarithmic for balanced tree
      // For 100 nodes, balanced height should be ~7 (log2(100) ≈ 6.6)
      expect(tree.height).toBeLessThan(15);
    });

    it('should maintain balance after deletions', () => {
      const tree = new IntervalTree<string>({ balanced: true });

      const intervals = [];
      for (let i = 0; i < 50; i++) {
        const interval = tree.insert({ start: i, end: i + 10 }, `Interval${i}`);
        intervals.push(interval);
      }

      // Delete every other interval
      for (let i = 0; i < intervals.length; i += 2) {
        tree.delete(intervals[i]);
      }

      expect(tree.size).toBe(25);
      expect(tree.height).toBeLessThan(10);
    });
  });

  describe('Duplicate Handling', () => {
    it('should allow duplicates by default', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 10, end: 20 }, 'B');

      expect(tree.size).toBe(2);
    });

    it('should prevent duplicates when option is set', () => {
      const tree = new IntervalTree<string>({ allowDuplicates: false });
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 10, end: 20 }, 'B');

      expect(tree.size).toBe(1);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create from array', () => {
      const intervals = [
        { interval: { start: 10, end: 20 }, data: 'A' },
        { interval: { start: 15, end: 25 }, data: 'B' },
        { interval: { start: 30, end: 40 }, data: 'C' },
      ];

      const tree = IntervalTree.from(intervals);

      expect(tree.size).toBe(3);
    });

    it('should respect options in factory method', () => {
      const intervals = [
        { interval: { start: 10, end: 20 }, data: 'A' },
        { interval: { start: 15, end: 25 }, data: 'B' },
      ];

      const tree = IntervalTree.from(intervals, { balanced: true });

      expect(tree.size).toBe(2);
      expect(tree.validate()).toBe(true);
    });
  });

  describe('IntervalUtils', () => {
    it('should check interval overlap', () => {
      expect(
        IntervalUtils.overlaps({ start: 10, end: 20 }, { start: 15, end: 25 })
      ).toBe(true);
      expect(
        IntervalUtils.overlaps({ start: 10, end: 20 }, { start: 21, end: 30 })
      ).toBe(false);
      expect(
        IntervalUtils.overlaps({ start: 10, end: 20 }, { start: 20, end: 30 })
      ).toBe(true);
    });

    it('should check if interval contains point', () => {
      expect(IntervalUtils.contains({ start: 10, end: 20 }, 15)).toBe(true);
      expect(IntervalUtils.contains({ start: 10, end: 20 }, 10)).toBe(true);
      expect(IntervalUtils.contains({ start: 10, end: 20 }, 20)).toBe(true);
      expect(IntervalUtils.contains({ start: 10, end: 20 }, 25)).toBe(false);
    });

    it('should check if interval contains another interval', () => {
      expect(
        IntervalUtils.containsInterval(
          { start: 10, end: 30 },
          { start: 15, end: 25 }
        )
      ).toBe(true);
      expect(
        IntervalUtils.containsInterval(
          { start: 10, end: 30 },
          { start: 10, end: 30 }
        )
      ).toBe(true);
      expect(
        IntervalUtils.containsInterval(
          { start: 10, end: 30 },
          { start: 5, end: 25 }
        )
      ).toBe(false);
    });

    it('should find intersection', () => {
      const result = IntervalUtils.intersection(
        { start: 10, end: 20 },
        { start: 15, end: 25 }
      );
      expect(result).toEqual({ start: 15, end: 20 });

      const noIntersection = IntervalUtils.intersection(
        { start: 10, end: 20 },
        { start: 25, end: 30 }
      );
      expect(noIntersection).toBeUndefined();
    });

    it('should find union', () => {
      const result = IntervalUtils.union(
        { start: 10, end: 20 },
        { start: 15, end: 25 }
      );
      expect(result).toEqual({ start: 10, end: 25 });

      const noUnion = IntervalUtils.union(
        { start: 10, end: 20 },
        { start: 25, end: 30 }
      );
      expect(noUnion).toBeUndefined();
    });

    it('should merge overlapping intervals', () => {
      const intervals = [
        { start: 10, end: 20 },
        { start: 15, end: 25 },
        { start: 30, end: 40 },
        { start: 35, end: 50 },
        { start: 5, end: 12 },
      ];

      const merged = IntervalUtils.mergeOverlapping(intervals);

      expect(merged).toHaveLength(2);
      expect(merged).toEqual([
        { start: 5, end: 25 },
        { start: 30, end: 50 },
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle point intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 10 }, 'Point');

      const results = tree.searchPoint(10);
      expect(results).toHaveLength(1);

      const noResults = tree.searchPoint(11);
      expect(noResults).toHaveLength(0);
    });

    it('should handle negative intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: -20, end: -10 }, 'A');
      tree.insert({ start: -15, end: 5 }, 'B');

      const results = tree.search({ start: -12, end: 0 });
      expect(results).toHaveLength(2);
    });

    it('should handle very large intervals', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 0, end: 1000000 }, 'Large');
      tree.insert({ start: 500, end: 600 }, 'Small');

      const results = tree.searchPoint(550);
      expect(results).toHaveLength(2);
    });

    it('should validate tree structure', () => {
      const tree = new IntervalTree<string>();
      tree.insert({ start: 10, end: 20 }, 'A');
      tree.insert({ start: 5, end: 15 }, 'B');
      tree.insert({ start: 20, end: 30 }, 'C');

      expect(tree.validate()).toBe(true);
    });

    it('should work with complex data types', () => {
      interface Task {
        id: string;
        name: string;
        priority: number;
      }

      const tree = new IntervalTree<Task>();
      tree.insert({ start: 10, end: 20 }, { id: '1', name: 'Task 1', priority: 5 });
      tree.insert({ start: 15, end: 25 }, { id: '2', name: 'Task 2', priority: 3 });

      const results = tree.searchPoint(18);
      expect(results).toHaveLength(2);
      expect(results[0].data.name).toBeDefined();
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large datasets efficiently', () => {
      const tree = new IntervalTree<number>({ balanced: true });
      const n = 1000;

      const startInsert = performance.now();
      for (let i = 0; i < n; i++) {
        tree.insert({ start: i, end: i + 100 }, i);
      }
      const insertTime = performance.now() - startInsert;

      expect(tree.size).toBe(n);
      expect(insertTime).toBeLessThan(100); // Should be fast

      const startSearch = performance.now();
      for (let i = 0; i < 100; i++) {
        tree.search({ start: i * 10, end: i * 10 + 50 });
      }
      const searchTime = performance.now() - startSearch;

      expect(searchTime).toBeLessThan(50); // Should be fast
    });

    it('should have logarithmic search time for balanced tree', () => {
      const tree = new IntervalTree<number>({ balanced: true });

      for (let i = 0; i < 10000; i++) {
        tree.insert({ start: i * 10, end: i * 10 + 5 }, i);
      }

      const start = performance.now();
      tree.search({ start: 5000, end: 5010 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5); // O(log n) should be very fast
    });
  });

  describe('Real-world Use Cases', () => {
    it('should handle scheduling conflicts', () => {
      interface Meeting {
        title: string;
        room: string;
      }

      const tree = new IntervalTree<Meeting>();

      tree.insert(
        { start: 9, end: 10 },
        { title: 'Team Standup', room: 'Room A' }
      );
      tree.insert(
        { start: 10, end: 11 },
        { title: 'Design Review', room: 'Room B' }
      );
      tree.insert(
        { start: 9.5, end: 10.5 },
        { title: 'Client Call', room: 'Room A' }
      );

      const conflicts = tree.search({ start: 9.5, end: 10 });
      expect(conflicts).toHaveLength(2);
    });

    it('should handle virtual scrolling ranges', () => {
      const tree = new IntervalTree<string>();

      // Visible rows
      tree.insert({ start: 100, end: 200 }, 'visible-rows');
      tree.insert({ start: 50, end: 150 }, 'buffer-rows');

      const visibleRange = tree.search({ start: 120, end: 180 });
      expect(visibleRange).toHaveLength(2);
    });
  });
});
