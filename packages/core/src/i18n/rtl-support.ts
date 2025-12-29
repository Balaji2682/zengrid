/**
 * RTL (Right-to-Left) support options
 */
export interface RTLSupportOptions {
  /**
   * Grid container element
   */
  container: HTMLElement;

  /**
   * Text direction
   * @default 'ltr'
   */
  direction?: 'ltr' | 'rtl';

  /**
   * Auto-detect direction from document
   * @default true
   */
  autoDetect?: boolean;

  /**
   * Callback when direction changes
   */
  onDirectionChange?: (direction: 'ltr' | 'rtl') => void;
}

/**
 * RTLSupport - Manages Right-to-Left layout support
 *
 * Handles RTL layout for Arabic, Hebrew, Persian, and other RTL languages:
 * - Direction detection and switching
 * - RTL-aware column positioning
 * - Scroll position normalization (browser compatibility)
 * - Direction-aware hit testing
 *
 * @example
 * ```typescript
 * const rtl = new RTLSupport({
 *   container: gridElement,
 *   direction: 'rtl',
 * });
 *
 * // Get direction-aware column offset
 * const offset = rtl.getColumnOffset(col, totalWidth, colWidth);
 *
 * // Normalize scroll position
 * const normalized = rtl.normalizeScrollLeft(scrollLeft, scrollWidth, clientWidth);
 * ```
 */
export class RTLSupport {
  private container: HTMLElement;
  private direction: 'ltr' | 'rtl';
  private onDirectionChange?: (direction: 'ltr' | 'rtl') => void;

  constructor(options: RTLSupportOptions) {
    this.container = options.container;
    this.onDirectionChange = options.onDirectionChange;

    // Detect or set direction
    if (options.autoDetect !== false) {
      this.direction = this.detectDirection();
    } else {
      this.direction = options.direction || 'ltr';
    }

    // Apply direction
    this.applyDirection();
  }

  /**
   * Get current text direction
   */
  getDirection(): 'ltr' | 'rtl' {
    return this.direction;
  }

  /**
   * Set text direction
   * @param direction - New direction
   */
  setDirection(direction: 'ltr' | 'rtl'): void {
    if (this.direction === direction) return;

    this.direction = direction;
    this.applyDirection();

    if (this.onDirectionChange) {
      this.onDirectionChange(direction);
    }
  }

  /**
   * Check if RTL mode is active
   */
  isRTL(): boolean {
    return this.direction === 'rtl';
  }

  /**
   * Get direction-aware column offset
   * @param col - Column index
   * @param totalWidth - Total grid width
   * @param colOffsetLTR - Column offset in LTR mode
   * @returns Direction-aware offset
   */
  getColumnOffset(_col: number, totalWidth: number, colOffsetLTR: number): number {
    if (this.direction === 'ltr') {
      return colOffsetLTR;
    }

    // In RTL, reverse the column position
    return totalWidth - colOffsetLTR;
  }

  /**
   * Normalize scroll position for RTL
   *
   * Different browsers handle RTL scrolling differently:
   * - Chrome/Safari: scrollLeft is negative in RTL
   * - Firefox: scrollLeft is positive but reversed
   * - Edge: scrollLeft is positive
   *
   * This normalizes to always return positive values.
   *
   * @param scrollLeft - Raw scroll left value
   * @param scrollWidth - Scroll container width
   * @param clientWidth - Visible width
   * @returns Normalized scroll position (always positive)
   */
  normalizeScrollLeft(scrollLeft: number, scrollWidth: number, clientWidth: number): number {
    if (this.direction === 'ltr') {
      return scrollLeft;
    }

    // Detect browser behavior
    const behavior = this.detectScrollBehavior();

    switch (behavior) {
      case 'negative':
        // Chrome/Safari: negative values
        return Math.abs(scrollLeft);

      case 'reverse':
        // Firefox: positive but reversed
        return scrollWidth - clientWidth - scrollLeft;

      case 'positive':
        // Edge: positive from right
        return scrollLeft;

      default:
        return Math.abs(scrollLeft);
    }
  }

  /**
   * Denormalize scroll position for setting
   * @param normalizedScrollLeft - Normalized scroll position
   * @param scrollWidth - Scroll container width
   * @param clientWidth - Visible width
   * @returns Browser-specific scroll value
   */
  denormalizeScrollLeft(
    normalizedScrollLeft: number,
    scrollWidth: number,
    clientWidth: number
  ): number {
    if (this.direction === 'ltr') {
      return normalizedScrollLeft;
    }

    const behavior = this.detectScrollBehavior();

    switch (behavior) {
      case 'negative':
        return -normalizedScrollLeft;

      case 'reverse':
        return scrollWidth - clientWidth - normalizedScrollLeft;

      case 'positive':
        return normalizedScrollLeft;

      default:
        return normalizedScrollLeft;
    }
  }

  /**
   * Get direction-aware horizontal alignment
   * @param align - Logical alignment ('start' or 'end')
   * @returns Physical alignment ('left' or 'right')
   */
  getPhysicalAlignment(align: 'start' | 'end'): 'left' | 'right' {
    if (this.direction === 'ltr') {
      return align === 'start' ? 'left' : 'right';
    } else {
      return align === 'start' ? 'right' : 'left';
    }
  }

  /**
   * Apply direction to container
   */
  private applyDirection(): void {
    this.container.setAttribute('dir', this.direction);

    // Also set on document if not already set
    if (!document.documentElement.hasAttribute('dir')) {
      document.documentElement.setAttribute('dir', this.direction);
    }
  }

  /**
   * Detect text direction from document or language
   */
  private detectDirection(): 'ltr' | 'rtl' {
    // Check container attribute
    const containerDir = this.container.getAttribute('dir');
    if (containerDir === 'rtl' || containerDir === 'ltr') {
      return containerDir;
    }

    // Check document direction
    const docDir = document.documentElement.getAttribute('dir') ||
                   document.body.getAttribute('dir');
    if (docDir === 'rtl' || docDir === 'ltr') {
      return docDir as 'ltr' | 'rtl';
    }

    // Check language (common RTL languages)
    const lang = document.documentElement.lang || navigator.language;
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi']; // Arabic, Hebrew, Persian, Urdu, Yiddish

    if (rtlLanguages.some(rtlLang => lang.startsWith(rtlLang))) {
      return 'rtl';
    }

    // Default to LTR
    return 'ltr';
  }

  /**
   * Detect browser RTL scroll behavior
   */
  private detectScrollBehavior(): 'negative' | 'reverse' | 'positive' {
    // Create test element
    const test = document.createElement('div');
    test.dir = 'rtl';
    test.style.cssText = `
      position: absolute;
      top: -9999px;
      width: 100px;
      height: 100px;
      overflow: scroll;
    `;

    const inner = document.createElement('div');
    inner.style.width = '200px';
    inner.style.height = '1px';

    test.appendChild(inner);
    document.body.appendChild(test);

    // Set scroll to middle
    test.scrollLeft = 50;

    let behavior: 'negative' | 'reverse' | 'positive';

    if (test.scrollLeft < 0) {
      behavior = 'negative';
    } else if (test.scrollLeft > 0 && test.scrollLeft < 100) {
      behavior = 'positive';
    } else {
      behavior = 'reverse';
    }

    // Cleanup
    document.body.removeChild(test);

    return behavior;
  }

  /**
   * Destroy RTL support
   */
  destroy(): void {
    // Optionally remove dir attribute
    // this.container.removeAttribute('dir');
  }
}
