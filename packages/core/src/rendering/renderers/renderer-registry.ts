import type { CellRenderer } from './renderer.interface';
import { TextRenderer } from './text-renderer';

/**
 * RendererRegistry - Named renderer lookup
 *
 * Manages a collection of renderers by name for dynamic lookup.
 * Provides a default text renderer for fallback.
 *
 * @example
 * ```typescript
 * const registry = new RendererRegistry();
 * registry.register('number', new NumberRenderer());
 * registry.register('image', new ImageRenderer());
 *
 * const renderer = registry.get('number'); // Returns NumberRenderer
 * const fallback = registry.get('unknown'); // Returns TextRenderer (default)
 * ```
 */
export class RendererRegistry {
  private renderers: Map<string, CellRenderer> = new Map();
  private defaultRenderer: CellRenderer;

  constructor() {
    this.defaultRenderer = new TextRenderer();
    this.register('text', this.defaultRenderer);
  }

  /**
   * Register a renderer with a name
   * @param name - Unique renderer name
   * @param renderer - Renderer instance
   */
  register(name: string, renderer: CellRenderer): void {
    this.renderers.set(name, renderer);
  }

  /**
   * Get a renderer by name
   * @param name - Renderer name (undefined returns default)
   * @returns Renderer instance or default if not found
   */
  get(name: string | undefined): CellRenderer {
    if (!name) return this.defaultRenderer;
    return this.renderers.get(name) ?? this.defaultRenderer;
  }

  /**
   * Check if a renderer is registered
   * @param name - Renderer name
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.renderers.has(name);
  }

  /**
   * Unregister a renderer
   * @param name - Renderer name
   * @returns True if unregistered, false if not found or is default
   */
  unregister(name: string): boolean {
    if (name === 'text') return false; // Cannot unregister default
    return this.renderers.delete(name);
  }

  /**
   * Get all registered renderer names
   */
  get names(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * Clear all renderers except default
   */
  clear(): void {
    this.renderers.clear();
    this.renderers.set('text', this.defaultRenderer);
  }
}
