import type { GridPlugin, PluginDisposable } from '../../reactive/types';
import type { GridOptions } from '../../types';
import { resolveTotalHeaderHeight } from '../header/header-types';

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
      let pinnedTop: HTMLElement | null = null;
      let pinnedBottom: HTMLElement | null = null;

      store.extend('dom.viewport', null as HTMLElement | null, 'dom', 5);
      store.extend('dom.scrollContainer', null as HTMLElement | null, 'dom', 5);
      store.extend('dom.canvas', null as HTMLElement | null, 'dom', 5);
      store.extend('dom.headerContainer', null as HTMLElement | null, 'dom', 5);
      store.extend('dom.pinnedTop', null as HTMLElement | null, 'dom', 5);
      store.extend('dom.pinnedBottom', null as HTMLElement | null, 'dom', 5);

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

          // Total header area — includes grouped-header banner rows when a
          // colGroupProvider is set (0 rows otherwise, so the default is unchanged).
          const headerHeight =
            options.columns && options.columns.length > 0 ? resolveTotalHeaderHeight(options) : 0;

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

          // Frozen-column bands. Each is a CSS `position: sticky` container living
          // inside the scrolled canvas: `left`/`right` insets (no `top`) freeze it
          // horizontally on the compositor while it scrolls vertically with the
          // rows — zero per-frame JS, no wobble. `height: 0`/`width: 0` keep them
          // out of flow so they don't inflate the canvas scroll height. Created
          // only when a colPinProvider is set, so the default build is untouched.
          if (options.colPinProvider) {
            const pinLeft = document.createElement('div');
            pinLeft.className = 'zg-pin-left';
            pinLeft.style.cssText =
              'position: sticky; left: 0; height: 0; width: 0; z-index: 3; pointer-events: auto;';

            const pinRight = document.createElement('div');
            pinRight.className = 'zg-pin-right';
            pinRight.style.cssText =
              'position: sticky; right: 0; float: right; height: 0; width: 0; z-index: 3; pointer-events: auto;';

            canvas.appendChild(pinLeft);
            canvas.appendChild(pinRight);
          }

          scrollContainer.appendChild(canvas);
          viewport.appendChild(scrollContainer);

          // Pinned-row bands overlay the scroll area, fixed vertically while the
          // body scrolls beneath them. Created only when a pin provider is set so
          // the default build is untouched.
          if (options.pinProvider) {
            pinnedTop = document.createElement('div');
            pinnedTop.className = 'zg-pinned-top';
            pinnedTop.style.cssText = `position: absolute; top: ${headerHeight}px; left: 0; right: 0; overflow: hidden; display: none;`;

            pinnedBottom = document.createElement('div');
            pinnedBottom.className = 'zg-pinned-bottom';
            pinnedBottom.style.cssText = 'position: absolute; bottom: 0; left: 0; right: 0; overflow: hidden; display: none;';

            viewport.appendChild(pinnedTop);
            viewport.appendChild(pinnedBottom);
          }

          container.appendChild(viewport);

          store.set('dom.viewport', viewport);
          store.set('dom.scrollContainer', scrollContainer);
          store.set('dom.canvas', canvas);
          store.set('dom.headerContainer', headerContainer);
          store.set('dom.pinnedTop', pinnedTop);
          store.set('dom.pinnedBottom', pinnedBottom);
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
          pinnedTop = null;
          pinnedBottom = null;
          store.set('dom.viewport', null);
          store.set('dom.scrollContainer', null);
          store.set('dom.canvas', null);
          store.set('dom.headerContainer', null);
          store.set('dom.pinnedTop', null);
          store.set('dom.pinnedBottom', null);
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
        getPinnedTop: () => store.get('dom.pinnedTop'),
        getPinnedBottom: () => store.get('dom.pinnedBottom'),
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
            pinnedTop = null;
            pinnedBottom = null;
          },
        ],
      };
    },
  };
}
