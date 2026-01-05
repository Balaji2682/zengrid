/**
 * Options for auto-fit calculation
 */
export interface AutoFitCalculatorOptions {
  /** Get cell value */
  getValue: (row: number, col: number) => any;
  /** Total row count */
  rowCount: number;
  /** Maximum rows to sample (default: 100) */
  sampleSize?: number;
  /** Padding to add to calculated width (default: 16) */
  padding?: number;
}

/**
 * AutoFitCalculator - Calculates optimal column width based on content
 *
 * Uses a sample of rows to estimate the maximum content width.
 * Creates a temporary off-screen element to measure text width.
 */
export class AutoFitCalculator {
  private getValue: (row: number, col: number) => any;
  private rowCount: number;
  private sampleSize: number;
  private padding: number;

  // Reusable measurement element
  private measureElement: HTMLElement | null = null;

  constructor(options: AutoFitCalculatorOptions) {
    this.getValue = options.getValue;
    this.rowCount = options.rowCount;
    this.sampleSize = options.sampleSize ?? 100;
    this.padding = options.padding ?? 16;
  }

  /**
   * Calculate optimal width for a column
   */
  calculateOptimalWidth(col: number): number {
    const element = this.getMeasureElement();
    let maxWidth = 0;

    // Sample rows evenly distributed
    const sampleIndices = this.getSampleIndices();

    for (const row of sampleIndices) {
      const value = this.getValue(row, col);
      const textWidth = this.measureTextWidth(element, value);
      maxWidth = Math.max(maxWidth, textWidth);
    }

    return maxWidth + this.padding;
  }

  /**
   * Get evenly distributed sample indices
   */
  private getSampleIndices(): number[] {
    if (this.rowCount <= this.sampleSize) {
      // Sample all rows
      return Array.from({ length: this.rowCount }, (_, i) => i);
    }

    // Evenly distributed sampling
    const step = this.rowCount / this.sampleSize;
    const indices: number[] = [];

    for (let i = 0; i < this.sampleSize; i++) {
      indices.push(Math.floor(i * step));
    }

    return indices;
  }

  /**
   * Measure text width using DOM element
   */
  private measureTextWidth(element: HTMLElement, value: any): number {
    const text = value == null ? '' : String(value);
    element.textContent = text;
    return element.offsetWidth;
  }

  /**
   * Get or create measurement element
   */
  private getMeasureElement(): HTMLElement {
    if (!this.measureElement) {
      this.measureElement = document.createElement('div');
      this.measureElement.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
      `;
      document.body.appendChild(this.measureElement);
    }
    return this.measureElement;
  }

  /**
   * Update row count
   */
  updateRowCount(rowCount: number): void {
    this.rowCount = rowCount;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.measureElement && this.measureElement.parentNode) {
      this.measureElement.parentNode.removeChild(this.measureElement);
      this.measureElement = null;
    }
  }
}
