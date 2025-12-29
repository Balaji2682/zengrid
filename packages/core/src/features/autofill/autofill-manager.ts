/**
 * Autofill Manager using Pattern Detection
 *
 * Provides Excel-like smart autofill functionality.
 */

import {
  detectSequence,
  autofill as autofilfillSequence,
  type SequencePattern,
} from '@zengrid/shared/algorithms/pattern';

/**
 * Autofill direction
 */
export type AutofillDirection = 'horizontal' | 'vertical';

/**
 * Autofill preview result
 */
export interface AutofillPreview {
  values: any[];
  pattern: string;
  confidence: number;
  patternType: string;
}

/**
 * AutofillManager - Smart autofill using pattern detection
 *
 * Detects patterns in source cells and intelligently fills target range.
 * Supports arithmetic sequences (1,2,3), geometric sequences (2,4,8),
 * text patterns ("Item 1", "Item 2"), and more.
 *
 * @example
 * ```typescript
 * const autofill = new AutofillManager();
 *
 * // User selects [1, 2, 3] and drags fill handle
 * const preview = autofill.previewFill([1, 2, 3], 10);
 * // {
 * //   values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
 * //   pattern: 'Linear sequence (+1)',
 * //   confidence: 1.0,
 * //   patternType: 'arithmetic'
 * // }
 *
 * // Apply autofill
 * const filled = autofill.fillRange([1, 2, 3], 10);
 * // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 * ```
 */
export class AutofillManager {
  /**
   * Fill a range based on source cells
   *
   * @param sourceValues - Source cell values
   * @param targetLength - Desired total length of result
   * @param direction - Fill direction (for future use)
   * @returns Filled array
   */
  fillRange(
    sourceValues: any[],
    targetLength: number,
    _direction: AutofillDirection = 'vertical'
  ): any[] {
    return autofilfillSequence(sourceValues, targetLength);
  }

  /**
   * Preview autofill before applying
   *
   * Shows what will be filled and the detected pattern.
   *
   * @param sourceValues - Source cell values
   * @param targetLength - Desired total length
   * @returns Preview with values, pattern description, and confidence
   */
  previewFill(sourceValues: any[], targetLength: number): AutofillPreview {
    const pattern = detectSequence(sourceValues);
    const values = autofilfillSequence(sourceValues, targetLength);

    return {
      values,
      pattern: this.patternToString(pattern),
      confidence: pattern.confidence,
      patternType: pattern.type,
    };
  }

  /**
   * Detect pattern in source values
   *
   * @param sourceValues - Source cell values
   * @returns Detected pattern
   */
  detectPattern(sourceValues: any[]): SequencePattern {
    return detectSequence(sourceValues);
  }

  /**
   * Check if source values have a detectable pattern
   *
   * @param sourceValues - Source cell values
   * @param minConfidence - Minimum confidence threshold (0-1)
   * @returns true if pattern detected with sufficient confidence
   */
  hasPattern(sourceValues: any[], minConfidence: number = 0.7): boolean {
    const pattern = detectSequence(sourceValues);
    return pattern.confidence >= minConfidence && pattern.type !== 'none';
  }

  /**
   * Get pattern description
   *
   * @param sourceValues - Source cell values
   * @returns Human-readable pattern description
   */
  getPatternDescription(sourceValues: any[]): string {
    const pattern = detectSequence(sourceValues);
    return this.patternToString(pattern);
  }

  /**
   * Fill with custom pattern
   *
   * Advanced: directly specify the pattern to use.
   *
   * @param sourceValues - Source cell values
   * @param targetLength - Desired total length
   * @param pattern - Custom pattern to apply
   * @returns Filled array
   */
  fillWithPattern(
    sourceValues: any[],
    targetLength: number,
    _pattern: SequencePattern
  ): any[] {
    if (sourceValues.length === 0) return [];
    if (targetLength <= sourceValues.length) {
      return sourceValues.slice(0, targetLength);
    }

    // For now, use the standard autofill
    // In the future, could use pattern-specific generation
    return autofilfillSequence(sourceValues, targetLength);
  }

  /**
   * Convert pattern to human-readable string
   */
  private patternToString(pattern: SequencePattern): string {
    switch (pattern.type) {
      case 'arithmetic':
        if (pattern.step === 1) {
          return 'Linear sequence (+1)';
        } else if (pattern.step === -1) {
          return 'Linear sequence (-1)';
        } else if (pattern.step !== undefined) {
          return `Linear sequence (${pattern.step > 0 ? '+' : ''}${pattern.step})`;
        } else {
          return 'Linear sequence';
        }

      case 'geometric':
        return `Geometric sequence (×${pattern.ratio})`;

      case 'text':
        return `Text pattern: ${pattern.template}`;

      case 'constant':
        return 'Repeat value';

      case 'none':
        return 'No pattern detected';

      default:
        return 'Unknown pattern';
    }
  }
}
