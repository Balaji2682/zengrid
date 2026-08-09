/**
 * HeaderManager types and interfaces
 */

import type { SortState, FilterModel, GridOptions } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { ColumnModel } from '../../features/columns/column-model';
import type {
  HeaderRenderer,
  HeaderRenderParams,
} from '../../rendering/headers/header-renderer.interface';

/** Default header row height in pixels when `headerHeight` is not configured. */
export const DEFAULT_HEADER_HEIGHT = 40;

/**
 * Resolve the header row height from grid options, falling back to the default.
 * A non-positive value falls back to the default to avoid a collapsed header.
 */
export function resolveHeaderHeight(options: GridOptions): number {
  const h = options.headerHeight;
  return typeof h === 'number' && h > 0 ? h : DEFAULT_HEADER_HEIGHT;
}

/** Number of grouped-header banner rows above the leaf headers (0 when off). */
export function resolveColumnGroupLevels(options: GridOptions): number {
  const levels = options.colGroupProvider?.levels ?? 0;
  return Number.isInteger(levels) && levels > 0 ? levels : 0;
}

/**
 * Total header area height: the leaf-header row plus one row per group banner
 * level. Used to offset the body and size the header container. Equals the plain
 * `resolveHeaderHeight` when no column-group provider is set.
 */
export function resolveTotalHeaderHeight(options: GridOptions): number {
  const base = resolveHeaderHeight(options);
  return base * (1 + resolveColumnGroupLevels(options));
}

/**
 * Configuration for HeaderManager
 */
export interface HeaderManagerConfig {
  /** Reactive column model */
  columnModel: ColumnModel;

  /** Header container element */
  container: HTMLElement;

  /** Event emitter for grid events */
  eventEmitter: EventEmitter<GridEvents>;

  /** Get current sort state */
  getSortState?: () => SortState[];

  /** Get current filter state */
  getFilterState?: () => FilterModel[];

  /** Header height in pixels (default: 40) */
  headerHeight?: number;

  /** Enable horizontal scroll sync (default: true) */
  enableScrollSync?: boolean;
}

/**
 * Header cell metadata
 */
export interface HeaderCellMetadata {
  element: HTMLElement;
  renderer: HeaderRenderer;
  columnId: string;
  columnIndex: number;
  lastParams?: HeaderRenderParams;
}
