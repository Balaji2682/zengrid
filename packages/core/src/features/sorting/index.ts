/**
 * Row sorting functionality
 *
 * Provides non-destructive row sorting by column values.
 * Returns IndexMaps that remap visual indices to data indices.
 *
 * @packageDocumentation
 */

export type { RowSorter, SortOptions, NullPosition } from './row-sorter.interface';
export { SingleColumnSorter } from './single-column-sorter';

export { SortManager } from './sort-manager';
export type { SortManagerOptions } from './sort-manager';
