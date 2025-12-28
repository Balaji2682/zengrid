import { CellPositioner } from './cell-positioner';
import type { CellPool as ICellPool } from '../cell-pool';
import { CellPool } from '../cell-pool/cell-pool';
import { RendererRegistry } from '../renderers';
import { VirtualScroller } from '../virtual-scroller';

describe('CellPositioner', () => {
  let container: HTMLElement;
  let pool: ICellPool;
  let registry: RendererRegistry;
  let scroller: VirtualScroller;
  let positioner: CellPositioner;
  let data: any[][];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    pool = new CellPool({ container, initialSize: 50 });
    registry = new RendererRegistry();
    scroller = new VirtualScroller({
      rowCount: 100,
      colCount: 10,
      rowHeight: 30,
      colWidth: 100,
      viewportWidth: 500,
      viewportHeight: 300,
    });

    // Create test data
    data = Array.from({ length: 100 }, (_, row) =>
      Array.from({ length: 10 }, (_, col) => `R${row}C${col}`)
    );

    positioner = new CellPositioner({
      scroller,
      pool,
      registry,
      getData: (row, col) => data[row][col],
    });
  });

  afterEach(() => {
    positioner.destroy();
    document.body.removeChild(container);
  });

  it('should render visible cells', () => {
    positioner.renderVisibleCells(0, 0);

    const stats = pool.stats;
    expect(stats.active).toBeGreaterThan(0);
  });

  it('should position cells correctly', () => {
    positioner.renderVisibleCells(0, 0);

    const cell = pool.acquire('0-0');
    expect(cell.style.left).toBe('0px');
    expect(cell.style.top).toBe('0px');
    expect(cell.style.width).toBe('100px');
    expect(cell.style.height).toBe('30px');
  });

  it('should render cell content', () => {
    positioner.renderVisibleCells(0, 0);

    const cell = pool.acquire('0-0');
    expect(cell.textContent).toBe('R0C0');
  });

  it('should release cells not in visible range', () => {
    positioner.renderVisibleCells(0, 0);

    // Scroll down so first row is no longer visible
    positioner.renderVisibleCells(300, 0);

    // Some cells should have been released
    expect(pool.stats.pooled).toBeGreaterThan(0);
  });

  it('should reuse pooled cells on scroll', () => {
    positioner.renderVisibleCells(0, 0);
    const totalAfterFirstRender = pool.stats.total;

    positioner.renderVisibleCells(300, 0);

    // Total should increase minimally (cells are reused)
    expect(pool.stats.total).toBeLessThan(totalAfterFirstRender * 2);
  });

  it('should update specific cells', () => {
    positioner.renderVisibleCells(0, 0);

    // Modify data
    data[0][0] = 'UPDATED';

    // Update cell
    positioner.updateCells([{ row: 0, col: 0 }]);

    const cell = pool.acquire('0-0');
    expect(cell.textContent).toBe('UPDATED');
  });

  it('should refresh all visible cells', () => {
    positioner.renderVisibleCells(0, 0);

    // Modify data
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 5; col++) {
        data[row][col] = 'REFRESHED';
      }
    }

    positioner.refresh();

    const cell = pool.acquire('0-0');
    expect(cell.textContent).toBe('REFRESHED');
  });

  it('should apply state classes', () => {
    const positionerWithState = new CellPositioner({
      scroller,
      pool,
      registry,
      getData: (row, col) => data[row][col],
      isSelected: (row, col) => row === 0 && col === 0,
      isActive: (row, col) => row === 1 && col === 1,
    });

    positionerWithState.renderVisibleCells(0, 0);

    const selectedCell = pool.acquire('0-0');
    expect(selectedCell.classList.contains('zg-cell-selected')).toBe(true);

    const activeCell = pool.acquire('1-1');
    expect(activeCell.classList.contains('zg-cell-active')).toBe(true);

    positionerWithState.destroy();
  });

  it('should destroy and cleanup', () => {
    positioner.renderVisibleCells(0, 0);
    positioner.destroy();

    expect(pool.stats.active).toBe(0);
    expect(pool.stats.pooled).toBe(0);
  });
});
