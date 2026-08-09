/**
 * Drag Visual Feedback
 *
 * @description
 * Manages visual feedback during column drag operations:
 * - Ghost element (semi-transparent column preview)
 * - Drop indicator line (vertical line at drop position)
 * - Adjacent column highlights
 */

import { ReactiveObjectPool } from '@zengrid/shared';
import type { VisualFeedbackOptions } from './column-drag-manager.interface';

/**
 * Manages visual feedback for column drag operations
 */
export class DragVisualFeedback {
  private showGhost: boolean;
  private showDropIndicator: boolean;
  private showHighlights: boolean;
  private getHeaderContainer?: () => HTMLElement | null;

  // Visual elements
  private ghostElement: HTMLElement | null = null;
  private dropIndicator: HTMLElement | null = null;
  private highlightElements: HTMLElement[] = [];

  // Source column element (for styling during drag)
  private sourceElement: HTMLElement | null = null;

  // Pool for highlight elements (reuse for performance)
  private highlightPool: ReactiveObjectPool<HTMLElement>;

  constructor(options: VisualFeedbackOptions = {}) {
    this.showGhost = options.showGhost ?? true;
    this.showDropIndicator = options.showDropIndicator ?? true;
    this.showHighlights = options.showHighlights ?? true;
    this.getHeaderContainer = options.getHeaderContainer;

    // Initialize object pool for highlights
    this.highlightPool = new ReactiveObjectPool({
      factory: () => this.createHighlightElement(),
      reset: (el) => {
        el.style.display = 'none';
        el.classList.remove('zg-drag-highlight-left', 'zg-drag-highlight-right');
      },
      initialSize: 0, // Don't prewarm - lifecycle not yet initialized
      maxSize: 4, // Max 2 adjacent columns highlighted at once
    });
  }

  /**
   * Start drag - create ghost and show visual feedback
   */
  startDrag(sourceElement: HTMLElement, startX: number, startY: number): void {
    this.sourceElement = sourceElement;

    // Add dragging class to source element
    sourceElement.classList.add('zg-header-cell--dragging');

    // Clean up any orphaned indicators from previous drags
    const container = this.getHeaderContainer?.();
    if (container) {
      const orphanedIndicators = container.querySelectorAll('.zg-column-drop-indicator');
      orphanedIndicators.forEach((el, index) => {
        // Keep only the first one, remove others
        if (index > 0) {
          el.remove();
        }
      });
    }

    // Create and show ghost element
    if (this.showGhost) {
      this.createGhost(sourceElement);
      this.updateGhostPosition(startX, startY);
    }

    // Create drop indicator (hidden initially)
    if (this.showDropIndicator) {
      this.createDropIndicatorIfNeeded();
    }
  }

  /**
   * Update ghost element position
   */
  updateGhostPosition(x: number, y: number): void {
    if (!this.ghostElement) return;

    // Offset ghost so cursor is at the center
    const rect = this.ghostElement.getBoundingClientRect();
    this.ghostElement.style.left = `${x - rect.width / 2}px`;
    this.ghostElement.style.top = `${y - 20}px`; // 20px above cursor
  }

  /**
   * Show drop indicator at position
   */
  showDropIndicatorAt(x: number): void {
    if (!this.showDropIndicator || !this.dropIndicator) return;

    const container = this.getHeaderContainer?.();
    if (!container) return;

    // Set explicit height to match header container
    const height = container.offsetHeight;

    // Use position relative to header container, not viewport
    this.dropIndicator.style.left = `${x}px`;
    this.dropIndicator.style.height = `${height}px`;
    this.dropIndicator.style.display = 'block';
  }

  /**
   * Hide drop indicator
   */
  hideDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = 'none';
    }
  }

  /**
   * Highlight adjacent columns
   */
  highlightAdjacentColumns(
    leftColumnId: string | null,
    rightColumnId: string | null,
    getHeaderCell: (id: string) => HTMLElement | null
  ): void {
    if (!this.showHighlights) return;

    // Clear existing highlights
    this.clearHighlights();

    if (leftColumnId) {
      const leftCell = getHeaderCell(leftColumnId);
      if (leftCell) {
        const highlight = this.highlightPool.acquire();
        highlight.classList.add('zg-drag-highlight-right');
        this.positionHighlight(highlight, leftCell);
        this.highlightElements.push(highlight);
      }
    }

    if (rightColumnId) {
      const rightCell = getHeaderCell(rightColumnId);
      if (rightCell) {
        const highlight = this.highlightPool.acquire();
        highlight.classList.add('zg-drag-highlight-left');
        this.positionHighlight(highlight, rightCell);
        this.highlightElements.push(highlight);
      }
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    this.highlightElements.forEach((el) => this.highlightPool.release(el));
    this.highlightElements = [];
  }

  /**
   * End drag - cleanup all visual feedback
   */
  endDrag(): void {
    // Remove dragging class from source
    if (this.sourceElement) {
      this.sourceElement.classList.remove('zg-header-cell--dragging');
      this.sourceElement = null;
    }

    // Remove ghost
    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    // Hide drop indicator (don't remove, reuse it)
    this.hideDropIndicator();

    // Clear highlights
    this.clearHighlights();
  }

  /**
   * Create ghost element
   */
  private createGhost(sourceElement: HTMLElement): void {
    // Clone the source element
    const ghost = sourceElement.cloneNode(true) as HTMLElement;
    ghost.className = 'zg-column-drag-ghost';

    // Set initial styles
    ghost.style.cssText = `
      position: fixed;
      pointer-events: none;
      opacity: 0.7;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: scale(1.02);
      transition: transform 0.1s ease;
    `;

    // Copy computed width from source
    const width = sourceElement.offsetWidth;
    ghost.style.width = `${width}px`;

    document.body.appendChild(ghost);
    this.ghostElement = ghost;
  }

  /**
   * Create drop indicator element
   */
  private createDropIndicatorIfNeeded(): void {
    const container = this.getHeaderContainer?.();
    if (!container) return;

    // Reuse the cached indicator only while it's still attached to the current
    // header container. A column reorder rebuilds the header cells
    // (`headerCellsContainer.innerHTML = ''`), which detaches this element — so a
    // stale reference here would leave no drop line on every drag after the first
    // reorder. When that happens, fall through and recreate it.
    if (this.dropIndicator && this.dropIndicator.parentElement === container) return;

    // Check if an indicator already exists in the container to prevent duplicates
    const existingIndicator = container.querySelector('.zg-column-drop-indicator') as HTMLElement;
    if (existingIndicator) {
      this.dropIndicator = existingIndicator;
      return;
    }

    const indicator = document.createElement('div');
    indicator.className = 'zg-column-drop-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: 0;
      width: 3px;
      background: var(--zg-primary-color, #2196F3);
      pointer-events: none;
      z-index: 10001;
      display: none;
      box-shadow: 0 0 8px var(--zg-primary-color, #2196F3);
    `;

    // Append to header container so it scrolls with headers
    container.appendChild(indicator);
    this.dropIndicator = indicator;
  }

  /**
   * Create highlight element
   */
  private createHighlightElement(): HTMLElement {
    const highlight = document.createElement('div');
    highlight.className = 'zg-column-drag-highlight';
    highlight.style.cssText = `
      position: absolute;
      top: 0;
      pointer-events: none;
      z-index: 9999;
      background: rgba(33, 150, 243, 0.1);
      border: 2px solid var(--zg-primary-color, #2196F3);
      display: none;
    `;

    const container = this.getHeaderContainer?.();
    if (container) {
      container.appendChild(highlight);
    } else {
      document.body.appendChild(highlight);
    }

    return highlight;
  }

  /**
   * Position highlight element over a header cell
   */
  private positionHighlight(highlight: HTMLElement, headerCell: HTMLElement): void {
    const rect = headerCell.getBoundingClientRect();
    const container = this.getHeaderContainer?.();

    if (container) {
      const containerRect = container.getBoundingClientRect();

      // Use header cell's exact dimensions and position (Approach 3)
      highlight.style.left = `${rect.left - containerRect.left}px`;
      highlight.style.top = `${rect.top - containerRect.top}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
    } else {
      highlight.style.left = `${rect.left}px`;
      highlight.style.top = `${rect.top}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
    }

    highlight.style.display = 'block';
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.endDrag();

    // Remove drop indicator
    if (this.dropIndicator && this.dropIndicator.parentElement) {
      this.dropIndicator.remove();
    }
    this.dropIndicator = null;

    // Destroy object pool
    this.highlightPool.destroy();
  }
}
