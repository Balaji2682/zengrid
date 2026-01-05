/**
 * Renderer Cache Configuration
 */
export interface RendererCacheConfig {
  /**
   * Whether to enable renderer caching
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum number of cached entries
   * @default 1000
   */
  capacity?: number;

  /**
   * Cache strategy
   * @default 'lru'
   */
  strategy?: 'lru';

  /**
   * Time-to-live in milliseconds (0 = infinite)
   * @default 0
   */
  ttl?: number;

  /**
   * Track cache statistics
   * @default false
   */
  trackStats?: boolean;
}

/**
 * Cached render content
 */
export interface CachedRenderContent {
  /**
   * The rendered HTML string
   */
  html: string;

  /**
   * CSS classes to apply
   */
  classes?: string[];

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Renderer Cache Interface
 */
export interface IRendererCache {
  /**
   * Get cached content for a cell
   *
   * @param key - Cache key
   * @returns Cached content or undefined
   */
  get(key: string): CachedRenderContent | undefined;

  /**
   * Set cached content for a cell
   *
   * @param key - Cache key
   * @param content - Content to cache
   */
  set(key: string, content: CachedRenderContent): void;

  /**
   * Check if content is cached
   *
   * @param key - Cache key
   * @returns True if cached
   */
  has(key: string): boolean;

  /**
   * Clear all cached content
   */
  clear(): void;

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    capacity: number;
    hitRate: number;
    hits: number;
    misses: number;
    evictions: number;
  };
}
