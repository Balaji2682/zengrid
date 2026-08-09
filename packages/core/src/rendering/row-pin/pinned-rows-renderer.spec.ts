import { PinnedRowsRenderer } from './pinned-rows-renderer';
import { RendererRegistry } from '../renderers';
import { VirtualScroller } from '../virtual-scroller';
import type { VisibleRange } from '../../types';

describe('PinnedRowsRenderer', () => {
  let topBand: HTMLElement;
  let bottomBand: HTMLElement;
  let scroller: VirtualScroller;
  let registry: RendererRegistry;
  let renderer: PinnedRowsRenderer;
  let data: string[][];

  const RANGE: VisibleRange = { startRow: 0, endRow: 20, startCol: 0, endCol: 4 };

  beforeEach(() => {
    topBand = document.createElement('div');
    bottomBand = document.createElement('div');
    scroller = new VirtualScroller({
      rowCount: 100,
      colCount: 4,
      rowHeight: 30,
      colWidth: 100,
      viewportWidth: 500,
      viewportHeight: 300,
    });
    registry = new RendererRegistry();
    data = Array.from({ length: 100 }, (_, row) =>
      Array.from({ length: 4 }, (_, col) => `R${row}C${col}`)
    );
    renderer = new PinnedRowsRenderer({
      topBand,
      bottomBand,
      scroller,
      registry,
      getData: (row, col) => data[row][col],
      getColumn: () => undefined,
    });
  });

  const topInner = () => topBand.querySelector('.zg-pinned-cells') as HTMLElement;
  const bottomInner = () => bottomBand.querySelector('.zg-pinned-cells') as HTMLElement;

  it('creates an inner cells container per band', () => {
    expect(topInner()).toBeTruthy();
    expect(bottomInner()).toBeTruthy();
  });

  it('sizes a band to the sum of its rows and shows it', () => {
    renderer.setLayout([2, 5], []);
    expect(topBand.style.height).toBe('60px'); // 2 rows x 30px
    expect(topBand.style.display).toBe('block');
    expect(bottomBand.style.display).toBe('none'); // empty band hidden
  });

  it('draws a cell per pinned row and visible column, positioned and classed', () => {
    renderer.setLayout([7], []);
    renderer.render(RANGE, 0);

    const cells = topInner().querySelectorAll('.zg-cell-pinned');
    expect(cells).toHaveLength(4); // 1 row x 4 visible cols

    const first = cells[0] as HTMLElement;
    expect(first.classList.contains('zg-cell-pinned-top')).toBe(true);
    expect(first.style.left).toBe('0px');
    expect(first.style.top).toBe('0px');
    expect(first.style.width).toBe('100px');
    expect(first.style.height).toBe('30px');
    expect(first.textContent).toBe('R7C0'); // pulls the pinned row's data

    const second = cells[1] as HTMLElement;
    expect(second.style.left).toBe('100px');
    // last visible column carries the last-col marker (colCount - 1 === 3)
    expect((cells[3] as HTMLElement).classList.contains('zg-cell-last-col')).toBe(true);
  });

  it('stacks multiple pinned rows within a band by cumulative height', () => {
    renderer.setLayout([1, 4], []);
    renderer.render(RANGE, 0);
    const cells = topInner().querySelectorAll('.zg-cell-pinned');
    expect(cells).toHaveLength(8); // 2 rows x 4 cols
    // second row's cells start at y = 30
    expect((cells[4] as HTMLElement).style.top).toBe('30px');
  });

  it('tracks horizontal scroll via a transform on the inner container', () => {
    renderer.setLayout([0], [99]);
    renderer.render(RANGE, 120);
    expect(topInner().style.transform).toBe('translateX(-120px)');
    expect(bottomInner().style.transform).toBe('translateX(-120px)');
  });

  it('renders top and bottom bands independently', () => {
    renderer.setLayout([0], [99]);
    renderer.render(RANGE, 0);
    expect(topInner().querySelectorAll('.zg-cell-pinned-top')).toHaveLength(4);
    expect(bottomInner().querySelectorAll('.zg-cell-pinned-bottom')).toHaveLength(4);
  });

  it('renders standalone data rows outermost within their band', () => {
    // getColumn resolves value by field cN; point columns at fields so the
    // standalone rows can read their own objects. topData sits above the pinned
    // dataset row; bottomData below it. Own band elements so the shared ones from
    // beforeEach don't front the querySelector.
    const top2 = document.createElement('div');
    const bottom2 = document.createElement('div');
    const withCols = new PinnedRowsRenderer({
      topBand: top2,
      bottomBand: bottom2,
      scroller,
      registry,
      getData: (row, col) => data[row][col],
      getColumn: (col) => ({ field: `c${col}`, header: '' }) as any,
    });
    const topInner = () => top2.querySelector('.zg-pinned-cells') as HTMLElement;
    const bottomInner = () => bottom2.querySelector('.zg-pinned-cells') as HTMLElement;
    withCols.setLayout(
      [3],
      [4],
      [{ data: { c0: 'TOP', c1: 't1', c2: 't2', c3: 't3' } }],
      [{ data: { c0: 'GRAND', c1: 'b1', c2: 'b2', c3: 'b3' } }]
    );
    withCols.render(RANGE, 0);

    const top = topInner().querySelectorAll('.zg-cell-pinned') as NodeListOf<HTMLElement>;
    // 2 rows (data + index) x 4 cols
    expect(top).toHaveLength(8);
    // First cell is the standalone data row, marked and reading its object.
    expect(top[0].classList.contains('zg-cell-pinned-data')).toBe(true);
    expect(top[0].textContent).toBe('TOP');
    expect(top[0].style.top).toBe('0px');
    // The dataset row (index 3) stacks below it.
    expect(top[4].classList.contains('zg-cell-pinned-data')).toBe(false);
    expect(top[4].textContent).toBe('R3C0');
    expect(top[4].style.top).toBe('30px');

    const bottom = bottomInner().querySelectorAll('.zg-cell-pinned') as NodeListOf<HTMLElement>;
    // Dataset row first, standalone grand-total row last.
    expect(bottom[0].textContent).toBe('R4C0');
    expect(bottom[4].classList.contains('zg-cell-pinned-data')).toBe(true);
    expect(bottom[4].textContent).toBe('GRAND');
  });

  it('honours an explicit height on a standalone data row', () => {
    const withCols = new PinnedRowsRenderer({
      topBand,
      bottomBand,
      scroller,
      registry,
      getData: (row, col) => data[row][col],
      getColumn: (col) => ({ field: `c${col}`, header: '' }) as any,
    });
    withCols.setLayout([], [], [{ data: { c0: 'x' }, height: 50 }], []);
    expect(topBand.style.height).toBe('50px'); // explicit height, not the 30px default
  });

  it('clears cells and hides bands on destroy', () => {
    renderer.setLayout([0], [99]);
    renderer.render(RANGE, 0);
    renderer.destroy();
    expect(topInner().children).toHaveLength(0);
    expect(bottomInner().children).toHaveLength(0);
    expect(topBand.style.display).toBe('none');
    expect(bottomBand.style.display).toBe('none');
  });
});
