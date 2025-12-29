/**
 * @fileoverview Hit testing interfaces for mouse interaction
 * @module @zengrid/core/selection/hit-tester
 */

import type { CellRef } from '../types';

/**
 * Result of a hit test operation
 */
export interface HitTestResult {
  /**
   * Whether the point is within the grid
   */
  hit: boolean;

  /**
   * Cell reference if hit, undefined otherwise
   */
  cell?: CellRef;

  /**
   * Precise x offset within the cell (0-1, where 0 is left edge, 1 is right edge)
   */
  cellOffsetX?: number;

  /**
   * Precise y offset within the cell (0-1, where 0 is top edge, 1 is bottom edge)
   */
  cellOffsetY?: number;

  /**
   * Absolute x position of cell's left edge
   */
  cellLeft?: number;

  /**
   * Absolute y position of cell's top edge
   */
  cellTop?: number;

  /**
   * Cell width in pixels
   */
  cellWidth?: number;

  /**
   * Cell height in pixels
   */
  cellHeight?: number;
}

/**
 * Options for hit testing
 */
export interface HitTestOptions {
  /**
   * Whether to allow hits outside grid boundaries
   * If true, returns nearest cell; if false, returns null
   * @default false
   */
  allowOutside?: boolean;

  /**
   * Whether to include precise offset information
   * @default false
   */
  includePreciseOffset?: boolean;

  /**
   * Scroll offset (if point is in viewport coordinates)
   */
  scrollOffset?: {
    top: number;
    left: number;
  };
}

/**
 * Interface for height providers (uniform or variable)
 */
export interface IHeightProvider {
  /**
   * Get height of a specific row
   */
  getHeight(index: number): number;

  /**
   * Get offset to a specific row
   */
  getOffset(index: number): number;

  /**
   * Find row at given offset
   */
  findIndexAtOffset(offset: number): number;

  /**
   * Get total height of all rows
   */
  getTotalSize(): number;
}

/**
 * Interface for width providers (uniform or variable)
 */
export interface IWidthProvider {
  /**
   * Get width of a specific column
   */
  getWidth(index: number): number;

  /**
   * Get offset to a specific column
   */
  getOffset(index: number): number;

  /**
   * Find column at given offset
   */
  findIndexAtOffset(offset: number): number;

  /**
   * Get total width of all columns
   */
  getTotalSize(): number;
}
