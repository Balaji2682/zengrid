import type { VirtualScroller } from '../virtual-scroller';
import type { RendererRegistry, CellRenderer, RenderParams } from '../renderers';
import type { ColumnDef, VisibleRange } from '../../types';
import type { RowPinPosition, PinnedDataRow } from './row-pin';

export interface PinnedRowsRendererOptions {
  /** Fixed band overlaying the top of the scroll area. */
  topBand: HTMLElement;
  /** Fixed band overlaying the bottom of the scroll area. */
  bottomBand: HTMLElement;
  scroller: VirtualScroller;
  registry: RendererRegistry;
  getData: (row: number, col: number) => unknown;
  getColumn: (col: number) => ColumnDef | undefined;
  getRowData?: (row: number) => unknown;
}

/** An existing dataset row, pinned by its render-row index. */
interface IndexEntry {
  readonly kind: 'index';
  readonly row: number;
}

/** A standalone row supplied by data, not present in the dataset. */
interface DataEntry {
  readonly kind: 'data';
  readonly data: unknown;
  readonly height?: number;
}

type BandEntry = IndexEntry | DataEntry;

const toIndexEntry = (row: number): IndexEntry => ({ kind: 'index', row });
const toDataEntry = (r: PinnedDataRow): DataEntry => ({
  kind: 'data',
  data: r.data,
  height: r.height,
});

interface Band {
  readonly outer: HTMLElement;
  readonly inner: HTMLElement;
  readonly position: RowPinPosition;
  entries: BandEntry[];
}

/**
 * Renders pinned rows into two vertically-fixed bands that overlay the scroll
 * area, their content translated horizontally to track the body's scroll. Pure
 * mechanism: it draws whatever render-row indices it is handed via
 * {@link setLayout}; deciding *which* rows are pinned is the provider's job.
 * Pinned rows are few, so cells are rebuilt each pass rather than pooled.
 */
export class PinnedRowsRenderer {
  private readonly scroller: VirtualScroller;
  private readonly registry: RendererRegistry;
  private readonly getData: PinnedRowsRendererOptions['getData'];
  private readonly getColumn: PinnedRowsRendererOptions['getColumn'];
  private readonly getRowData: PinnedRowsRendererOptions['getRowData'];
  private readonly top: Band;
  private readonly bottom: Band;

  constructor(options: PinnedRowsRendererOptions) {
    this.scroller = options.scroller;
    this.registry = options.registry;
    this.getData = options.getData;
    this.getColumn = options.getColumn;
    this.getRowData = options.getRowData;
    this.top = this.initBand(options.topBand, 'top');
    this.bottom = this.initBand(options.bottomBand, 'bottom');
  }

  private initBand(outer: HTMLElement, position: RowPinPosition): Band {
    const inner = document.createElement('div');
    inner.className = 'zg-pinned-cells';
    inner.style.cssText = 'position: absolute; top: 0; left: 0; will-change: transform;';
    outer.appendChild(inner);
    return { outer, inner, position, entries: [] };
  }

  /**
   * Set what each band holds and size the bands to the sum of their rows' heights.
   * `top`/`bottom` are render-row indices of existing dataset rows; `topData`/
   * `bottomData` are standalone rows supplied by data, laid outermost within their
   * band. Call on data/pin changes; {@link render} draws the cells.
   */
  setLayout(
    top: number[],
    bottom: number[],
    topData: readonly PinnedDataRow[] = [],
    bottomData: readonly PinnedDataRow[] = []
  ): void {
    // Standalone rows sit outermost: topData above the pinned dataset rows,
    // bottomData below them.
    this.top.entries = [...topData.map(toDataEntry), ...top.map(toIndexEntry)];
    this.bottom.entries = [...bottom.map(toIndexEntry), ...bottomData.map(toDataEntry)];
    this.sizeBand(this.top);
    this.sizeBand(this.bottom);
  }

  private entryHeight(entry: BandEntry): number {
    if (entry.kind === 'index') return this.scroller.getRowHeight(entry.row);
    return entry.height ?? this.defaultRowHeight();
  }

  /** Fallback height for a standalone row with no explicit height. */
  private defaultRowHeight(): number {
    return this.scroller.rowCount > 0 ? this.scroller.getRowHeight(0) : 0;
  }

  private sizeBand(band: Band): void {
    const height = band.entries.reduce((sum, entry) => sum + this.entryHeight(entry), 0);
    band.outer.style.height = `${height}px`;
    band.outer.style.display = band.entries.length > 0 ? 'block' : 'none';
    band.inner.style.width = `${this.scroller.getTotalWidth()}px`;
  }

  /**
   * Draw the pinned cells for the visible column range and track horizontal
   * scroll. Cheap because pinned rows are few; called each render/scroll pass.
   */
  render(range: VisibleRange, scrollLeft: number): void {
    this.renderBand(this.top, range);
    this.renderBand(this.bottom, range);
    this.syncHorizontal(scrollLeft);
  }

  /** Track the body's horizontal scroll without redrawing cells. */
  syncHorizontal(scrollLeft: number): void {
    const transform = `translateX(${-scrollLeft}px)`;
    this.top.inner.style.transform = transform;
    this.bottom.inner.style.transform = transform;
  }

  private renderBand(band: Band, range: VisibleRange): void {
    band.inner.replaceChildren();
    if (band.entries.length === 0) return;
    let y = 0;
    const lastCol = this.scroller.colCount - 1;
    for (const entry of band.entries) {
      const height = this.entryHeight(entry);
      for (let col = range.startCol; col < range.endCol; col++) {
        band.inner.appendChild(this.renderCell(entry, col, y, height, lastCol, band.position));
      }
      y += height;
    }
  }

  private renderCell(
    entry: BandEntry,
    col: number,
    y: number,
    height: number,
    lastCol: number,
    position: RowPinPosition
  ): HTMLElement {
    const isData = entry.kind === 'data';
    const element = document.createElement('div');
    element.className = `zg-cell zg-cell-pinned zg-cell-pinned-${position}`;
    if (isData) element.classList.add('zg-cell-pinned-data');
    if (col === lastCol) element.classList.add('zg-cell-last-col');
    // Horizontal geometry depends only on the column, so any row index works.
    const cellPos = this.scroller.getCellPosition(0, col);
    element.style.cssText =
      `position: absolute; left: ${cellPos.x}px; top: ${y}px; ` +
      `width: ${cellPos.width}px; height: ${height}px;`;

    const column = this.getColumn(col);
    // Existing rows resolve through the data accessor by render index; standalone
    // rows read their own object by the column's field.
    const value = isData
      ? (column ? (entry.data as Record<string, unknown> | null)?.[column.field] : undefined)
      : this.getData(entry.row, col);
    const rowData = isData ? entry.data : this.getRowData?.(entry.row);
    const params: RenderParams = {
      cell: { row: isData ? -1 : entry.row, col },
      position: cellPos,
      value,
      column,
      rowData,
      isSelected: false,
      isActive: false,
      isEditing: false,
    };
    const renderer = this.resolveRenderer(column);
    renderer.render(element, params);
    const cellClass = renderer.getCellClass?.(params);
    if (cellClass) element.classList.add(cellClass);
    return element;
  }

  private resolveRenderer(column: ColumnDef | undefined): CellRenderer {
    const r = column?.renderer;
    if (r && typeof r === 'object' && 'render' in r) return r as CellRenderer;
    return this.registry.get(typeof r === 'string' ? r : undefined);
  }

  destroy(): void {
    this.top.inner.replaceChildren();
    this.bottom.inner.replaceChildren();
    this.top.outer.style.display = 'none';
    this.bottom.outer.style.display = 'none';
  }
}
