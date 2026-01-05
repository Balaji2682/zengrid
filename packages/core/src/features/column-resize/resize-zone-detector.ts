import type {
  ResizableDataSource,
  ResizeZoneResult,
} from './column-resize-manager.interface';

/**
 * Configuration for zone detector
 */
export interface ZoneDetectorOptions {
  /** Width of resize zone in pixels (default: 6) */
  resizeZoneWidth?: number;
}

/**
 * Pure zone detection logic
 * Separated from main manager for testability
 */
export class ResizeZoneDetector {
  private resizeZoneWidth: number;

  constructor(options: ZoneDetectorOptions = {}) {
    this.resizeZoneWidth = options.resizeZoneWidth ?? 6;
  }

  /**
   * Detect if mouse position is in a resize zone
   * @param x Mouse X position in grid coordinates
   * @param dataSource Data source for column information
   * @returns Resize zone result
   */
  detectZone(x: number, dataSource: ResizableDataSource): ResizeZoneResult {
    const colCount = dataSource.getColumnCount();
    const halfZone = this.resizeZoneWidth / 2;

    // Check each column border (right edge)
    for (let col = 0; col < colCount; col++) {
      const offset = dataSource.getColumnOffset(col);
      const width = dataSource.getColumnWidth(col);
      const borderX = offset + width;

      // Check if mouse is near this border
      if (x >= borderX - halfZone && x <= borderX + halfZone) {
        return {
          inResizeZone: true,
          column: col,
          borderX,
        };
      }
    }

    return {
      inResizeZone: false,
      column: -1,
      borderX: -1,
    };
  }

  /**
   * Get the resize zone width
   */
  getZoneWidth(): number {
    return this.resizeZoneWidth;
  }

  /**
   * Set the resize zone width
   */
  setZoneWidth(width: number): void {
    this.resizeZoneWidth = width;
  }
}
