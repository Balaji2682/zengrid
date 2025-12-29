/**
 * Sorting algorithms and comparators
 * @packageDocumentation
 */

export type {
  NullPosition,
  TimsortOptions,
  SortMetadata,
} from './sorting.interface';

export {
  numericComparator,
  stringComparator,
  dateComparator,
  booleanComparator,
  autoComparator,
  reverseComparator,
  chainComparators,
} from './comparators';

export type { StringComparatorOptions } from './comparators';

export { timsort, timsortIndices, isSorted } from './timsort';
