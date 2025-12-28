import { binarySearch, binarySearchLeft, binarySearchRight } from './binary-search';

describe('binarySearch', () => {
  describe('Basic Search', () => {
    it('should find element in sorted array', () => {
      const array = [1, 3, 5, 7, 9, 11];
      const result = binarySearch(array, 5);

      expect(result.found).toBe(true);
      expect(result.index).toBe(2);
    });

    it('should return not found for missing element', () => {
      const array = [1, 3, 5, 7, 9];
      const result = binarySearch(array, 4);

      expect(result.found).toBe(false);
      expect(result.index).toBe(-1);
    });

    it('should find first element', () => {
      const array = [1, 2, 3, 4, 5];
      const result = binarySearch(array, 1);

      expect(result.found).toBe(true);
      expect(result.index).toBe(0);
    });

    it('should find last element', () => {
      const array = [1, 2, 3, 4, 5];
      const result = binarySearch(array, 5);

      expect(result.found).toBe(true);
      expect(result.index).toBe(4);
    });

    it('should handle single element array', () => {
      const result1 = binarySearch([5], 5);
      expect(result1).toEqual({ found: true, index: 0 });

      const result2 = binarySearch([5], 3);
      expect(result2).toEqual({ found: false, index: -1 });
    });

    it('should handle empty array', () => {
      const result = binarySearch([], 5);
      expect(result).toEqual({ found: false, index: -1 });
    });
  });

  describe('Insertion Point', () => {
    it('should return insertion point when not found', () => {
      const array = [1, 3, 5, 7, 9];

      // Should insert at index 0 (before 1)
      const result1 = binarySearch(array, 0, { returnInsertionPoint: true });
      expect(result1).toEqual({ found: false, index: 0 });

      // Should insert at index 2 (between 3 and 5)
      const result2 = binarySearch(array, 4, { returnInsertionPoint: true });
      expect(result2).toEqual({ found: false, index: 2 });

      // Should insert at index 5 (after 9)
      const result3 = binarySearch(array, 10, { returnInsertionPoint: true });
      expect(result3).toEqual({ found: false, index: 5 });
    });

    it('should still find existing elements with returnInsertionPoint', () => {
      const array = [1, 3, 5, 7, 9];
      const result = binarySearch(array, 5, { returnInsertionPoint: true });

      expect(result).toEqual({ found: true, index: 2 });
    });
  });

  describe('Custom Comparator', () => {
    it('should work with string comparator', () => {
      const array = ['apple', 'banana', 'cherry', 'date'];
      const stringComparator = (a: string, b: string) => a.localeCompare(b);

      const result = binarySearch(array, 'cherry', {
        comparator: stringComparator,
      });

      expect(result).toEqual({ found: true, index: 2 });
    });

    it('should work with object comparator', () => {
      interface Person {
        name: string;
        age: number;
      }

      const people: Person[] = [
        { name: 'Alice', age: 20 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 30 },
      ];

      const ageComparator = (a: Person, b: Person) => a.age - b.age;
      const result = binarySearch(people, { name: 'Unknown', age: 25 }, {
        comparator: ageComparator,
      });

      expect(result.found).toBe(true);
      expect(result.index).toBe(1);
    });

    it('should work with reverse sorted array', () => {
      const array = [9, 7, 5, 3, 1];
      const reverseComparator = (a: number, b: number) => b - a;

      const result = binarySearch(array, 5, {
        comparator: reverseComparator,
      });

      expect(result).toEqual({ found: true, index: 2 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle array with duplicates', () => {
      const array = [1, 2, 2, 2, 3, 4];
      const result = binarySearch(array, 2);

      expect(result.found).toBe(true);
      // May find any of the duplicate occurrences
      expect([1, 2, 3]).toContain(result.index);
    });

    it('should handle large arrays efficiently', () => {
      const array = Array.from({ length: 1000000 }, (_, i) => i * 2);
      const result = binarySearch(array, 100000);

      expect(result.found).toBe(true);
      expect(result.index).toBe(50000);
    });

    it('should handle negative numbers', () => {
      const array = [-10, -5, 0, 5, 10];
      const result = binarySearch(array, -5);

      expect(result).toEqual({ found: true, index: 1 });
    });

    it('should handle floating point numbers', () => {
      const array = [0.1, 0.2, 0.3, 0.4, 0.5];
      const result = binarySearch(array, 0.3);

      expect(result.found).toBe(true);
      expect(result.index).toBe(2);
    });
  });
});

describe('binarySearchLeft', () => {
  it('should find leftmost occurrence', () => {
    const array = [1, 2, 2, 2, 3, 4];
    const index = binarySearchLeft(array, 2);

    expect(index).toBe(1); // First occurrence of 2
  });

  it('should return -1 when not found', () => {
    const array = [1, 2, 3, 4];
    const index = binarySearchLeft(array, 5);

    expect(index).toBe(-1);
  });

  it('should work with unique elements', () => {
    const array = [1, 2, 3, 4, 5];
    const index = binarySearchLeft(array, 3);

    expect(index).toBe(2);
  });

  it('should work when all elements are the same', () => {
    const array = [5, 5, 5, 5, 5];
    const index = binarySearchLeft(array, 5);

    expect(index).toBe(0); // Leftmost
  });
});

describe('binarySearchRight', () => {
  it('should find rightmost occurrence', () => {
    const array = [1, 2, 2, 2, 3, 4];
    const index = binarySearchRight(array, 2);

    expect(index).toBe(3); // Last occurrence of 2
  });

  it('should return -1 when not found', () => {
    const array = [1, 2, 3, 4];
    const index = binarySearchRight(array, 5);

    expect(index).toBe(-1);
  });

  it('should work with unique elements', () => {
    const array = [1, 2, 3, 4, 5];
    const index = binarySearchRight(array, 3);

    expect(index).toBe(2);
  });

  it('should work when all elements are the same', () => {
    const array = [5, 5, 5, 5, 5];
    const index = binarySearchRight(array, 5);

    expect(index).toBe(4); // Rightmost
  });
});
