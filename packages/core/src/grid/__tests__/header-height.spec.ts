import { Grid } from '../grid-core';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';

describe('configurable header height', () => {
  function make(headerHeight?: number) {
    resetTracking();
    resetDebug();
    resetScheduler();
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
    document.body.appendChild(container);
    const columns = [{ field: 'name', width: 200, renderer: 'text', header: { text: 'X', type: 'text' } }];
    const grid = new Grid(container, {
      rowCount: 1,
      colCount: 1,
      rowHeight: 30,
      colWidth: [200],
      columns,
      ...(headerHeight ? { headerHeight } : {}),
    } as never);
    grid.setData([['A']]);
    grid.render();
    return { grid, container };
  }

  it('defaults the header cell + container to 40px', () => {
    const { grid, container } = make();
    const cell = container.querySelector('.zg-header-cell') as HTMLElement;
    const header = container.querySelector('.zg-header') as HTMLElement;
    expect(cell.style.height).toBe('40px');
    expect(header.style.height).toBe('40px');
    grid.destroy();
    container.remove();
  });

  it('honors a configured headerHeight on the cell + container', () => {
    const { grid, container } = make(64);
    const cell = container.querySelector('.zg-header-cell') as HTMLElement;
    const header = container.querySelector('.zg-header') as HTMLElement;
    expect(cell.style.height).toBe('64px');
    expect(header.style.height).toBe('64px');
    grid.destroy();
    container.remove();
  });
});
