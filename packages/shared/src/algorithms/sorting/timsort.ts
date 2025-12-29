import type { Comparator } from '../../types/common';
import type { TimsortOptions } from './sorting.interface';

/**
 * Minimum gallop threshold
 * How many times one run must "win" before we switch to galloping mode
 *
 * JavaScript Note: Set higher than Python's default (7) due to function call overhead.
 * Galloping mode has more overhead in JS, so we require more consecutive wins
 * to justify entering gallop mode.
 */
const MIN_GALLOP = 32;

/**
 * Minimum merge threshold for stack invariants
 */
const MIN_MERGE = 32;

/**
 * Run represents a sorted sequence in the array
 */
interface Run {
  start: number;
  length: number;
}

/**
 * Timsort - Production-grade stable O(n log n) sorting algorithm
 *
 * This is a full implementation of Timsort with all optimizations:
 * - Natural run detection (finds already-sorted sequences)
 * - Galloping mode (binary search optimization during merges)
 * - Stack-based merge strategy (maintains merge invariants)
 * - Reusable temporary buffer (reduces allocations)
 *
 * Used by Python, Java, and V8's Array.sort().
 *
 * @param array - Array to sort (modified in-place)
 * @param comparator - Comparison function
 * @param options - Timsort options
 * @returns The sorted array
 *
 * @complexity
 * - Time: O(n log n) worst case, O(n) best case (already sorted)
 * - Space: O(n) for temporary merge buffer
 */
export function timsort<T>(
  array: T[],
  comparator: Comparator<T>,
  options: TimsortOptions = {}
): T[] {
  const n = array.length;

  if (n < 2) {
    return array;
  }

  const sorter = new TimsortImpl(array, comparator, options);
  sorter.sort();
  return array;
}

/**
 * Sort indices based on values without modifying the values
 *
 * @param indices - Array of indices to sort
 * @param getValue - Function to get value at an index
 * @param comparator - Comparison function for values
 * @param options - Timsort options
 * @returns Sorted array of indices
 *
 * @example
 * ```typescript
 * const values = ['Charlie', 'Alice', 'Bob'];
 * const indices = [0, 1, 2];
 *
 * const sorted = timsortIndices(
 *   indices,
 *   (i) => values[i],
 *   (a, b) => a.localeCompare(b)
 * );
 * // sorted = [1, 2, 0] (Alice, Bob, Charlie)
 * ```
 */
export function timsortIndices<T>(
  indices: number[],
  getValue: (index: number) => T,
  comparator: Comparator<T>,
  options: TimsortOptions = {}
): number[] {
  // Create index comparator
  const indexComparator: Comparator<number> = (idxA, idxB) => {
    return comparator(getValue(idxA), getValue(idxB));
  };

  return timsort(indices, indexComparator, options);
}

/**
 * Check if an array is sorted
 *
 * @param array - Array to check
 * @param comparator - Comparison function
 * @returns True if sorted
 */
export function isSorted<T>(
  array: readonly T[],
  comparator: Comparator<T>
): boolean {
  for (let i = 1; i < array.length; i++) {
    if (comparator(array[i - 1], array[i]) > 0) {
      return false;
    }
  }
  return true;
}

/**
 * TimsortImpl - Internal implementation class
 * Maintains state for the sorting process
 */
class TimsortImpl<T> {
  private array: T[];
  private comparator: Comparator<T>;
  private minGallop: number;
  private runStack: Run[];
  private tmp: T[];
  private readonly configuredMinRun?: number;

  constructor(array: T[], comparator: Comparator<T>, options: TimsortOptions) {
    this.array = array;
    this.comparator = comparator;
    this.minGallop = MIN_GALLOP;
    this.configuredMinRun = options.minRun;
    this.runStack = [];

    // Pre-allocate temporary buffer (reused across all merges)
    const tmpSize = Math.floor(array.length / 2);
    this.tmp = new Array(tmpSize);
  }

  /**
   * Main sort entry point
   */
  sort(): void {
    const n = this.array.length;

    // Calculate optimal minRun (use configured value if provided)
    const minRun = this.configuredMinRun ?? this.computeMinRun(n);

    let lo = 0;

    // Identify and sort runs
    while (lo < n) {
      // Find next run (either ascending or descending)
      let runLen = this.countRunAndMakeAscending(lo);

      // If run is too short, extend it with insertion sort
      if (runLen < minRun) {
        const force = Math.min(n - lo, minRun);
        this.binaryInsertionSort(lo, lo + force, lo + runLen);
        runLen = force;
      }

      // Push run onto stack and maybe merge
      this.pushRun(lo, runLen);
      this.mergeCollapse();

      lo += runLen;
    }

    // Force merge all remaining runs
    this.mergeForceCollapse();
  }

  /**
   * Count length of run starting at lo and reverse if descending
   * Returns length of run (at least 2 if array has 2+ elements)
   */
  private countRunAndMakeAscending(lo: number): number {
    const n = this.array.length;

    if (lo + 1 >= n) {
      return 1;
    }

    let runHi = lo + 1;

    // Check if descending
    if (this.comparator(this.array[runHi], this.array[lo]) < 0) {
      // Descending run - find end and reverse
      runHi++;
      while (runHi < n && this.comparator(this.array[runHi], this.array[runHi - 1]) < 0) {
        runHi++;
      }
      this.reverseRange(lo, runHi);
    } else {
      // Ascending run - find end
      while (runHi < n && this.comparator(this.array[runHi], this.array[runHi - 1]) >= 0) {
        runHi++;
      }
    }

    return runHi - lo;
  }

  /**
   * Reverse array[lo:hi]
   */
  private reverseRange(lo: number, hi: number): void {
    hi--;
    while (lo < hi) {
      const temp = this.array[lo];
      this.array[lo++] = this.array[hi];
      this.array[hi--] = temp;
    }
  }

  /**
   * Binary insertion sort - more efficient than regular insertion sort
   * Sorts array[lo:hi] where array[lo:start] is already sorted
   */
  private binaryInsertionSort(lo: number, hi: number, start: number): void {
    if (start === lo) {
      start++;
    }

    for (; start < hi; start++) {
      const pivot = this.array[start];

      // Binary search to find insertion point
      let left = lo;
      let right = start;

      while (left < right) {
        const mid = (left + right) >>> 1;
        if (this.comparator(pivot, this.array[mid]) < 0) {
          right = mid;
        } else {
          left = mid + 1;
        }
      }

      // Shift elements and insert
      const n = start - left;
      if (n > 0) {
        for (let i = start; i > left; i--) {
          this.array[i] = this.array[i - 1];
        }
        this.array[left] = pivot;
      }
    }
  }

  /**
   * Push a run onto the pending-run stack
   */
  private pushRun(runBase: number, runLen: number): void {
    this.runStack.push({ start: runBase, length: runLen });
  }

  /**
   * Merge runs to maintain stack invariants
   *
   * Invariants (from Python's timsort):
   * 1. runLen[i - 2] > runLen[i - 1] + runLen[i]
   * 2. runLen[i - 1] > runLen[i]
   */
  private mergeCollapse(): void {
    while (this.runStack.length > 1) {
      let n = this.runStack.length - 2;

      if (
        (n > 0 && this.runStack[n - 1].length <= this.runStack[n].length + this.runStack[n + 1].length) ||
        (n > 1 && this.runStack[n - 2].length <= this.runStack[n - 1].length + this.runStack[n].length)
      ) {
        // Merge the smaller of the two pairs
        if (this.runStack[n - 1].length < this.runStack[n + 1].length) {
          n--;
        }
        this.mergeAt(n);
      } else if (this.runStack[n].length <= this.runStack[n + 1].length) {
        this.mergeAt(n);
      } else {
        break; // Invariants are satisfied
      }
    }
  }

  /**
   * Force merge all runs on the stack
   */
  private mergeForceCollapse(): void {
    while (this.runStack.length > 1) {
      let n = this.runStack.length - 2;

      if (n > 0 && this.runStack[n - 1].length < this.runStack[n + 1].length) {
        n--;
      }

      this.mergeAt(n);
    }
  }

  /**
   * Merge the two runs at stack indices i and i+1
   */
  private mergeAt(i: number): void {
    const run1 = this.runStack[i];
    const run2 = this.runStack[i + 1];

    // Merge run1 with run2
    this.mergeRuns(run1.start, run1.length, run2.start, run2.length);

    // Update stack
    this.runStack[i] = { start: run1.start, length: run1.length + run2.length };
    this.runStack.splice(i + 1, 1);
  }

  /**
   * Merge two adjacent runs with galloping optimization
   */
  private mergeRuns(base1: number, len1: number, base2: number, len2: number): void {
    // Optimization: Find where first element of run2 goes in run1
    // Elements before that can be ignored
    const k = this.gallopRight(this.array[base2], base1, len1, 0);
    base1 += k;
    len1 -= k;

    if (len1 === 0) {
      return;
    }

    // Optimization: Find where last element of run1 goes in run2
    // Elements after that can be ignored
    len2 = this.gallopLeft(this.array[base1 + len1 - 1], base2, len2, len2 - 1);

    if (len2 === 0) {
      return;
    }

    // Merge remaining runs, using tmp array for smaller run
    if (len1 <= len2) {
      this.mergeLo(base1, len1, base2, len2);
    } else {
      this.mergeHi(base1, len1, base2, len2);
    }
  }

  /**
   * Merge with run1 in temporary array (run1 is smaller)
   */
  private mergeLo(base1: number, len1: number, base2: number, len2: number): void {
    // Copy run1 to tmp
    for (let i = 0; i < len1; i++) {
      this.tmp[i] = this.array[base1 + i];
    }

    let cursor1 = 0;           // Index in tmp
    let cursor2 = base2;       // Index in array
    let dest = base1;          // Index in array

    // Move first element of run2
    this.array[dest++] = this.array[cursor2++];
    len2--;

    if (len2 === 0) {
      // Run2 exhausted, copy remaining tmp
      for (let i = 0; i < len1; i++) {
        this.array[dest + i] = this.tmp[cursor1 + i];
      }
      return;
    }

    if (len1 === 1) {
      // Run1 has single element, copy run2 then the element
      for (let i = 0; i < len2; i++) {
        this.array[dest + i] = this.array[cursor2 + i];
      }
      this.array[dest + len2] = this.tmp[cursor1];
      return;
    }

    let minGallop = this.minGallop;

    outer: while (true) {
      let count1 = 0; // Number of times run1 won in a row
      let count2 = 0; // Number of times run2 won in a row

      // Simple merge until one run starts "winning" consistently
      do {
        if (this.comparator(this.array[cursor2], this.tmp[cursor1]) < 0) {
          this.array[dest++] = this.array[cursor2++];
          count2++;
          count1 = 0;
          len2--;
          if (len2 === 0) break outer;
        } else {
          this.array[dest++] = this.tmp[cursor1++];
          count1++;
          count2 = 0;
          len1--;
          if (len1 === 1) break outer;
        }
      } while ((count1 | count2) < minGallop);

      // One run is winning consistently - switch to galloping mode
      do {
        count1 = this.gallopRightInTmp(this.array[cursor2], cursor1, len1, 0);
        if (count1 !== 0) {
          for (let i = 0; i < count1; i++) {
            this.array[dest++] = this.tmp[cursor1++];
          }
          len1 -= count1;
          if (len1 <= 1) break outer;
        }
        this.array[dest++] = this.array[cursor2++];
        len2--;
        if (len2 === 0) break outer;

        count2 = this.gallopLeft(this.tmp[cursor1], cursor2, len2, 0);
        if (count2 !== 0) {
          for (let i = 0; i < count2; i++) {
            this.array[dest++] = this.array[cursor2++];
          }
          len2 -= count2;
          if (len2 === 0) break outer;
        }
        this.array[dest++] = this.tmp[cursor1++];
        len1--;
        if (len1 === 1) break outer;

        minGallop--;
      } while (count1 >= MIN_GALLOP || count2 >= MIN_GALLOP);

      if (minGallop < 0) minGallop = 0;
      minGallop += 2; // Penalize leaving gallop mode
    }

    this.minGallop = minGallop < 1 ? 1 : minGallop;

    // Handle remaining elements
    if (len1 === 1) {
      for (let i = 0; i < len2; i++) {
        this.array[dest + i] = this.array[cursor2 + i];
      }
      this.array[dest + len2] = this.tmp[cursor1];
    } else if (len1 > 0) {
      for (let i = 0; i < len1; i++) {
        this.array[dest + i] = this.tmp[cursor1 + i];
      }
    }
  }

  /**
   * Merge with run2 in temporary array (run2 is smaller)
   */
  private mergeHi(base1: number, len1: number, base2: number, len2: number): void {
    // Copy run2 to tmp
    for (let i = 0; i < len2; i++) {
      this.tmp[i] = this.array[base2 + i];
    }

    let cursor1 = base1 + len1 - 1;  // Index in array (run1, from end)
    let cursor2 = len2 - 1;          // Index in tmp (from end)
    let dest = base2 + len2 - 1;     // Index in array (from end)

    // Move last element of run1
    this.array[dest--] = this.array[cursor1--];
    len1--;

    if (len1 === 0) {
      // Run1 exhausted, copy remaining tmp
      for (let i = 0; i < len2; i++) {
        this.array[dest - len2 + 1 + i] = this.tmp[i];
      }
      return;
    }

    if (len2 === 1) {
      // Run2 has single element
      dest -= len1;
      cursor1 -= len1;
      for (let i = len1 - 1; i >= 0; i--) {
        this.array[dest + 1 + i] = this.array[cursor1 + 1 + i];
      }
      this.array[dest] = this.tmp[cursor2];
      return;
    }

    let minGallop = this.minGallop;

    outer: while (true) {
      let count1 = 0;
      let count2 = 0;

      do {
        if (this.comparator(this.tmp[cursor2], this.array[cursor1]) < 0) {
          this.array[dest--] = this.array[cursor1--];
          count1++;
          count2 = 0;
          len1--;
          if (len1 === 0) break outer;
        } else {
          this.array[dest--] = this.tmp[cursor2--];
          count2++;
          count1 = 0;
          len2--;
          if (len2 === 1) break outer;
        }
      } while ((count1 | count2) < minGallop);

      do {
        count1 = len1 - this.gallopRight(this.tmp[cursor2], base1, len1, cursor1 - base1);
        if (count1 !== 0) {
          dest -= count1;
          cursor1 -= count1;
          len1 -= count1;
          for (let i = count1 - 1; i >= 0; i--) {
            this.array[dest + 1 + i] = this.array[cursor1 + 1 + i];
          }
          if (len1 === 0) break outer;
        }
        this.array[dest--] = this.tmp[cursor2--];
        len2--;
        if (len2 === 1) break outer;

        count2 = len2 - this.gallopLeftInTmp(this.array[cursor1], 0, len2, cursor2);
        if (count2 !== 0) {
          dest -= count2;
          cursor2 -= count2;
          len2 -= count2;
          for (let i = 0; i < count2; i++) {
            this.array[dest + 1 + i] = this.tmp[cursor2 + 1 + i];
          }
          if (len2 <= 1) break outer;
        }
        this.array[dest--] = this.array[cursor1--];
        len1--;
        if (len1 === 0) break outer;

        minGallop--;
      } while (count1 >= MIN_GALLOP || count2 >= MIN_GALLOP);

      if (minGallop < 0) minGallop = 0;
      minGallop += 2;
    }

    this.minGallop = minGallop < 1 ? 1 : minGallop;

    if (len2 === 1) {
      dest -= len1;
      cursor1 -= len1;
      for (let i = len1 - 1; i >= 0; i--) {
        this.array[dest + 1 + i] = this.array[cursor1 + 1 + i];
      }
      this.array[dest] = this.tmp[cursor2];
    } else if (len2 > 0) {
      for (let i = 0; i < len2; i++) {
        this.array[dest - len2 + 1 + i] = this.tmp[i];
      }
    }
  }

  /**
   * Gallop right: Find position where key belongs in array[base:base+len]
   * Returns offset k where array[base+k-1] < key <= array[base+k]
   * Uses exponential search followed by binary search
   */
  private gallopRight(key: T, base: number, len: number, hint: number): number {
    let lastOfs = 0;
    let ofs = 1;

    if (this.comparator(key, this.array[base + hint]) < 0) {
      // Gallop left until array[base+hint-ofs] < key <= array[base+hint-lastOfs]
      const maxOfs = hint + 1;
      while (ofs < maxOfs && this.comparator(key, this.array[base + hint - ofs]) < 0) {
        lastOfs = ofs;
        ofs = (ofs << 1) + 1;
        if (ofs <= 0) ofs = maxOfs; // Overflow
      }
      if (ofs > maxOfs) ofs = maxOfs;

      // Make offsets relative to base
      const tmp = lastOfs;
      lastOfs = hint - ofs;
      ofs = hint - tmp;
    } else {
      // Gallop right until array[base+hint+lastOfs] < key <= array[base+hint+ofs]
      const maxOfs = len - hint;
      while (ofs < maxOfs && this.comparator(key, this.array[base + hint + ofs]) >= 0) {
        lastOfs = ofs;
        ofs = (ofs << 1) + 1;
        if (ofs <= 0) ofs = maxOfs;
      }
      if (ofs > maxOfs) ofs = maxOfs;

      // Make offsets relative to base
      lastOfs += hint;
      ofs += hint;
    }

    // Binary search in array[base+lastOfs:base+ofs]
    lastOfs++;
    while (lastOfs < ofs) {
      const m = lastOfs + ((ofs - lastOfs) >>> 1);
      if (this.comparator(key, this.array[base + m]) < 0) {
        ofs = m;
      } else {
        lastOfs = m + 1;
      }
    }

    return ofs;
  }

  /**
   * Gallop left: Like gallopRight, but finds position where key < array[base+k]
   */
  private gallopLeft(key: T, base: number, len: number, hint: number): number {
    let lastOfs = 0;
    let ofs = 1;

    if (this.comparator(key, this.array[base + hint]) > 0) {
      const maxOfs = len - hint;
      while (ofs < maxOfs && this.comparator(key, this.array[base + hint + ofs]) > 0) {
        lastOfs = ofs;
        ofs = (ofs << 1) + 1;
        if (ofs <= 0) ofs = maxOfs;
      }
      if (ofs > maxOfs) ofs = maxOfs;

      lastOfs += hint;
      ofs += hint;
    } else {
      const maxOfs = hint + 1;
      while (ofs < maxOfs && this.comparator(key, this.array[base + hint - ofs]) <= 0) {
        lastOfs = ofs;
        ofs = (ofs << 1) + 1;
        if (ofs <= 0) ofs = maxOfs;
      }
      if (ofs > maxOfs) ofs = maxOfs;

      const tmp = lastOfs;
      lastOfs = hint - ofs;
      ofs = hint - tmp;
    }

    lastOfs++;
    while (lastOfs < ofs) {
      const m = lastOfs + ((ofs - lastOfs) >>> 1);
      if (this.comparator(key, this.array[base + m]) > 0) {
        lastOfs = m + 1;
      } else {
        ofs = m;
      }
    }

    return ofs;
  }

  /**
   * Gallop right in tmp array: Find position where key belongs in tmp[base:base+len]
   */
  private gallopRightInTmp(key: T, base: number, len: number, hint: number): number {
    let lastOfs = 0;
    let ofs = 1;

    if (this.comparator(key, this.tmp[base + hint]) < 0) {
      const maxOfs = hint + 1;
      while (ofs < maxOfs && this.comparator(key, this.tmp[base + hint - ofs]) < 0) {
        lastOfs = ofs;
        ofs = (ofs << 1) + 1;
        if (ofs <= 0) ofs = maxOfs;
      }
      if (ofs > maxOfs) ofs = maxOfs;

      const tmp = lastOfs;
      lastOfs = hint - ofs;
      ofs = hint - tmp;
    } else {
      const maxOfs = len - hint;
      while (ofs < maxOfs && this.comparator(key, this.tmp[base + hint + ofs]) >= 0) {
        lastOfs = ofs;
        ofs = (ofs << 1) + 1;
        if (ofs <= 0) ofs = maxOfs;
      }
      if (ofs > maxOfs) ofs = maxOfs;

      lastOfs += hint;
      ofs += hint;
    }

    lastOfs++;
    while (lastOfs < ofs) {
      const m = lastOfs + ((ofs - lastOfs) >>> 1);
      if (this.comparator(key, this.tmp[base + m]) < 0) {
        ofs = m;
      } else {
        lastOfs = m + 1;
      }
    }

    return ofs;
  }

  /**
   * Gallop left in tmp array
   */
  private gallopLeftInTmp(key: T, base: number, len: number, hint: number): number {
    let lastOfs = 0;
    let ofs = 1;

    if (this.comparator(key, this.tmp[base + hint]) > 0) {
      const maxOfs = len - hint;
      while (ofs < maxOfs && this.comparator(key, this.tmp[base + hint + ofs]) > 0) {
        lastOfs = ofs;
        ofs = (ofs << 1) + 1;
        if (ofs <= 0) ofs = maxOfs;
      }
      if (ofs > maxOfs) ofs = maxOfs;

      lastOfs += hint;
      ofs += hint;
    } else {
      const maxOfs = hint + 1;
      while (ofs < maxOfs && this.comparator(key, this.tmp[base + hint - ofs]) <= 0) {
        lastOfs = ofs;
        ofs = (ofs << 1) + 1;
        if (ofs <= 0) ofs = maxOfs;
      }
      if (ofs > maxOfs) ofs = maxOfs;

      const tmp = lastOfs;
      lastOfs = hint - ofs;
      ofs = hint - tmp;
    }

    lastOfs++;
    while (lastOfs < ofs) {
      const m = lastOfs + ((ofs - lastOfs) >>> 1);
      if (this.comparator(key, this.tmp[base + m]) > 0) {
        lastOfs = m + 1;
      } else {
        ofs = m;
      }
    }

    return ofs;
  }

  /**
   * Compute optimal minRun value
   * Returns a value in range [32, 64] such that n/minRun is close to a power of 2
   */
  private computeMinRun(n: number): number {
    let r = 0;

    while (n >= MIN_MERGE) {
      r |= n & 1;
      n >>= 1;
    }

    return n + r;
  }
}
