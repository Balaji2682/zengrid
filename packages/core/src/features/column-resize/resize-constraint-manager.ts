import type {
  ColumnConstraints,
  ResizeValidationResult,
} from './column-resize-manager.interface';

/**
 * Configuration for constraint manager
 */
export interface ConstraintManagerOptions {
  /** Global default constraints */
  defaultConstraints?: ColumnConstraints;
  /** Per-column constraints */
  columnConstraints?: Map<number, ColumnConstraints>;
  /** Custom validation function */
  onValidateResize?: (
    column: number,
    newWidth: number
  ) => ResizeValidationResult | Promise<ResizeValidationResult>;
}

/**
 * Manages column resize constraints and validation
 * Separated from main manager for single responsibility
 */
export class ResizeConstraintManager {
  private defaultConstraints: ColumnConstraints;
  private columnConstraints: Map<number, ColumnConstraints>;
  private onValidateResize?: (
    column: number,
    newWidth: number
  ) => ResizeValidationResult | Promise<ResizeValidationResult>;

  constructor(options: ConstraintManagerOptions = {}) {
    this.defaultConstraints = {
      minWidth: options.defaultConstraints?.minWidth ?? 30,
      maxWidth: options.defaultConstraints?.maxWidth ?? Infinity,
    };
    this.columnConstraints = options.columnConstraints ?? new Map();
    this.onValidateResize = options.onValidateResize;
  }

  /**
   * Get effective constraints for a column
   */
  getConstraints(column: number): ColumnConstraints {
    const columnSpecific = this.columnConstraints.get(column);
    return {
      minWidth: columnSpecific?.minWidth ?? this.defaultConstraints.minWidth,
      maxWidth: columnSpecific?.maxWidth ?? this.defaultConstraints.maxWidth,
    };
  }

  /**
   * Set constraints for a specific column
   */
  setConstraints(column: number, constraints: ColumnConstraints): void {
    this.columnConstraints.set(column, constraints);
  }

  /**
   * Apply min/max constraints to a width value
   */
  applyConstraints(column: number, width: number): number {
    const constraints = this.getConstraints(column);
    let constrainedWidth = width;

    if (constraints.minWidth !== undefined) {
      constrainedWidth = Math.max(constrainedWidth, constraints.minWidth);
    }

    if (constraints.maxWidth !== undefined) {
      constrainedWidth = Math.min(constrainedWidth, constraints.maxWidth);
    }

    return constrainedWidth;
  }

  /**
   * Validate a resize operation
   * Returns validation result with optional reason/suggestion
   */
  async validate(column: number, newWidth: number): Promise<ResizeValidationResult> {
    // First check min/max constraints
    const constraints = this.getConstraints(column);
    const constrainedWidth = this.applyConstraints(column, newWidth);

    if (constrainedWidth !== newWidth) {
      const reason =
        newWidth < (constraints.minWidth ?? 0)
          ? `Width cannot be less than ${constraints.minWidth}px`
          : `Width cannot be greater than ${constraints.maxWidth}px`;

      return {
        valid: false,
        reason,
        suggestedWidth: constrainedWidth,
      };
    }

    // Custom validation if provided
    if (this.onValidateResize) {
      return await this.onValidateResize(column, newWidth);
    }

    return { valid: true };
  }

  /**
   * Check if a width is within constraints (synchronous check only)
   */
  isWithinConstraints(column: number, width: number): boolean {
    const constraints = this.getConstraints(column);
    if (constraints.minWidth !== undefined && width < constraints.minWidth) {
      return false;
    }
    if (constraints.maxWidth !== undefined && width > constraints.maxWidth) {
      return false;
    }
    return true;
  }

  /**
   * Get minimum width for a column
   */
  getMinWidth(column: number): number {
    return this.getConstraints(column).minWidth ?? 30;
  }

  /**
   * Get maximum width for a column
   */
  getMaxWidth(column: number): number {
    return this.getConstraints(column).maxWidth ?? Infinity;
  }
}
