import type { ColumnConstraints } from '../../features/column-resize';
import type { ColumnModel } from '../../features/columns';
import type { SlimGridContext } from '../grid-context';

export interface ColumnApi {
  attachResize(headerElement: HTMLElement): void;
  detachResize(): void;
  resize(col: number, width: number): void;
  autoFit(col: number): void;
  autoFitAll(): void;
  setConstraints(col: number, constraints: ColumnConstraints): void;
  updateResizeHandles(): void;
  attachDrag(headerElement: HTMLElement): void;
  detachDrag(): void;
  isDragging(): boolean;
  /**
   * The live column model — the low-level layout primitive (widths, visibility,
   * order, pin state). Capturing and restoring that layout as a snapshot is an
   * enterprise feature: see `@zengrid/enterprise`'s `ColumnStateManager`, which
   * reads and writes this model.
   */
  getModel(): ColumnModel | null;
}

export function createColumnApi(ctx: SlimGridContext): ColumnApi {
  return {
    attachResize(headerElement: HTMLElement): void {
      ctx.store.exec('column:attachResize', headerElement);
    },

    detachResize(): void {
      ctx.store.exec('column:detachResize');
    },

    resize(col: number, width: number): void {
      ctx.store.exec('column:resizeColumn', col, width);
    },

    autoFit(col: number): void {
      ctx.store.exec('column:autoFit', col);
    },

    autoFitAll(): void {
      ctx.store.exec('column:autoFitAll');
    },

    setConstraints(col: number, constraints: ColumnConstraints): void {
      ctx.store.exec('column:setConstraints', col, constraints);
    },

    updateResizeHandles(): void {
      ctx.store.exec('column:updateResizeHandles');
    },

    attachDrag(headerElement: HTMLElement): void {
      ctx.store.exec('column:attachDrag', headerElement);
    },

    detachDrag(): void {
      ctx.store.exec('column:detachDrag');
    },

    isDragging(): boolean {
      const api = ctx.gridApi.getMethod('column', 'isDragging');
      return api ? api() : false;
    },

    getModel(): ColumnModel | null {
      const api = ctx.gridApi.getMethod('column', 'getModel');
      return api ? api() : null;
    },
  };
}
