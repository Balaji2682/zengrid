import { CellPool } from './cell-pool';

describe('CellPool', () => {
  let container: HTMLElement;
  let pool: CellPool;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    pool.clear();
    document.body.removeChild(container);
  });

  it('should create initial pool', () => {
    pool = new CellPool({ container, initialSize: 10 });
    expect(pool.stats.pooled).toBe(10);
    expect(pool.stats.active).toBe(0);
    expect(pool.stats.total).toBe(10);
  });

  it('should acquire cell from pool', () => {
    pool = new CellPool({ container, initialSize: 10 });
    const cell = pool.acquire('0-0');

    expect(cell).toBeInstanceOf(HTMLElement);
    expect(cell.className).toBe('zg-cell');
    expect(cell.dataset.cellKey).toBe('0-0');
    expect(pool.stats.active).toBe(1);
    expect(pool.stats.pooled).toBe(9);
  });

  it('should return same cell if already active', () => {
    pool = new CellPool({ container, initialSize: 10 });
    const cell1 = pool.acquire('0-0');
    const cell2 = pool.acquire('0-0');

    expect(cell1).toBe(cell2);
    expect(pool.stats.active).toBe(1);
  });

  it('should create new cell if pool is empty', () => {
    pool = new CellPool({ container, initialSize: 0 });
    const cell = pool.acquire('0-0');

    expect(cell).toBeInstanceOf(HTMLElement);
    expect(pool.stats.active).toBe(1);
    expect(pool.stats.pooled).toBe(0);
  });

  it('should release cell back to pool', () => {
    pool = new CellPool({ container, initialSize: 10 });
    const cell = pool.acquire('0-0');
    pool.release('0-0');

    expect(pool.stats.active).toBe(0);
    expect(pool.stats.pooled).toBe(10);
    expect(cell.dataset.cellKey).toBeUndefined();
    expect(cell.innerHTML).toBe('');
  });

  it('should not release cell not in active set', () => {
    pool = new CellPool({ container, initialSize: 10 });
    pool.release('unknown-key');

    expect(pool.stats.active).toBe(0);
  });

  it('should release cells except active keys', () => {
    pool = new CellPool({ container, initialSize: 10 });
    pool.acquire('0-0');
    pool.acquire('0-1');
    pool.acquire('0-2');

    const activeKeys = new Set(['0-0', '0-2']);
    pool.releaseExcept(activeKeys);

    expect(pool.stats.active).toBe(2);
    expect(pool.stats.pooled).toBe(8); // 10 initial - 3 acquired + 1 released
  });

  it('should respect maxSize limit', () => {
    pool = new CellPool({ container, initialSize: 0, maxSize: 2 });

    pool.acquire('0-0');
    pool.acquire('0-1');
    pool.acquire('0-2');

    pool.release('0-0');
    pool.release('0-1');
    pool.release('0-2');

    expect(pool.stats.pooled).toBe(2); // Only 2 kept in pool
    expect(pool.stats.active).toBe(0);
  });

  it('should clear all cells', () => {
    pool = new CellPool({ container, initialSize: 10 });
    pool.acquire('0-0');
    pool.acquire('0-1');

    pool.clear();

    expect(pool.stats.active).toBe(0);
    expect(pool.stats.pooled).toBe(0);
    expect(pool.stats.total).toBe(0);
    expect(container.children.length).toBe(0);
  });

  it('should reset element state on release', () => {
    pool = new CellPool({ container, initialSize: 10 });
    const cell = pool.acquire('0-0');

    cell.innerHTML = '<span>content</span>';
    cell.classList.add('custom-class');
    cell.style.cssText = 'color: red; position: absolute;';

    pool.release('0-0');

    expect(cell.innerHTML).toBe('');
    expect(cell.className).toBe('zg-cell');
    expect(cell.style.color).toBe('');
  });
});
