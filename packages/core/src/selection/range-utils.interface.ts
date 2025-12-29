/**
 * @fileoverview Range utilities interfaces for selection system
 * @module @zengrid/core/selection/range-utils
 */

import type { CellRange } from '../types';

/**
 * Result of range intersection check
 */
export interface RangeIntersection {
  /**
   * Whether ranges intersect
   */
  intersects: boolean;

  /**
   * Intersection range if ranges intersect
   */
  intersection?: CellRange;
}

/**
 * Range size information
 */
export interface RangeSize {
  /**
   * Number of rows in range
   */
  rows: number;

  /**
   * Number of columns in range
   */
  cols: number;

  /**
   * Total cells in range
   */
  totalCells: number;
}

/**
 * Options for merging ranges
 */
export interface MergeRangesOptions {
  /**
   * Whether to merge adjacent (touching) ranges
   * @default false
   */
  mergeAdjacent?: boolean;

  /**
   * Whether to sort ranges before merging
   * @default true
   */
  sort?: boolean;
}
