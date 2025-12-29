/**
 * Tests for Disjoint Set (Union-Find)
 */

import { DisjointSet } from './disjoint-set';
import { DisjointSetUtils } from './disjoint-set.interface';

describe('DisjointSet', () => {
  describe('Basic Operations', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
    });

    it('should create sets for elements', () => {
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);

      expect(ds.size).toBe(3);
      expect(ds.numSets).toBe(3);
      expect(ds.has(1)).toBe(true);
      expect(ds.has(2)).toBe(true);
      expect(ds.has(3)).toBe(true);
      expect(ds.has(4)).toBe(false);
    });

    it('should not create duplicate sets', () => {
      ds.makeSet(1);
      ds.makeSet(1);
      ds.makeSet(1);

      expect(ds.size).toBe(1);
      expect(ds.numSets).toBe(1);
    });

    it('should find representative of a set', () => {
      ds.makeSet(1);
      const root = ds.find(1);
      expect(root).toBe(1);
    });

    it('should return undefined for non-existent elements', () => {
      expect(ds.find(999)).toBeUndefined();
    });

    it('should check if element exists', () => {
      ds.makeSet(1);
      expect(ds.has(1)).toBe(true);
      expect(ds.has(2)).toBe(false);
    });
  });

  describe('Union Operations', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
      ds.makeSet(4);
      ds.makeSet(5);
    });

    it('should unite two sets', () => {
      const result = ds.union(1, 2);
      expect(result).toBe(true);
      expect(ds.numSets).toBe(4);
      expect(ds.connected(1, 2)).toBe(true);
    });

    it('should not unite if elements are already in same set', () => {
      ds.union(1, 2);
      const result = ds.union(1, 2);
      expect(result).toBe(false);
      expect(ds.numSets).toBe(4);
    });

    it('should return false if element does not exist', () => {
      const result = ds.union(1, 999);
      expect(result).toBe(false);
    });

    it('should transitively connect sets', () => {
      ds.union(1, 2);
      ds.union(2, 3);

      expect(ds.connected(1, 2)).toBe(true);
      expect(ds.connected(2, 3)).toBe(true);
      expect(ds.connected(1, 3)).toBe(true);
      expect(ds.connected(1, 4)).toBe(false);
    });

    it('should merge multiple sets', () => {
      ds.union(1, 2);
      ds.union(3, 4);
      ds.union(2, 3);

      expect(ds.numSets).toBe(2);
      expect(ds.connected(1, 4)).toBe(true);
      expect(ds.connected(1, 5)).toBe(false);
    });
  });

  describe('Connected Check', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
    });

    it('should check if elements are connected', () => {
      expect(ds.connected(1, 2)).toBe(false);
      ds.union(1, 2);
      expect(ds.connected(1, 2)).toBe(true);
    });

    it('should return false for non-existent elements', () => {
      expect(ds.connected(1, 999)).toBe(false);
      expect(ds.connected(999, 888)).toBe(false);
    });

    it('should check transitivity', () => {
      ds.union(1, 2);
      ds.union(2, 3);
      expect(ds.connected(1, 3)).toBe(true);
    });
  });

  describe('Set Size', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
      ds.makeSet(4);
    });

    it('should return size of singleton set', () => {
      expect(ds.getSetSize(1)).toBe(1);
      expect(ds.getSetSize(2)).toBe(1);
    });

    it('should return size after union', () => {
      ds.union(1, 2);
      expect(ds.getSetSize(1)).toBe(2);
      expect(ds.getSetSize(2)).toBe(2);
    });

    it('should return size after multiple unions', () => {
      ds.union(1, 2);
      ds.union(2, 3);
      ds.union(3, 4);

      expect(ds.getSetSize(1)).toBe(4);
      expect(ds.getSetSize(2)).toBe(4);
      expect(ds.getSetSize(3)).toBe(4);
      expect(ds.getSetSize(4)).toBe(4);
    });

    it('should return 0 for non-existent element', () => {
      expect(ds.getSetSize(999)).toBe(0);
    });
  });

  describe('Get Sets', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
      ds.makeSet(4);
      ds.makeSet(5);
    });

    it('should get all disjoint sets', () => {
      ds.union(1, 2);
      ds.union(3, 4);

      const sets = ds.getSets();
      expect(sets.size).toBe(3); // {1,2}, {3,4}, {5}
    });

    it('should get correct set members', () => {
      ds.union(1, 2);
      ds.union(2, 3);

      const sets = ds.getSets();
      const bigSet = Array.from(sets.values()).find((s) => s.length === 3);
      expect(bigSet?.sort()).toEqual([1, 2, 3]);
    });

    it('should get single element set', () => {
      const set = ds.getSet(1);
      expect(set).toEqual([1]);
    });

    it('should get merged set', () => {
      ds.union(1, 2);
      ds.union(2, 3);

      const set = ds.getSet(1);
      expect(set.sort()).toEqual([1, 2, 3]);
    });

    it('should return empty array for non-existent element', () => {
      const set = ds.getSet(999);
      expect(set).toEqual([]);
    });
  });

  describe('Remove Operation', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
    });

    it('should remove element from singleton set', () => {
      const result = ds.remove(1);
      expect(result).toBe(true);
      expect(ds.has(1)).toBe(false);
      expect(ds.size).toBe(2);
    });

    it('should return false for non-existent element', () => {
      const result = ds.remove(999);
      expect(result).toBe(false);
    });

    it('should remove element from merged set', () => {
      ds.union(1, 2);
      ds.remove(1);

      expect(ds.has(1)).toBe(false);
      expect(ds.has(2)).toBe(true);
      expect(ds.getSetSize(2)).toBe(1);
    });

    it('should handle removing root element', () => {
      ds.union(1, 2);
      ds.union(2, 3);

      const root = ds.find(1)!;
      ds.remove(root);

      expect(ds.has(root)).toBe(false);
      expect(ds.size).toBe(2);
    });
  });

  describe('Clear and Empty', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
    });

    it('should start empty', () => {
      expect(ds.isEmpty).toBe(true);
      expect(ds.size).toBe(0);
      expect(ds.numSets).toBe(0);
    });

    it('should not be empty after adding elements', () => {
      ds.makeSet(1);
      expect(ds.isEmpty).toBe(false);
      expect(ds.size).toBe(1);
    });

    it('should clear all elements', () => {
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
      ds.clear();

      expect(ds.isEmpty).toBe(true);
      expect(ds.size).toBe(0);
      expect(ds.numSets).toBe(0);
    });
  });

  describe('Elements', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
    });

    it('should get all elements', () => {
      const elements = ds.elements();
      expect(elements.sort()).toEqual([1, 2, 3]);
    });

    it('should return empty array for empty set', () => {
      ds.clear();
      const elements = ds.elements();
      expect(elements).toEqual([]);
    });
  });

  describe('Statistics', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
    });

    it('should get stats for empty set', () => {
      const stats = ds.getStats();
      expect(stats.totalElements).toBe(0);
      expect(stats.numSets).toBe(0);
      expect(stats.largestSetSize).toBe(0);
      expect(stats.averageSetSize).toBe(0);
    });

    it('should get stats for singleton sets', () => {
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);

      const stats = ds.getStats();
      expect(stats.totalElements).toBe(3);
      expect(stats.numSets).toBe(3);
      expect(stats.largestSetSize).toBe(1);
      expect(stats.averageSetSize).toBe(1);
    });

    it('should get stats after unions', () => {
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
      ds.makeSet(4);
      ds.union(1, 2);
      ds.union(2, 3);

      const stats = ds.getStats();
      expect(stats.totalElements).toBe(4);
      expect(stats.numSets).toBe(2);
      expect(stats.largestSetSize).toBe(3);
    });
  });

  describe('Custom Hash and Equality Functions', () => {
    it('should work with custom hash function for objects', () => {
      type Point = { x: number; y: number };

      const ds = new DisjointSet<Point>({
        hashFn: (p) => `${p.x},${p.y}`,
        equalityFn: (a, b) => a.x === b.x && a.y === b.y,
      });

      const p1 = { x: 1, y: 2 };
      const p2 = { x: 3, y: 4 };
      const p3 = { x: 1, y: 2 }; // Same as p1

      ds.makeSet(p1);
      ds.makeSet(p2);

      expect(ds.size).toBe(2);
      expect(ds.has(p3)).toBe(true); // Should find p1 via custom hash
    });

    it('should work with grid coordinates', () => {
      const ds = new DisjointSet<[number, number]>({
        hashFn: DisjointSetUtils.gridHashFn,
        equalityFn: DisjointSetUtils.gridEqualityFn,
      });

      ds.makeSet([0, 0]);
      ds.makeSet([0, 1]);
      ds.makeSet([1, 0]);
      ds.makeSet([1, 1]);

      ds.union([0, 0], [0, 1]);
      ds.union([1, 0], [1, 1]);

      expect(ds.numSets).toBe(2);
      expect(ds.connected([0, 0], [0, 1])).toBe(true);
      expect(ds.connected([0, 0], [1, 0])).toBe(false);
    });
  });

  describe('Initial Elements', () => {
    it('should initialize with initial elements', () => {
      const ds = new DisjointSet<number>({
        initialElements: [1, 2, 3, 4, 5],
      });

      expect(ds.size).toBe(5);
      expect(ds.numSets).toBe(5);
      expect(ds.has(1)).toBe(true);
      expect(ds.has(5)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    let ds: DisjointSet<number>;

    beforeEach(() => {
      ds = new DisjointSet<number>();
    });

    it('should handle single element', () => {
      ds.makeSet(1);
      expect(ds.find(1)).toBe(1);
      expect(ds.getSetSize(1)).toBe(1);
    });

    it('should handle long chain unions', () => {
      for (let i = 1; i <= 100; i++) {
        ds.makeSet(i);
      }

      // Create a long chain: 1-2-3-...-100
      for (let i = 1; i < 100; i++) {
        ds.union(i, i + 1);
      }

      expect(ds.numSets).toBe(1);
      expect(ds.getSetSize(1)).toBe(100);
      expect(ds.connected(1, 100)).toBe(true);
    });

    it('should handle path compression', () => {
      // Create a chain
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
      ds.makeSet(4);

      ds.union(1, 2);
      ds.union(2, 3);
      ds.union(3, 4);

      // Find should compress the path
      const root = ds.find(4);
      expect(root).toBeDefined();

      // All elements should now point closer to root
      expect(ds.find(1)).toBe(root);
      expect(ds.find(2)).toBe(root);
      expect(ds.find(3)).toBe(root);
    });

    it('should handle union by rank', () => {
      // Create two trees of different sizes
      ds.makeSet(1);
      ds.makeSet(2);
      ds.makeSet(3);
      ds.makeSet(4);
      ds.makeSet(5);

      ds.union(1, 2);
      ds.union(3, 4);
      ds.union(4, 5);

      // Tree with 3,4,5 is larger, should become root
      ds.union(1, 3);

      expect(ds.numSets).toBe(1);
      expect(ds.getSetSize(1)).toBe(5);
    });
  });

  describe('Merged Cells Use Case', () => {
    it('should manage merged cells in a grid', () => {
      type Cell = [number, number];

      const ds = new DisjointSet<Cell>({
        hashFn: DisjointSetUtils.gridHashFn,
        equalityFn: DisjointSetUtils.gridEqualityFn,
      });

      // Create a 5x5 grid
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          ds.makeSet([row, col]);
        }
      }

      expect(ds.size).toBe(25);

      // Merge cells (0,0) to (0,2) - horizontal merge
      ds.union([0, 0], [0, 1]);
      ds.union([0, 1], [0, 2]);

      // Merge cells (2,2) to (3,3) - 2x2 block
      ds.union([2, 2], [2, 3]);
      ds.union([3, 2], [3, 3]);
      ds.union([2, 2], [3, 2]);

      expect(ds.connected([0, 0], [0, 2])).toBe(true);
      expect(ds.getSetSize([0, 0])).toBe(3);
      expect(ds.getSetSize([2, 2])).toBe(4);
    });
  });

  describe('DisjointSetUtils', () => {
    it('should calculate inverse Ackermann function', () => {
      expect(DisjointSetUtils.inverseAckermann(0)).toBe(0);
      expect(DisjointSetUtils.inverseAckermann(1)).toBe(1);
      expect(DisjointSetUtils.inverseAckermann(2)).toBe(2);
      expect(DisjointSetUtils.inverseAckermann(3)).toBe(2);
      expect(DisjointSetUtils.inverseAckermann(7)).toBe(3);
      expect(DisjointSetUtils.inverseAckermann(1000)).toBe(4);
      expect(DisjointSetUtils.inverseAckermann(1000000)).toBe(4);
    });

    it('should estimate memory usage', () => {
      const memory = DisjointSetUtils.estimateMemory(1000);
      expect(memory).toBeGreaterThan(0);
      expect(memory).toBe(1000 * 32 * 3);
    });
  });
});
