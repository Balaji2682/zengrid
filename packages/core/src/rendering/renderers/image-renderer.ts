import type { CellRenderer, RenderParams } from './renderer.interface';

/**
 * Options for ImageRenderer
 */
export interface ImageRendererOptions {
  /**
   * Fallback image URL if primary image fails to load
   */
  fallbackSrc?: string;

  /**
   * CSS object-fit property
   * @default 'contain'
   */
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

  /**
   * Placeholder to show while image loads
   * Can be a URL or 'skeleton' for skeleton loader
   */
  placeholder?: string;

  /**
   * Alt text for accessibility
   * @default ''
   */
  alt?: string;
}

/**
 * ImageRenderer - Image display with lazy loading
 *
 * Renders images with lazy loading, fallback support, and object-fit options.
 * Handles both string URLs and object values with 'src' property.
 *
 * @example
 * ```typescript
 * const renderer = new ImageRenderer({
 *   fit: 'cover',
 *   fallbackSrc: '/images/placeholder.png',
 * });
 * renderer.render(element, { value: 'https://example.com/image.jpg', ...otherParams });
 * ```
 *
 * @example
 * ```typescript
 * // Using object value
 * renderer.render(element, {
 *   value: { src: 'https://example.com/image.jpg', alt: 'Product photo' },
 *   ...otherParams
 * });
 * ```
 */
export class ImageRenderer implements CellRenderer {
  private options: ImageRendererOptions;

  constructor(options: ImageRendererOptions = {}) {
    this.options = {
      fit: 'contain',
      alt: '',
      ...options,
    };
  }

  render(element: HTMLElement, params: RenderParams): void {
    element.classList.add('zg-cell-image');

    const img = document.createElement('img');
    img.className = 'zg-cell-image__img';
    img.style.objectFit = this.options.fit!;
    img.loading = 'lazy';
    img.alt = this.extractAlt(params.value) || this.options.alt!;

    // Error handling
    img.onerror = () => {
      if (this.options.fallbackSrc && img.src !== this.options.fallbackSrc) {
        img.src = this.options.fallbackSrc;
      } else {
        img.style.display = 'none';
      }
    };

    element.appendChild(img);
    this.updateImage(img, params.value);
  }

  update(element: HTMLElement, params: RenderParams): void {
    const img = element.querySelector('img');
    if (img) {
      this.updateImage(img, params.value);
      const alt = this.extractAlt(params.value);
      if (alt) {
        img.alt = alt;
      }
    }
  }

  destroy(element: HTMLElement): void {
    element.innerHTML = '';
    element.classList.remove('zg-cell-image');
  }

  private updateImage(img: HTMLImageElement, value: any): void {
    const src = this.extractSrc(value);
    if (src && img.src !== src) {
      img.style.display = '';
      img.src = src;
    } else if (!src) {
      img.style.display = 'none';
    }
  }

  private extractSrc(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.src) return value.src;
    return null;
  }

  private extractAlt(value: any): string | null {
    if (value && typeof value === 'object' && value.alt) return value.alt;
    return null;
  }
}
