/**
 * ResizePreview - Renders a preview line during column resize drag
 *
 * Shows a vertical line that follows the cursor during resize,
 * giving visual feedback before the resize is committed.
 */
export class ResizePreview {
  private previewElement: HTMLElement | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show preview at specified X position (relative to container)
   */
  show(x: number, height: number): void {
    const element = this.getOrCreatePreviewElement();

    // Convert container-relative X to viewport coordinates
    const rect = this.container.getBoundingClientRect();
    const absoluteX = rect.left + x;
    // Start preview from bottom of header (rect.top + rect.height)
    const absoluteY = rect.top + rect.height;

    element.style.left = `${absoluteX}px`;
    element.style.top = `${absoluteY}px`;
    element.style.height = `${height}px`;
    element.style.display = 'block';
  }

  /**
   * Update preview position (relative to container)
   */
  update(x: number): void {
    if (this.previewElement) {
      // Convert container-relative X to viewport coordinates
      const rect = this.container.getBoundingClientRect();
      const absoluteX = rect.left + x;
      this.previewElement.style.left = `${absoluteX}px`;
    }
  }

  /**
   * Hide preview
   */
  hide(): void {
    if (this.previewElement) {
      this.previewElement.style.display = 'none';
    }
  }

  /**
   * Get or create preview element
   */
  private getOrCreatePreviewElement(): HTMLElement {
    if (!this.previewElement) {
      this.previewElement = document.createElement('div');
      this.previewElement.className = 'zg-resize-preview';
      // Only set dynamic positioning properties inline
      // Visual styles should come from CSS classes
      this.previewElement.style.position = 'fixed';
      this.previewElement.style.display = 'none';
      // Append to body instead of container for fixed positioning
      document.body.appendChild(this.previewElement);
    }
    return this.previewElement;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.previewElement && this.previewElement.parentNode) {
      this.previewElement.parentNode.removeChild(this.previewElement);
      this.previewElement = null;
    }
  }
}
