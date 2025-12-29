import type { Comparator } from '../../types/common';
import type { NullPosition } from './sorting.interface';

/**
 * Options for string comparator
 */
export interface StringComparatorOptions {
  /** Case-insensitive comparison */
  caseInsensitive?: boolean;

  /** Use locale-aware comparison */
  localeCompare?: boolean;

  /** Locale for comparison (e.g., 'en-US') */
  locale?: string;

  /** Where to place null/undefined values */
  nullPosition?: NullPosition;
}

/**
 * Helper to handle null values in comparisons
 */
function compareWithNulls<T>(
  a: T | null | undefined,
  b: T | null | undefined,
  nullPosition: NullPosition,
  compareFn: (a: T, b: T) => number
): number {
  const aIsNull = a === null || a === undefined || Number.isNaN(a);
  const bIsNull = b === null || b === undefined || Number.isNaN(b);

  if (aIsNull && bIsNull) return 0;

  if (aIsNull) {
    return nullPosition === 'first' ? -1 : nullPosition === 'last' ? 1 : 0;
  }

  if (bIsNull) {
    return nullPosition === 'first' ? 1 : nullPosition === 'last' ? -1 : 0;
  }

  return compareFn(a as T, b as T);
}

/**
 * Create a numeric comparator
 *
 * @param nullPosition - Where to place null values in sort order
 * @returns Comparator function
 *
 * @example
 * ```typescript
 * const numbers = [3, null, 1, undefined, 2];
 * numbers.sort(numericComparator('last'));
 * // [1, 2, 3, null, undefined]
 * ```
 */
export function numericComparator(
  nullPosition: NullPosition = 'last'
): Comparator<any> {
  return (a: any, b: any) => {
    return compareWithNulls(a, b, nullPosition, (x, y) => {
      const numX = Number(x);
      const numY = Number(y);

      if (Number.isNaN(numX) && Number.isNaN(numY)) return 0;
      if (Number.isNaN(numX)) return nullPosition === 'last' ? 1 : -1;
      if (Number.isNaN(numY)) return nullPosition === 'last' ? -1 : 1;

      return numX - numY;
    });
  };
}

/**
 * Create a string comparator
 *
 * @param options - Comparator options
 * @returns Comparator function
 *
 * @example
 * ```typescript
 * const names = ['Bob', 'alice', 'Charlie'];
 * names.sort(stringComparator({ caseInsensitive: true }));
 * // ['alice', 'Bob', 'Charlie']
 * ```
 */
export function stringComparator(
  options: StringComparatorOptions = {}
): Comparator<any> {
  const {
    caseInsensitive = false,
    localeCompare = false,
    locale = 'en-US',
    nullPosition = 'last',
  } = options;

  return (a: any, b: any) => {
    return compareWithNulls(a, b, nullPosition, (x, y) => {
      let strA = String(x);
      let strB = String(y);

      if (caseInsensitive) {
        strA = strA.toLowerCase();
        strB = strB.toLowerCase();
      }

      if (localeCompare) {
        return strA.localeCompare(strB, locale);
      }

      return strA < strB ? -1 : strA > strB ? 1 : 0;
    });
  };
}

/**
 * Create a date comparator
 *
 * @param nullPosition - Where to place null values
 * @returns Comparator function
 *
 * @example
 * ```typescript
 * const dates = [new Date('2023-01-15'), null, new Date('2023-01-01')];
 * dates.sort(dateComparator('last'));
 * // [2023-01-01, 2023-01-15, null]
 * ```
 */
export function dateComparator(
  nullPosition: NullPosition = 'last'
): Comparator<any> {
  return (a: any, b: any) => {
    return compareWithNulls(a, b, nullPosition, (x, y) => {
      const dateA = x instanceof Date ? x : new Date(x);
      const dateB = y instanceof Date ? y : new Date(y);

      const timeA = dateA.getTime();
      const timeB = dateB.getTime();

      if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
      if (Number.isNaN(timeA)) return nullPosition === 'last' ? 1 : -1;
      if (Number.isNaN(timeB)) return nullPosition === 'last' ? -1 : 1;

      return timeA - timeB;
    });
  };
}

/**
 * Create a boolean comparator (false < true)
 *
 * @param nullPosition - Where to place null values
 * @returns Comparator function
 *
 * @example
 * ```typescript
 * const values = [true, null, false, true];
 * values.sort(booleanComparator('last'));
 * // [false, true, true, null]
 * ```
 */
export function booleanComparator(
  nullPosition: NullPosition = 'last'
): Comparator<any> {
  return (a: any, b: any) => {
    return compareWithNulls(a, b, nullPosition, (x, y) => {
      const boolA = Boolean(x);
      const boolB = Boolean(y);
      return boolA === boolB ? 0 : boolA ? 1 : -1;
    });
  };
}

/**
 * Auto-detect type and create appropriate comparator
 *
 * @param sampleValues - Sample values to detect type from
 * @param options - Options for the comparator
 * @returns Comparator function
 *
 * @example
 * ```typescript
 * const data = [3, 1, 4, 1, 5];
 * data.sort(autoComparator(data));
 * // [1, 1, 3, 4, 5] - numeric comparison
 * ```
 */
export function autoComparator(
  sampleValues: any[],
  options: { nullPosition?: NullPosition } = {}
): Comparator<any> {
  const { nullPosition = 'last' } = options;

  // Find first non-null value to determine type
  const sample = sampleValues.find(
    (v) => v !== null && v !== undefined && !Number.isNaN(v)
  );

  if (sample === undefined) {
    // All nulls, use numeric comparator
    return numericComparator(nullPosition);
  }

  if (typeof sample === 'number') {
    return numericComparator(nullPosition);
  }

  if (typeof sample === 'boolean') {
    return booleanComparator(nullPosition);
  }

  if (sample instanceof Date) {
    return dateComparator(nullPosition);
  }

  // Default to string comparison
  return stringComparator({ nullPosition });
}

/**
 * Reverse a comparator (ascending to descending)
 *
 * @param comparator - Comparator to reverse
 * @returns Reversed comparator
 *
 * @example
 * ```typescript
 * const desc = reverseComparator(numericComparator());
 * [1, 2, 3].sort(desc);
 * // [3, 2, 1]
 * ```
 */
export function reverseComparator<T>(
  comparator: Comparator<T>
): Comparator<T> {
  return (a: T, b: T) => comparator(b, a);
}

/**
 * Chain multiple comparators (for multi-column sort)
 *
 * @param comparators - Comparators in priority order
 * @returns Chained comparator
 *
 * @example
 * ```typescript
 * // Sort by age, then by name
 * const data = [
 *   { age: 30, name: 'Bob' },
 *   { age: 25, name: 'Alice' },
 *   { age: 30, name: 'Charlie' }
 * ];
 *
 * data.sort(chainComparators(
 *   (a, b) => a.age - b.age,
 *   (a, b) => a.name.localeCompare(b.name)
 * ));
 * // Alice (25), Bob (30), Charlie (30)
 * ```
 */
export function chainComparators<T>(
  ...comparators: Comparator<T>[]
): Comparator<T> {
  return (a: T, b: T) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };
}
