/**
 * Interval Tree interfaces for ZenGrid
 * Efficiently finds all intervals that overlap with a given interval or point
 */

/**
 * Represents an interval with a start and end
 */
export interface Interval {
  /** Start of the interval (inclusive) */
  start: number;
  /** End of the interval (inclusive) */
  end: number;
}

/**
 * An interval with associated data
 */
export interface IntervalData<T> extends Interval {
  /** User data associated with this interval */
  data: T;
  /** Optional unique identifier */
  id?: string | number;
}

/**
 * Interval Tree interface
 *
 * An augmented binary search tree for efficient interval queries.
 * Each node stores an interval and the maximum endpoint in its subtree.
 *
 * Use cases:
 * - Finding all overlapping time ranges
 * - Range queries in calendars/schedules
 * - Collision detection (e.g., overlapping cells in a grid)
 * - Finding visible rows/columns in virtual scrolling
 * - Query optimization (index range scans)
 *
 * Performance:
 * - Insert: O(log n) average, O(n) worst case (use Red-Black tree for guaranteed O(log n))
 * - Delete: O(log n) average
 * - Search overlapping: O(log n + k) where k = number of results
 * - Point query: O(log n + k)
 * - Space: O(n)
 */
export interface IIntervalTree<T> {
  /**
   * Insert an interval with associated data
   * @param interval - The interval to insert
   * @param data - Data to associate with the interval
   * @returns The inserted interval with data
   * @complexity O(log n) average
   */
  insert(interval: Interval, data: T): IntervalData<T>;

  /**
   * Delete an interval by reference
   * @param intervalData - The interval to delete
   * @returns true if found and deleted
   * @complexity O(log n)
   */
  delete(intervalData: IntervalData<T>): boolean;

  /**
   * Delete an interval by ID
   * @param id - The ID of the interval to delete
   * @returns true if found and deleted
   * @complexity O(n) - requires linear search
   */
  deleteById(id: string | number): boolean;

  /**
   * Find all intervals that overlap with the given interval
   * @param interval - The query interval
   * @returns Array of overlapping intervals
   * @complexity O(log n + k) where k = number of results
   */
  search(interval: Interval): IntervalData<T>[];

  /**
   * Find all intervals that contain the given point
   * @param point - The point to query
   * @returns Array of intervals containing the point
   * @complexity O(log n + k) where k = number of results
   */
  searchPoint(point: number): IntervalData<T>[];

  /**
   * Find all intervals that are completely contained within the given interval
   * @param interval - The containing interval
   * @returns Array of contained intervals
   * @complexity O(n) worst case
   */
  searchContained(interval: Interval): IntervalData<T>[];

  /**
   * Find all intervals that completely contain the given interval
   * @param interval - The interval to be contained
   * @returns Array of containing intervals
   * @complexity O(n) worst case
   */
  searchContaining(interval: Interval): IntervalData<T>[];

  /**
   * Find the interval with the earliest start time
   * @returns The interval or undefined if tree is empty
   * @complexity O(log n)
   */
  findMin(): IntervalData<T> | undefined;

  /**
   * Find the interval with the latest end time
   * @returns The interval or undefined if tree is empty
   * @complexity O(log n)
   */
  findMax(): IntervalData<T> | undefined;

  /**
   * Check if any interval overlaps with the given interval
   * @param interval - The query interval
   * @complexity O(log n)
   */
  hasOverlap(interval: Interval): boolean;

  /**
   * Get all intervals in sorted order (by start time)
   * @returns Array of all intervals sorted by start
   * @complexity O(n)
   */
  inorder(): IntervalData<T>[];

  /**
   * Iterate over all intervals in sorted order
   * @param callback - Function to call for each interval
   * @complexity O(n)
   */
  forEach(callback: (interval: IntervalData<T>) => void): void;

  /**
   * Filter intervals by a predicate
   * @param predicate - Test function
   * @returns New interval tree with intervals that pass the test
   * @complexity O(n)
   */
  filter(predicate: (interval: IntervalData<T>) => boolean): IIntervalTree<T>;

  /**
   * Map intervals to a new interval tree
   * @param mapper - Transform function for the data
   * @returns New interval tree with transformed data
   * @complexity O(n)
   */
  map<U>(mapper: (data: T, interval: Interval) => U): IIntervalTree<U>;

  /**
   * Clear all intervals
   * @complexity O(1)
   */
  clear(): void;

  /**
   * Number of intervals in the tree
   */
  readonly size: number;

  /**
   * Whether the tree is empty
   */
  readonly isEmpty: boolean;

  /**
   * Height of the tree (for debugging/analysis)
   */
  readonly height: number;
}

/**
 * Options for creating an IntervalTree
 */
export interface IntervalTreeOptions {
  /**
   * Whether to use a balanced tree (Red-Black tree)
   * Guarantees O(log n) operations but slightly slower constants
   * @default false (uses simple BST)
   */
  balanced?: boolean;

  /**
   * Whether to allow duplicate intervals
   * @default true
   */
  allowDuplicates?: boolean;

  /**
   * Custom comparator for intervals
   * Defaults to comparing by start time, then end time
   */
  comparator?: (a: Interval, b: Interval) => number;
}

/**
 * Helper functions for interval operations
 */
export const IntervalUtils = {
  /**
   * Check if two intervals overlap
   */
  overlaps(a: Interval, b: Interval): boolean {
    return a.start <= b.end && b.start <= a.end;
  },

  /**
   * Check if interval contains a point
   */
  contains(interval: Interval, point: number): boolean {
    return interval.start <= point && point <= interval.end;
  },

  /**
   * Check if interval A contains interval B
   */
  containsInterval(a: Interval, b: Interval): boolean {
    return a.start <= b.start && b.end <= a.end;
  },

  /**
   * Get the intersection of two intervals
   * Returns undefined if they don't overlap
   */
  intersection(a: Interval, b: Interval): Interval | undefined {
    if (!this.overlaps(a, b)) {
      return undefined;
    }
    return {
      start: Math.max(a.start, b.start),
      end: Math.min(a.end, b.end),
    };
  },

  /**
   * Get the union of two overlapping intervals
   * Returns undefined if they don't overlap
   */
  union(a: Interval, b: Interval): Interval | undefined {
    if (!this.overlaps(a, b)) {
      return undefined;
    }
    return {
      start: Math.min(a.start, b.start),
      end: Math.max(a.end, b.end),
    };
  },

  /**
   * Merge overlapping intervals
   */
  mergeOverlapping(intervals: Interval[]): Interval[] {
    if (intervals.length === 0) return [];

    // Sort by start time
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged: Interval[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (this.overlaps(last, current)) {
        // Merge overlapping intervals
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }

    return merged;
  },

  /**
   * Default comparator: compare by start, then by end
   */
  defaultComparator(a: Interval, b: Interval): number {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return a.end - b.end;
  },
};
