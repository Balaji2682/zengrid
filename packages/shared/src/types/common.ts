/**
 * Common types used across ZenGrid algorithms and data structures
 */

/**
 * Comparator function for sorting and ordering
 * @returns Negative if a < b, zero if a === b, positive if a > b
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Predicate function for filtering
 * @returns true if the value matches the condition
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * Equality function for comparing values
 * @returns true if values are equal
 */
export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Hash function for creating keys from values
 * @returns string representation of the value
 */
export type HashFn<T> = (value: T) => string;

/**
 * Generic range interface
 */
export interface Range {
  start: number;
  end: number;
}

/**
 * 2D rectangle interface
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 2D point interface
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
