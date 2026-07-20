import type { GridPlugin, PluginDisposable } from '../../reactive/types';
import type { GridOptions } from '../../types';
import { resolveHeaderHeight } from '../header/header-types';

export interface DomPluginOptions {
  container: HTMLElement;
  options: GridOptions;
}

/**
 * DomPlugin - Manages DOM structure for the grid.
 *
 * Creates viewport, scroll container, canvas, cells container, and header container.
 * Replaces the legacy GridDOM class.
 */
export function createDomPlugin(opts: DomPluginOptions): GridPlugin {
  return {
    name: 'dom',
    phase: 5,
    dependencies: ['core'],
    setup(store, api): PluginDisposable {
      const { container, options } = opts;

      let viewport: HTMLElement | null = null;
      let scrollContainer: HTMLElement | null = null;
      let canvas: HTMLElement | null = null;
      let headerContainer: HTMLElement | null = null;

      store.extend('dom.viewport', null as HTMLElement | null, 'dom', 5);
      store.extend('dom.scrollContainer', null as HTMLElement | null, 'dom', 5);
      store.extend('dom.canvas', null as HTMLElement | null, 'dom', 5);
      store.extend('dom.headerContainer', null as HTMLElement | null, 'dom', 5);

      store.action(
        'dom:setup',
        () => {
          if (options.hideLastColumnBorder) {
            container.classList.add('zg-hide-last-col-border');
          }

          // Create viewport
          viewport = document.createElement('div');
          viewport.className = 'zg-viewport';
          viewport.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
          `;

          // Create scroll container
          scrollContainer = document.createElement('div');
          scrollContainer.className = 'zg-scroll-container';

          const headerHeight =
            options.columns && options.columns.length > 0 ? resolveHeaderHeight(options) : 0;

          scrollContainer.style.cssText = `
            position: absolute;
            top: ${headerHeight}px;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: auto;
          `;

          // Create canvas
          canvas = document.createElement('div');
          canvas.className = 'zg-canvas';
          canvas.style.cssText = `
            position: relative;
            pointer-events: none;
          `;

          // Create cells container
          const cellsContainer = document.createElement('div');
          cellsContainer.className = 'zg-cells';
          cellsContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: auto;
          `;

          // Create header container if columns defined
          if (options.columns && options.columns.length > 0) {
            headerContainer = document.createElement('div');
            headerContainer.className = 'zg-header-container';
            viewport.appendChild(headerContainer);
          }

          // Assemble DOM
          canvas.appendChild(cellsContainer);
          scrollContainer.appendChild(canvas);
          viewport.appendChild(scrollContainer);
          container.appendChild(viewport);

          store.set('dom.viewport', viewport);
          store.set('dom.scrollContainer', scrollContainer);
          store.set('dom.canvas', canvas);
          store.set('dom.headerContainer', headerContainer);
        },
        'dom'
      );

      store.action(
        'dom:createHeaderContainer',
        () => {
          if (!options.columns || options.columns.length === 0 || !viewport) {
            return;
          }

          if (!headerContainer) {
            headerContainer = document.createElement('div');
            headerContainer.className = 'zg-header-container';
            viewport.insertBefore(headerContainer, viewport.firstChild);
            store.set('dom.headerContainer', headerContainer);
          }
        },
        'dom'
      );

      store.action(
        'dom:updateCanvasSize',
        (totalWidth: number, totalHeight: number) => {
          if (canvas) {
            canvas.style.width = `${totalWidth}px`;
            canvas.style.height = `${totalHeight}px`;
          }
        },
        'dom'
      );

      store.action(
        'dom:destroy',
        () => {
          if (viewport) {
            viewport.remove();
          }
          viewport = null;
          canvas = null;
          scrollContainer = null;
          headerContainer = null;
          store.set('dom.viewport', null);
          store.set('dom.scrollContainer', null);
          store.set('dom.canvas', null);
          store.set('dom.headerContainer', null);
        },
        'dom'
      );

      api.register('dom', {
        setup: () => store.exec('dom:setup'),
        createHeaderContainer: () => store.exec('dom:createHeaderContainer'),
        updateCanvasSize: (w: number, h: number) =>
          store.exec('dom:updateCanvasSize', w, h),
        destroy: () => store.exec('dom:destroy'),
        getViewport: () => store.get('dom.viewport'),
        getScrollContainer: () => store.get('dom.scrollContainer'),
        getCanvas: () => store.get('dom.canvas'),
        getHeaderContainer: () => store.get('dom.headerContainer'),
        getCellsContainer: () =>
          (store.get('dom.canvas') as HTMLElement | null)?.querySelector('.zg-cells') || null,
      });

      return {
        teardown: [
          () => {
            if (viewport) viewport.remove();
            viewport = null;
            canvas = null;
            scrollContainer = null;
            headerContainer = null;
          },
        ],
      };
    },
  };
}
