/**
 * HeaderManager - Rendering operations
 */

import type { ColumnModel } from '../../features/columns/column-model';
import type { HeaderCellMetadata, HeaderManagerConfig } from './header-types';
import { HeaderRendererRegistry } from '../../rendering/headers/header-registry';
import { buildRenderParams } from './header-render-params';
import { renderHeaderCell, applyHeaderCellSizing } from './header-dom-operations';

/**
 * Render all headers
 */
export function renderAllHeaders(
  columnModel: ColumnModel,
  headerCellsContainer: HTMLElement | null,
  headerCells: Map<string, HeaderCellMetadata>,
  registry: HeaderRendererRegistry,
  config: HeaderManagerConfig,
  headerHeight: number
): void {
  if (!headerCellsContainer) return;

  // Get visible columns in order from column model
  const columns = columnModel
    .getColumns()
    .filter((col) => col.visible)
    .sort((a, b) => a.order - b.order);

  const sortState = config.getSortState?.() ?? [];
  const filterState = config.getFilterState?.() ?? [];

  // Render each column header
  columns.forEach((columnState, visualIndex) => {
    const params = buildRenderParams(
      columnState.definition,
      visualIndex,
      columnState.dataIndex,
      columnState.actualWidth,
      headerHeight,
      sortState,
      filterState,
      config.eventEmitter
    );

    renderHeaderCell(
      columnState.definition,
      columnState.id,
      visualIndex,
      headerCellsContainer,
      registry,
      params,
      headerCells
    );
  });
}

/**
 * Update a specific header by column ID (reactive)
 */
export function updateHeaderByColumnId(
  columnId: string,
  headerCells: Map<string, HeaderCellMetadata>,
  columnModel: ColumnModel,
  config: HeaderManagerConfig,
  headerHeight: number
): void {
  const metadata = headerCells.get(columnId);
  if (!metadata || !metadata.lastParams) return;

  // Get updated column state
  const columnState = columnModel.getColumn(columnId);
  if (!columnState) return;

  const sortState = config.getSortState?.() ?? [];
  const filterState = config.getFilterState?.() ?? [];

  // Update params
  const params = buildRenderParams(
    metadata.lastParams.column,
    metadata.columnIndex,
    columnState.dataIndex,
    columnState.actualWidth,
    headerHeight,
    sortState,
    filterState,
    config.eventEmitter
  );

  // Keep the reserved width in sync (e.g. column resize) before the renderer
  // updates, so custom renderers that don't resize themselves stay correct.
  applyHeaderCellSizing(metadata.element, params);

  // Update the renderer
  metadata.renderer.update(metadata.element, params);
  metadata.lastParams = params;
}

/**
 * Update a specific header cell (public API - by column index)
 */
export function updateHeaderByIndex(
  columnIndex: number,
  columnModel: ColumnModel,
  headerCells: Map<string, HeaderCellMetadata>,
  config: HeaderManagerConfig,
  headerHeight: number
): void {
  // Find column ID by index
  const columns = columnModel
    .getColumns()
    .filter((col) => col.visible)
    .sort((a, b) => a.order - b.order);

  if (columnIndex >= 0 && columnIndex < columns.length) {
    const columnId = columns[columnIndex].id;
    updateHeaderByColumnId(columnId, headerCells, columnModel, config, headerHeight);
  }
}

/**
 * Update all headers
 */
export function updateAllHeaders(
  headerCells: Map<string, HeaderCellMetadata>,
  columnModel: ColumnModel,
  config: HeaderManagerConfig,
  headerHeight: number
): void {
  for (const columnId of headerCells.keys()) {
    updateHeaderByColumnId(columnId, headerCells, columnModel, config, headerHeight);
  }
}
