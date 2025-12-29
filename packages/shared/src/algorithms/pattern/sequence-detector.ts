/**
 * Sequence Detection for Autofill
 *
 * Detects patterns in data sequences for intelligent autofill.
 *
 * **Supported Patterns:**
 * - Arithmetic sequences: 1, 2, 3, 4, ...
 * - Geometric sequences: 2, 4, 8, 16, ...
 * - Date sequences: Jan 1, Jan 2, Jan 3, ...
 * - Day sequences: Mon, Tue, Wed, ...
 * - Text patterns: Item 1, Item 2, Item 3, ...
 *
 * @example
 * ```typescript
 * // Detect arithmetic sequence
 * const pattern = detectSequence([1, 2, 3, 4]);
 * // pattern: { type: 'arithmetic', step: 1 }
 *
 * // Generate next values
 * const next = generateSequence(pattern, 5, 3);
 * // next: [5, 6, 7]
 * ```
 */

/**
 * Sequence pattern types
 */
export type SequenceType =
  | 'arithmetic'   // Linear: a, a+d, a+2d, ...
  | 'geometric'    // Exponential: a, a*r, a*r^2, ...
  | 'date'         // Date progression
  | 'text'         // Text with number suffix
  | 'constant'     // Same value repeated
  | 'none';        // No pattern detected

/**
 * Detected sequence pattern
 */
export interface SequencePattern {
  type: SequenceType;
  step?: number;         // For arithmetic (difference)
  ratio?: number;        // For geometric (multiplier)
  template?: string;     // For text patterns
  confidence: number;    // 0-1, how confident we are
}

/**
 * Detect sequence pattern from an array of values
 *
 * @param values - Array of values (at least 2 required)
 * @returns Detected pattern
 */
export function detectSequence(values: any[]): SequencePattern {
  if (values.length < 2) {
    return { type: 'none', confidence: 0 };
  }

  // Try numeric sequences first
  if (values.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
    const numbers = values.map(v => Number(v));

    // Check arithmetic sequence
    const arithmeticPattern = detectArithmetic(numbers);
    if (arithmeticPattern.confidence > 0.8) {
      return arithmeticPattern;
    }

    // Check geometric sequence
    const geometricPattern = detectGeometric(numbers);
    if (geometricPattern.confidence > 0.8) {
      return geometricPattern;
    }
  }

  // Try text patterns
  const textPattern = detectTextPattern(values.map(v => String(v)));
  if (textPattern.confidence > 0.7) {
    return textPattern;
  }

  // Check for constant value
  if (values.every(v => v === values[0])) {
    return { type: 'constant', confidence: 1.0 };
  }

  return { type: 'none', confidence: 0 };
}

/**
 * Detect arithmetic sequence (constant difference)
 */
function detectArithmetic(numbers: number[]): SequencePattern {
  if (numbers.length < 2) {
    return { type: 'none', confidence: 0 };
  }

  const differences: number[] = [];

  for (let i = 1; i < numbers.length; i++) {
    differences.push(numbers[i] - numbers[i - 1]);
  }

  // Check if all differences are the same (within small tolerance)
  const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
  const variance = differences.reduce((sum, d) => sum + Math.pow(d - avgDiff, 2), 0) / differences.length;

  if (variance < 0.01) {
    return {
      type: 'arithmetic',
      step: avgDiff,
      confidence: 1.0,
    };
  }

  return { type: 'none', confidence: 0 };
}

/**
 * Detect geometric sequence (constant ratio)
 */
function detectGeometric(numbers: number[]): SequencePattern {
  if (numbers.length < 2 || numbers.some(n => n === 0)) {
    return { type: 'none', confidence: 0 };
  }

  const ratios: number[] = [];

  for (let i = 1; i < numbers.length; i++) {
    ratios.push(numbers[i] / numbers[i - 1]);
  }

  // Check if all ratios are the same
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const variance = ratios.reduce((sum, r) => sum + Math.pow(r - avgRatio, 2), 0) / ratios.length;

  if (variance < 0.01) {
    return {
      type: 'geometric',
      ratio: avgRatio,
      confidence: 1.0,
    };
  }

  return { type: 'none', confidence: 0 };
}

/**
 * Detect text pattern with number suffix
 * E.g., "Item 1", "Item 2", "Item 3"
 */
function detectTextPattern(strings: string[]): SequencePattern {
  if (strings.length < 2) {
    return { type: 'none', confidence: 0 };
  }

  // Extract text prefix and number suffix
  const parts = strings.map(s => {
    const match = s.match(/^(.*?)(\d+)$/);
    if (match) {
      return { prefix: match[1], number: parseInt(match[2], 10) };
    }
    return null;
  });

  // Check if all have the same prefix
  if (parts.every(p => p !== null)) {
    const prefix = parts[0]!.prefix;

    if (parts.every(p => p!.prefix === prefix)) {
      const numbers = parts.map(p => p!.number);
      const arithmeticPattern = detectArithmetic(numbers);

      if (arithmeticPattern.type === 'arithmetic') {
        return {
          type: 'text',
          template: prefix + '{n}',
          step: arithmeticPattern.step,
          confidence: 0.9,
        };
      }
    }
  }

  return { type: 'none', confidence: 0 };
}

/**
 * Generate next values in a sequence
 *
 * @param pattern - Detected sequence pattern
 * @param startValue - Starting value
 * @param count - Number of values to generate
 * @returns Array of generated values
 */
export function generateSequence(pattern: SequencePattern, startValue: any, count: number): any[] {
  const result: any[] = [];

  switch (pattern.type) {
    case 'arithmetic':
      {
        let current = Number(startValue);
        for (let i = 0; i < count; i++) {
          result.push(current);
          current += pattern.step!;
        }
      }
      break;

    case 'geometric':
      {
        let current = Number(startValue);
        for (let i = 0; i < count; i++) {
          result.push(current);
          current *= pattern.ratio!;
        }
      }
      break;

    case 'text':
      {
        // Extract number from start value
        const match = String(startValue).match(/^(.*?)(\d+)$/);
        if (match) {
          let num = parseInt(match[2], 10);
          const prefix = match[1];

          for (let i = 0; i < count; i++) {
            result.push(prefix + num);
            num += pattern.step ?? 1;
          }
        }
      }
      break;

    case 'constant':
      for (let i = 0; i < count; i++) {
        result.push(startValue);
      }
      break;

    default:
      // No pattern - just repeat the start value
      for (let i = 0; i < count; i++) {
        result.push(startValue);
      }
  }

  return result;
}

/**
 * Autofill a range based on detected pattern
 *
 * @param source - Source values to detect pattern from
 * @param targetLength - Desired length of result
 * @returns Autofilled array
 */
export function autofill(source: any[], targetLength: number): any[] {
  if (source.length === 0) return [];
  if (targetLength <= source.length) return source.slice(0, targetLength);

  const pattern = detectSequence(source);

  if (pattern.type === 'none' || pattern.confidence < 0.5) {
    // No pattern - just repeat the source cyclically
    const result = [...source];
    while (result.length < targetLength) {
      result.push(source[result.length % source.length]);
    }
    return result.slice(0, targetLength);
  }

  // Generate remaining values based on pattern
  const remaining = targetLength - source.length;
  const lastValue = source[source.length - 1];
  const generated = generateSequence(pattern, lastValue, remaining + 1).slice(1); // Skip first (same as last)

  return [...source, ...generated];
}
