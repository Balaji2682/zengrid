/**
 * HeaderManager - DOM operations
 */

import type { ColumnDef } from '../../types';
import type { HeaderCellMetadata } from './header-types';
import { HeaderRendererRegistry } from '../../rendering/headers/header-registry';
import { resolveHeaderConfig } from '../../rendering/headers/header-config-resolver';
import type { HeaderRenderParams } from '../../rendering/headers/header-renderer.interface';

/**
 * Create header cells container
 */
export function createHeaderCellsContainer(
  container: HTMLElement,
  headerHeight: number
): HTMLElement {
  // Clear container
  container.innerHTML = '';
  container.className = 'zg-header';
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${headerHeight}px;
    z-index: 10;
    background: var(--zg-header-bg, #f5f5f5);
    border-bottom: 1px solid var(--zg-border-color, #d0d0d0);
    overflow: hidden;
  `;

  // Create cells container
  const headerCellsContainer = document.createElement('div');
  headerCellsContainer.className = 'zg-header-cells';
  headerCellsContainer.style.cssText = `
    position: relative;
    height: 100%;
    display: flex;
  `;

  container.appendChild(headerCellsContainer);
  return headerCellsContainer;
}

/**
 * Render a single header cell
 */
export function renderHeaderCell(
  column: ColumnDef,
  columnId: string,
  columnIndex: number,
  headerCellsContainer: HTMLElement,
  registry: HeaderRendererRegistry,
  params: HeaderRenderParams,
  headerCells: Map<string, HeaderCellMetadata>
): void {
  // Resolve header config
  const config = resolveHeaderConfig(column.header, column);

  // Get renderer
  const rendererName = config.renderer || config.type;
  const renderer = registry.get(rendererName);

  // Create header cell element
  const element = document.createElement('div');
  element.dataset['columnId'] = columnId;
  element.dataset['columnIndex'] = String(columnIndex);

  // Reserve the column width before rendering so renderers that don't size the
  // cell themselves (e.g. custom renderers) don't collapse under the flex row.
  applyHeaderCellSizing(element, params);

  // Render
  renderer.render(element, params);

  // Custom renderers only own render/update/destroy. For sortable columns whose
  // renderer does not wire sort itself, delegate the sort click so header clicks
  // still toggle sort (and sort-driven header state keeps updating).
  if (column.sortable && !renderer.handlesSortInteraction && params.emit) {
    attachSortClickFallback(element, params);
  }

  // Add to container
  headerCellsContainer.appendChild(element);

  // Store metadata by column ID (for reactive updates)
  headerCells.set(columnId, {
    element,
    renderer,
    columnId,
    columnIndex,
    lastParams: params,
  });
}

/**
 * Apply the structural sizing every header cell needs (column width, header
 * height, no flex shrink, border-box). Renderers may still override these, but
 * this baseline keeps custom renderers from collapsing to zero width.
 */
export function applyHeaderCellSizing(element: HTMLElement, params: HeaderRenderParams): void {
  element.style.width = `${params.width}px`;
  element.style.height = `${params.height}px`;
  element.style.flexShrink = '0';
  element.style.boxSizing = 'border-box';
}

/**
 * Attach a default sort-click handler for sortable columns whose renderer does
 * not handle the interaction itself. The element is freshly created per render
 * and discarded on refresh/destroy, so the listener needs no explicit teardown.
 */
function attachSortClickFallback(element: HTMLElement, params: HeaderRenderParams): void {
  element.style.cursor = 'pointer';
  element.addEventListener('click', (e) => {
    const native = e as MouseEvent;
    params.emit?.('header:sort:click', {
      columnIndex: params.columnIndex,
      column: params.column,
      nextDirection:
        params.sortDirection === 'asc' ? 'desc' : params.sortDirection === 'desc' ? null : 'asc',
      additive: !!(native.shiftKey || native.ctrlKey || native.metaKey),
      trigger: 'click',
      nativeEvent: native,
    });
  });
}

/**
 * Destroy all headers
 */
export function destroyHeaders(
  headerCells: Map<string, HeaderCellMetadata>,
  headerCellsContainer: HTMLElement | null
): void {
  for (const metadata of headerCells.values()) {
    metadata.renderer.destroy(metadata.element);
  }
  headerCells.clear();

  if (headerCellsContainer) {
    headerCellsContainer.innerHTML = '';
  }
}

/**
 * Sync horizontal scroll
 * Called synchronously on every scroll event to ensure header stays in sync with body
 * Uses CSS transform for GPU-accelerated, high-performance updates
 */
export function syncHorizontalScroll(
  headerCellsContainer: HTMLElement | null,
  scrollLeft: number
): void {
  if (headerCellsContainer) {
    headerCellsContainer.style.transform = `translateX(-${scrollLeft}px)`;
  }
}
