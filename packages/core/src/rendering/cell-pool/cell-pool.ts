import type {
  CellPool as ICellPool,
  CellPoolOptions,
  CellPoolStats,
} from './cell-pool.interface';

/**
 * CellPool - DOM element pooling for performance
 *
 * Maintains a pool of reusable cell DOM elements to avoid
 * expensive creation/destruction during scrolling.
 *
 * @example
 * ```typescript
 * const container = document.querySelector('.zg-cells');
 * const pool = new CellPool({ container, initialSize: 100 });
 *
 * // Acquire cell
 * const cell = pool.acquire('0-0');
 * cell.style.left = '0px';
 * cell.style.top = '0px';
 *
 * // Release when scrolled out
 * pool.release('0-0');
 * ```
 */
export class CellPool implements ICellPool {
  private container: HTMLElement;
  private active: Map<string, HTMLElement> = new Map();
  private pool: HTMLElement[] = [];
  private maxSize: number;

  constructor(options: CellPoolOptions) {
    this.container = options.container;
    this.maxSize = options.maxSize ?? 500;

    // Pre-create initial pool
    const initialSize = options.initialSize ?? 100;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createElement());
    }
  }

  acquire(key: string): HTMLElement {
    // Return existing active cell
    if (this.active.has(key)) {
      return this.active.get(key)!;
    }

    // Get from pool or create new
    let element = this.pool.pop();
    if (!element) {
      element = this.createElement();
    }

    // Track as active
    this.active.set(key, element);
    element.dataset.cellKey = key;

    return element;
  }

  release(key: string): void {
    const element = this.active.get(key);
    if (!element) return;

    // Remove from active
    this.active.delete(key);

    // Clean up element
    this.resetElement(element);

    // Return to pool or discard if pool is full
    if (this.pool.length < this.maxSize) {
      this.pool.push(element);
    } else {
      element.remove(); // Discard excess elements
    }
  }

  releaseExcept(activeKeys: Set<string>): void {
    // Find keys to release
    const keysToRelease: string[] = [];
    for (const key of this.active.keys()) {
      if (!activeKeys.has(key)) {
        keysToRelease.push(key);
      }
    }

    // Release them
    for (const key of keysToRelease) {
      this.release(key);
    }
  }

  get stats(): CellPoolStats {
    return {
      active: this.active.size,
      pooled: this.pool.length,
      total: this.active.size + this.pool.length,
    };
  }

  clear(): void {
    // Remove all active elements from DOM
    for (const element of this.active.values()) {
      element.remove();
    }
    this.active.clear();

    // Remove all pooled elements from DOM
    for (const element of this.pool) {
      element.remove();
    }
    this.pool = [];
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'zg-cell';
    el.style.position = 'absolute';
    this.container.appendChild(el);
    return el;
  }

  private resetElement(element: HTMLElement): void {
    // Reset to default state
    element.className = 'zg-cell';
    element.innerHTML = '';
    element.style.cssText = 'position: absolute;';
    delete element.dataset.cellKey;
  }
}
