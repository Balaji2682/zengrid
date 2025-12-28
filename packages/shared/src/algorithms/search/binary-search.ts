import type { Comparator } from '../../types';

/**
 * Options for binary search
 */
export interface BinarySearchOptions<T> {
  /**
   * Custom comparator function
   * @default (a, b) => a - b for numbers
   */
  comparator?: Comparator<T>;

  /**
   * If true, returns insertion point when not found
   * Insertion point is the index where the target should be inserted
   * @default false
   */
  returnInsertionPoint?: boolean;
}

/**
 * Result of binary search
 */
export interface BinarySearchResult {
  /**
   * Whether the target was found
   */
  found: boolean;

  /**
   * Index where target was found, or -1 if not found
   * If returnInsertionPoint is true and not found, returns insertion index
   */
  index: number;
}

/**
 * Default number comparator
 */
const defaultComparator: Comparator<number> = (a, b) => a - b;

/**
 * Performs binary search on a sorted array
 *
 * @param array - Sorted array to search
 * @param target - Value to find
 * @param options - Search options
 * @returns Search result with found status and index
 *
 * @example
 * ```typescript
 * const result = binarySearch([1, 3, 5, 7, 9], 5);
 * // { found: true, index: 2 }
 *
 * const result2 = binarySearch([1, 3, 5, 7], 4, { returnInsertionPoint: true });
 * // { found: false, index: 2 } - insert at index 2 to maintain order
 * ```
 *
 * @complexity O(log n) where n = array.length
 */
export function binarySearch<T>(
  array: ReadonlyArray<T>,
  target: T,
  options: BinarySearchOptions<T> = {}
): BinarySearchResult {
  const comparator = (options.comparator ?? defaultComparator) as Comparator<T>;
  const returnInsertionPoint = options.returnInsertionPoint ?? false;

  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    // Use >>> to avoid overflow (same as Math.floor((left + right) / 2))
    const mid = (left + right) >>> 1;
    const cmp = comparator(array[mid], target);

    if (cmp === 0) {
      // Found exact match
      return { found: true, index: mid };
    } else if (cmp < 0) {
      // array[mid] < target, search right half
      left = mid + 1;
    } else {
      // array[mid] > target, search left half
      right = mid - 1;
    }
  }

  // Not found
  if (returnInsertionPoint) {
    // left is the insertion point
    return { found: false, index: left };
  } else {
    return { found: false, index: -1 };
  }
}

/**
 * Find the leftmost (first) occurrence of target in sorted array
 *
 * @param array - Sorted array (may have duplicates)
 * @param target - Value to find
 * @param comparator - Custom comparator
 * @returns Index of first occurrence, or -1 if not found
 *
 * @example
 * ```typescript
 * const index = binarySearchLeft([1, 2, 2, 2, 3], 2);
 * // 1 (first occurrence of 2)
 * ```
 *
 * @complexity O(log n)
 */
export function binarySearchLeft<T>(
  array: ReadonlyArray<T>,
  target: T,
  comparator: Comparator<T> = defaultComparator as Comparator<T>
): number {
  let left = 0;
  let right = array.length;

  while (left < right) {
    const mid = (left + right) >>> 1;
    const cmp = comparator(array[mid], target);

    if (cmp < 0) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  // Check if we found the target
  if (left < array.length && comparator(array[left], target) === 0) {
    return left;
  }

  return -1;
}

/**
 * Find the rightmost (last) occurrence of target in sorted array
 *
 * @param array - Sorted array (may have duplicates)
 * @param target - Value to find
 * @param comparator - Custom comparator
 * @returns Index of last occurrence, or -1 if not found
 *
 * @example
 * ```typescript
 * const index = binarySearchRight([1, 2, 2, 2, 3], 2);
 * // 3 (last occurrence of 2)
 * ```
 *
 * @complexity O(log n)
 */
export function binarySearchRight<T>(
  array: ReadonlyArray<T>,
  target: T,
  comparator: Comparator<T> = defaultComparator as Comparator<T>
): number {
  let left = 0;
  let right = array.length;

  while (left < right) {
    const mid = (left + right) >>> 1;
    const cmp = comparator(array[mid], target);

    if (cmp <= 0) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  // Check if we found the target (left is one past the last occurrence)
  if (left > 0 && comparator(array[left - 1], target) === 0) {
    return left - 1;
  }

  return -1;
}
