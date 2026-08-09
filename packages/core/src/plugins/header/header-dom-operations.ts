/**
 * HeaderManager - DOM operations
 */

import type { ColumnDef } from '../../types';
import type { HeaderCellMetadata } from './header-types';
import { HeaderRendererRegistry } from '../../rendering/headers/header-registry';
import { resolveHeaderConfig } from '../../rendering/headers/header-config-resolver';
import type { HeaderRenderParams } from '../../rendering/headers/header-renderer.interface';
import type { ColumnModel } from '../../features/columns/column-model';
import type { ColumnPinProvider, ColumnPinInfo } from '../../rendering/col-pin/col-pin';
import { resolveColumnPin } from '../../rendering/col-pin/col-pin';
import type { ColumnGroupProvider, ColumnGroupInfo } from '../../rendering/col-group/col-group';
import { resolveColumnGroupCells } from '../../rendering/col-group/col-group';

/**
 * Create header cells container
 */
export interface HeaderContainers {
  /** The flex row of leaf header cells. */
  cells: HTMLElement;
  /** The grouped-header banner strip, or null when there are no group levels. */
  groups: HTMLElement | null;
}

export function createHeaderCellsContainer(
  container: HTMLElement,
  leafHeight: number,
  groupsHeight = 0
): HeaderContainers {
  // Clear container
  container.innerHTML = '';
  container.className = 'zg-header';
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${leafHeight + groupsHeight}px;
    z-index: 10;
    background: var(--zg-header-bg, #f5f5f5);
    border-bottom: 1px solid var(--zg-border-color, #d0d0d0);
    overflow: hidden;
  `;

  // Grouped-header banner strip sits above the leaf headers (only when levels > 0).
  let groups: HTMLElement | null = null;
  if (groupsHeight > 0) {
    groups = document.createElement('div');
    groups.className = 'zg-header-groups';
    groups.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: ${groupsHeight}px;
      overflow: hidden;
    `;
    container.appendChild(groups);
  }

  // Leaf header cells, offset below any banner rows.
  const headerCellsContainer = document.createElement('div');
  headerCellsContainer.className = 'zg-header-cells';
  headerCellsContainer.style.cssText = `
    position: absolute;
    top: ${groupsHeight}px;
    left: 0;
    right: 0;
    height: ${leafHeight}px;
    display: flex;
  `;

  container.appendChild(headerCellsContainer);
  return { cells: headerCellsContainer, groups };
}

/**
 * Render the grouped-header banner cells into the strip, aligned to the leaf
 * columns they span and scroll-synced with the body. No-op without a provider.
 */
export function renderColumnGroups(
  groupsContainer: HTMLElement | null,
  columnModel: ColumnModel | null,
  provider: ColumnGroupProvider | undefined,
  levelHeight: number,
  scrollLeft: number
): void {
  if (!groupsContainer || !columnModel || !provider) return;

  const ordered = columnModel.getVisibleColumnsInOrder();
  const columns: ColumnGroupInfo[] = ordered.map((c: any, i: number) => ({
    index: i,
    field: c.field,
    width: c.actualWidth,
  }));

  const layout = provider.getGroups({ columns });
  const resolved = resolveColumnGroupCells(
    layout.cells,
    (col) => columns[col]?.width ?? 0,
    columns.length
  );

  groupsContainer.innerHTML = '';
  // Inner track holds the absolutely-positioned banners and rides the scroll.
  const track = document.createElement('div');
  track.className = 'zg-header-groups-track';
  track.style.cssText = `position: absolute; top: 0; left: 0; height: 100%; transform: translateX(-${scrollLeft}px);`;

  for (const cell of resolved) {
    const el = document.createElement('div');
    el.className = 'zg-header-group-cell';
    el.style.cssText = `position: absolute; left: ${cell.x}px; top: ${cell.level * levelHeight}px; width: ${cell.width}px; height: ${levelHeight}px;`;
    const label = document.createElement('span');
    label.className = 'zg-header-group-label';
    label.textContent = cell.label;
    el.appendChild(label);
    if (cell.groupId) el.dataset['groupId'] = cell.groupId;

    // Collapse/expand toggle — the header plugin listens for clicks on it and
    // reconciles column visibility. Chevron points the way the group will move.
    if (cell.collapsible && cell.groupId) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'zg-header-group-toggle';
      toggle.dataset['groupId'] = cell.groupId;
      toggle.dataset['collapsed'] = cell.collapsed ? 'true' : 'false';
      toggle.textContent = cell.collapsed ? '›' : '‹';
      toggle.setAttribute(
        'aria-label',
        `${cell.collapsed ? 'Expand' : 'Collapse'} ${cell.label}`
      );
      toggle.setAttribute('aria-expanded', cell.collapsed ? 'false' : 'true');
      el.appendChild(toggle);
    }

    track.appendChild(el);
  }

  groupsContainer.appendChild(track);
}

/** Keep the banner strip in horizontal sync with the body. */
export function syncGroupScroll(groupsContainer: HTMLElement | null, scrollLeft: number): void {
  const track = groupsContainer?.querySelector<HTMLElement>('.zg-header-groups-track');
  if (track) track.style.transform = `translateX(-${scrollLeft}px)`;
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

/**
 * Freeze pinned header cells in place. The cells container is translated by
 * `-scrollLeft` to track the body; a pinned cell counter-translates by
 * `stickyLeft - flowX` so it lands on its band edge and stays there. Non-pinned
 * cells that were previously frozen have their transform cleared. No-op unless a
 * `colPinProvider` reports pinned columns.
 */
export function syncPinnedHeaders(
  headerCells: Map<string, HeaderCellMetadata>,
  columnModel: ColumnModel | null,
  provider: ColumnPinProvider | undefined,
  scrollLeft: number,
  viewportWidth: number
): void {
  if (!columnModel) return;
  const ordered = columnModel.getVisibleColumnsInOrder();
  if (!ordered || ordered.length === 0) return;

  const columns: ColumnPinInfo[] = ordered.map((c: any, i: number) => ({
    index: i,
    width: c.actualWidth,
    def: c.definition,
  }));
  const layout = provider ? provider.getPinned({ columns }) : null;
  const resolved = resolveColumnPin(layout, (col) => columns[col]?.width ?? 0);

  // Prefix-sum flow positions so a pinned cell's transform is exact regardless of
  // where the column sits in the row.
  const flowX: number[] = new Array(columns.length);
  let x = 0;
  for (let i = 0; i < columns.length; i++) {
    flowX[i] = x;
    x += columns[i].width;
  }

  ordered.forEach((c: any, i: number) => {
    const meta = headerCells.get(c.id);
    if (!meta) return;
    const el = meta.element;
    const side = resolved.sideOf(i);
    if (side) {
      const t = resolved.stickyLeft(i, scrollLeft, viewportWidth) - flowX[i];
      el.style.transform = `translateX(${t}px)`;
      el.style.zIndex = '3';
      el.classList.add('zg-header-cell-pinned');
      el.classList.toggle('zg-header-cell-pinned-left', side === 'left');
      el.classList.toggle('zg-header-cell-pinned-right', side === 'right');
    } else if (el.classList.contains('zg-header-cell-pinned')) {
      el.style.transform = '';
      el.style.zIndex = '';
      el.classList.remove(
        'zg-header-cell-pinned',
        'zg-header-cell-pinned-left',
        'zg-header-cell-pinned-right'
      );
    }
  });
}
