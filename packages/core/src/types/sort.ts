/**
 * Sort types
 */

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Sort state for a column
 */
export interface SortState {
  column: number;
  direction: SortDirection;
  sortIndex?: number; // For multi-column sort
}

/**
 * Backend-friendly sort descriptor derived from the grid sort state
 */
export interface SortDescriptor {
  column: number;
  field?: string;
  direction: Exclude<SortDirection, null>;
  sortIndex: number;
}
