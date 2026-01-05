import type { LoadingState, LoadingConfig } from '../../types';

/**
 * LoadingIndicator - Renders loading UI with multiple template styles
 *
 * Provides 4 built-in template styles:
 * 1. **Simple**: Basic text "Loading..."
 * 2. **Animated**: Animated spinner with rotating dots
 * 3. **Modern**: Modern circular loader with smooth animation
 * 4. **Skeleton**: Skeleton screen with shimmer effect
 *
 * @example Basic Usage
 * ```typescript
 * const loadingIndicator = new LoadingIndicator({
 *   enabled: true,
 *   template: 'modern',
 *   message: 'Loading data...',
 * });
 *
 * const container = loadingIndicator.render({ isLoading: true });
 * document.body.appendChild(container);
 * ```
 */
export class LoadingIndicator {
  private config: Required<Omit<LoadingConfig, 'customTemplate'>> & Pick<LoadingConfig, 'customTemplate'>;
  private container: HTMLElement | null = null;
  private startTime: number = 0;
  private minDisplayTimeout: number | null = null;

  constructor(config: LoadingConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      template: config.template ?? 'modern',
      message: config.message ?? 'Loading...',
      minDisplayTime: config.minDisplayTime ?? 300,
      position: config.position ?? 'center',
      showOverlay: config.showOverlay ?? true,
      overlayOpacity: config.overlayOpacity ?? 0.5,
      customTemplate: config.customTemplate,
    };
  }

  /**
   * Render loading indicator
   */
  render(state: LoadingState): HTMLElement {
    // Use custom template if provided
    if (this.config.customTemplate) {
      try {
        return this.config.customTemplate(state);
      } catch (error) {
        console.error('Error rendering custom loading template:', error);
        // Fallback to modern template on error
        return this.renderModernTemplate(state);
      }
    }

    // Use built-in template
    switch (this.config.template) {
      case 'simple':
        return this.renderSimpleTemplate(state);
      case 'animated':
        return this.renderAnimatedTemplate(state);
      case 'modern':
        return this.renderModernTemplate(state);
      case 'skeleton':
        return this.renderSkeletonTemplate(state);
      default:
        return this.renderModernTemplate(state);
    }
  }

  /**
   * Show loading indicator
   */
  show(parentElement: HTMLElement, state: LoadingState = { isLoading: true }): void {
    if (!this.config.enabled) return;

    // Guard: Validate parent element
    if (!parentElement || !parentElement.isConnected) {
      console.warn('LoadingIndicator.show(): Parent element is null or not in DOM');
      return;
    }

    this.startTime = Date.now();

    // Clear any pending hide timeout
    if (this.minDisplayTimeout !== null) {
      clearTimeout(this.minDisplayTimeout);
      this.minDisplayTimeout = null;
    }

    // Remove existing indicator if present
    this.hide();

    // Create new indicator
    this.container = this.render(state);
    this.container.classList.add('zg-loading-active');

    // Safety: Check parent still exists before appending
    if (parentElement && parentElement.isConnected) {
      parentElement.appendChild(this.container);
    } else {
      console.warn('LoadingIndicator.show(): Parent element was removed from DOM');
      this.container = null;
    }
  }

  /**
   * Hide loading indicator with minimum display time
   */
  hide(): Promise<void> {
    return new Promise((resolve) => {
      // Guard: Clear any existing hide timeout
      if (this.minDisplayTimeout !== null) {
        clearTimeout(this.minDisplayTimeout);
        this.minDisplayTimeout = null;
      }

      if (!this.container) {
        resolve();
        return;
      }

      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.config.minDisplayTime - elapsed);

      const doHide = () => {
        // Guard: Check if container still exists and is in DOM
        if (this.container) {
          if (this.container.parentElement) {
            this.container.classList.remove('zg-loading-active');
            this.container.classList.add('zg-loading-hiding');

            // Wait for fade out animation
            setTimeout(() => {
              // Final check before removing from DOM
              if (this.container && this.container.parentElement) {
                try {
                  this.container.parentElement.removeChild(this.container);
                } catch (error) {
                  // Silently handle if already removed
                  console.debug('LoadingIndicator.hide(): Container already removed from DOM');
                }
              }
              this.container = null;
              resolve();
            }, 200);
          } else {
            // Container was removed from DOM externally
            this.container = null;
            resolve();
          }
        } else {
          resolve();
        }
      };

      if (remaining > 0) {
        this.minDisplayTimeout = window.setTimeout(doHide, remaining);
      } else {
        doHide();
      }
    });
  }

  /**
   * Update loading state
   */
  update(state: LoadingState): void {
    // Guard: Check container exists and is still in DOM
    if (!this.container || !this.container.parentElement) {
      console.debug('LoadingIndicator.update(): Container not available or removed from DOM');
      return;
    }

    try {
      // Update message if changed
      const messageEl = this.container.querySelector('.zg-loading-message');
      if (messageEl && state.message) {
        messageEl.textContent = state.message;
      }

      // Update progress if template supports it (removed for now since overlay is gone)
      // Progress bar was only in overlay template
    } catch (error) {
      console.error('LoadingIndicator.update(): Error updating state', error);
    }
  }

  /**
   * Template 1: Simple - Basic text
   * Layout: Loading...
   */
  private renderSimpleTemplate(state: LoadingState): HTMLElement {
    const container = document.createElement('div');
    container.className = `zg-loading zg-loading-simple zg-loading-${this.config.position}`;

    const message = document.createElement('div');
    message.className = 'zg-loading-message';
    message.textContent = state.message ?? this.config.message;

    container.appendChild(message);

    return container;
  }

  /**
   * Template 2: Animated - Rotating dots spinner
   * Layout: ● ● ● Loading...
   */
  private renderAnimatedTemplate(state: LoadingState): HTMLElement {
    const container = document.createElement('div');
    container.className = `zg-loading zg-loading-animated zg-loading-${this.config.position}`;

    // Spinner with rotating dots
    const spinner = document.createElement('div');
    spinner.className = 'zg-loading-spinner';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'zg-loading-dot';
      dot.style.animationDelay = `${i * 0.15}s`;
      spinner.appendChild(dot);
    }

    container.appendChild(spinner);

    // Message
    const message = document.createElement('div');
    message.className = 'zg-loading-message';
    message.textContent = state.message ?? this.config.message;
    container.appendChild(message);

    return container;
  }

  /**
   * Template 3: Modern - Circular loader
   * Layout: ○ Loading...
   */
  private renderModernTemplate(state: LoadingState): HTMLElement {
    const container = document.createElement('div');
    container.className = `zg-loading zg-loading-modern zg-loading-${this.config.position}`;

    // Modern circular spinner
    const spinner = document.createElement('div');
    spinner.className = 'zg-loading-spinner-circle';

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    circle.setAttribute('viewBox', '0 0 50 50');
    circle.setAttribute('class', 'zg-loading-svg');

    const circlePath = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circlePath.setAttribute('cx', '25');
    circlePath.setAttribute('cy', '25');
    circlePath.setAttribute('r', '20');
    circlePath.setAttribute('fill', 'none');
    circlePath.setAttribute('class', 'zg-loading-circle-path');

    circle.appendChild(circlePath);
    spinner.appendChild(circle);
    container.appendChild(spinner);

    // Message
    const message = document.createElement('div');
    message.className = 'zg-loading-message';
    message.textContent = state.message ?? this.config.message;
    container.appendChild(message);

    return container;
  }

  /**
   * Template 4: Skeleton - Skeleton screen shimmer
   * Layout: [====    ] shimmer effect
   */
  private renderSkeletonTemplate(state: LoadingState): HTMLElement {
    const container = document.createElement('div');
    container.className = `zg-loading zg-loading-skeleton`;

    // Create skeleton grid that mimics the actual grid structure
    const skeletonGrid = document.createElement('div');
    skeletonGrid.className = 'zg-loading-skeleton-grid';

    // Create enough rows to fill any reasonable viewport
    // With 32px row height, 50 rows = 1600px which covers most screens
    // Overflow will be hidden by CSS
    const rowCount = 50;
    const colCount = 10; // Match actual grid columns

    for (let i = 0; i < rowCount; i++) {
      const row = document.createElement('div');
      row.className = 'zg-loading-skeleton-row';

      for (let j = 0; j < colCount; j++) {
        const cell = document.createElement('div');
        cell.className = 'zg-loading-skeleton-cell';

        const shimmer = document.createElement('div');
        shimmer.className = 'zg-loading-skeleton-shimmer';
        cell.appendChild(shimmer);

        row.appendChild(cell);
      }

      skeletonGrid.appendChild(row);
    }

    container.appendChild(skeletonGrid);

    return container;
  }

  /**
   * Check if loading is currently visible
   */
  isVisible(): boolean {
    return this.container !== null && this.container.classList.contains('zg-loading-active');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoadingConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Destroy loading indicator
   * Safely removes all references and cleans up DOM
   */
  destroy(): void {
    // Clear any pending timeout
    if (this.minDisplayTimeout !== null) {
      clearTimeout(this.minDisplayTimeout);
      this.minDisplayTimeout = null;
    }

    // Remove container from DOM if it exists
    if (this.container) {
      if (this.container.parentElement) {
        try {
          this.container.parentElement.removeChild(this.container);
        } catch (error) {
          // Silently handle if container was already removed
          console.debug('LoadingIndicator.destroy(): Container already removed from DOM');
        }
      }
      this.container = null;
    }

    // Reset state
    this.startTime = 0;
  }
}
