import {
  numericComparator,
  stringComparator,
  dateComparator,
  booleanComparator,
  autoComparator,
  reverseComparator,
  chainComparators,
} from './comparators';

describe('Comparators', () => {
  describe('numericComparator', () => {
    it('should sort numbers in ascending order', () => {
      const numbers = [3, 1, 4, 1, 5, 9, 2, 6];
      numbers.sort(numericComparator());
      expect(numbers).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
    });

    it('should handle negative numbers', () => {
      const numbers = [3, -1, 0, -5, 2];
      numbers.sort(numericComparator());
      expect(numbers).toEqual([-5, -1, 0, 2, 3]);
    });

    it('should place nulls last by default', () => {
      const numbers = [3, null, 1, undefined, 2];
      numbers.sort(numericComparator());
      expect(numbers).toEqual([1, 2, 3, null, undefined]);
    });

    it('should place nulls first when specified', () => {
      const numbers = [3, null, 1, 2];
      numbers.sort(numericComparator('first'));
      // Null should come before real values
      expect(numbers[0]).toBeNull();
      expect(numbers.slice(1)).toEqual([1, 2, 3]);
    });

    it('should handle NaN values', () => {
      const numbers = [3, NaN, 1, 2];
      numbers.sort(numericComparator('last'));
      expect(numbers.slice(0, 3)).toEqual([1, 2, 3]);
      expect(Number.isNaN(numbers[3])).toBe(true);
    });

    it('should handle string numbers', () => {
      const values = ['3', '1', '10', '2'];
      values.sort(numericComparator());
      expect(values).toEqual(['1', '2', '3', '10']);
    });
  });

  describe('stringComparator', () => {
    it('should sort strings in ascending order', () => {
      const strings = ['Charlie', 'Alice', 'Bob'];
      strings.sort(stringComparator());
      expect(strings).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should be case-sensitive by default', () => {
      const strings = ['banana', 'Apple', 'cherry'];
      strings.sort(stringComparator());
      expect(strings).toEqual(['Apple', 'banana', 'cherry']);
    });

    it('should support case-insensitive comparison', () => {
      const strings = ['banana', 'Apple', 'cherry'];
      strings.sort(stringComparator({ caseInsensitive: true }));
      expect(strings).toEqual(['Apple', 'banana', 'cherry']);
    });

    it('should use locale comparison when specified', () => {
      const strings = ['ä', 'z', 'a'];
      strings.sort(stringComparator({ localeCompare: true, locale: 'de-DE' }));
      // In German locale, ä comes after a
      expect(strings[0]).toBe('a');
    });

    it('should place nulls last by default', () => {
      const strings = ['Bob', null, 'Alice', undefined];
      strings.sort(stringComparator());
      expect(strings).toEqual(['Alice', 'Bob', null, undefined]);
    });

    it('should convert non-strings to strings', () => {
      const values = [3, 1, 10, 2];
      values.sort(stringComparator());
      // String comparison: '1' < '10' < '2' < '3'
      expect(values).toEqual([1, 10, 2, 3]);
    });
  });

  describe('dateComparator', () => {
    it('should sort dates in ascending order', () => {
      const dates = [
        new Date('2023-03-15'),
        new Date('2023-01-01'),
        new Date('2023-12-31'),
      ];
      dates.sort(dateComparator());
      expect(dates[0].toISOString()).toContain('2023-01-01');
      expect(dates[1].toISOString()).toContain('2023-03-15');
      expect(dates[2].toISOString()).toContain('2023-12-31');
    });

    it('should handle date strings', () => {
      const dates = ['2023-03-15', '2023-01-01', '2023-12-31'];
      dates.sort(dateComparator());
      expect(dates).toEqual(['2023-01-01', '2023-03-15', '2023-12-31']);
    });

    it('should place nulls last by default', () => {
      const dates = [new Date('2023-01-01'), null, new Date('2023-12-31')];
      dates.sort(dateComparator());
      expect(dates[2]).toBeNull();
    });

    it('should handle invalid dates', () => {
      const dates = [new Date('2023-01-01'), new Date('invalid'), new Date('2023-12-31')];
      dates.sort(dateComparator('last'));
      expect(dates[0].toISOString()).toContain('2023-01-01');
      expect(dates[1].toISOString()).toContain('2023-12-31');
      expect(Number.isNaN(dates[2].getTime())).toBe(true);
    });
  });

  describe('booleanComparator', () => {
    it('should sort booleans (false < true)', () => {
      const values = [true, false, true, false];
      values.sort(booleanComparator());
      expect(values).toEqual([false, false, true, true]);
    });

    it('should place nulls last by default', () => {
      const values = [true, null, false, undefined];
      values.sort(booleanComparator());
      expect(values).toEqual([false, true, null, undefined]);
    });

    it('should handle truthy/falsy values', () => {
      const values = [1, 0, true, false, 'hello', ''];
      values.sort(booleanComparator());
      // Falsy: 0, false, ''
      // Truthy: 1, true, 'hello'
      expect(Boolean(values[0])).toBe(false);
      expect(Boolean(values[1])).toBe(false);
      expect(Boolean(values[2])).toBe(false);
      expect(Boolean(values[3])).toBe(true);
      expect(Boolean(values[4])).toBe(true);
      expect(Boolean(values[5])).toBe(true);
    });
  });

  describe('autoComparator', () => {
    it('should detect numeric type', () => {
      const values = [3, 1, 4, 1, 5];
      values.sort(autoComparator(values));
      expect(values).toEqual([1, 1, 3, 4, 5]);
    });

    it('should detect string type', () => {
      const values = ['Charlie', 'Alice', 'Bob'];
      values.sort(autoComparator(values));
      expect(values).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should detect date type', () => {
      const values = [
        new Date('2023-03-15'),
        new Date('2023-01-01'),
        new Date('2023-12-31'),
      ];
      values.sort(autoComparator(values));
      expect(values[0].toISOString()).toContain('2023-01-01');
    });

    it('should detect boolean type', () => {
      const values = [true, false, true];
      values.sort(autoComparator(values));
      expect(values).toEqual([false, true, true]);
    });

    it('should handle arrays with nulls', () => {
      const values = [null, 3, null, 1, null, 2];
      values.sort(autoComparator(values));
      expect(values).toEqual([1, 2, 3, null, null, null]);
    });

    it('should default to numeric for all-null array', () => {
      const values = [null, null, null];
      values.sort(autoComparator(values));
      expect(values).toEqual([null, null, null]);
    });
  });

  describe('reverseComparator', () => {
    it('should reverse numeric order', () => {
      const numbers = [1, 2, 3, 4, 5];
      numbers.sort(reverseComparator(numericComparator()));
      expect(numbers).toEqual([5, 4, 3, 2, 1]);
    });

    it('should reverse string order', () => {
      const strings = ['Alice', 'Bob', 'Charlie'];
      strings.sort(reverseComparator(stringComparator()));
      expect(strings).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('should place nulls first when reversing "last"', () => {
      const numbers = [1, null, 2, 3];
      numbers.sort(reverseComparator(numericComparator('last')));
      // Null should come first when reversed (reversed from last)
      expect(numbers[0]).toBeNull();
      expect(numbers.slice(1)).toEqual([3, 2, 1]);
    });
  });

  describe('chainComparators', () => {
    interface Person {
      age: number;
      name: string;
    }

    it('should sort by multiple criteria', () => {
      const people: Person[] = [
        { age: 30, name: 'Bob' },
        { age: 25, name: 'Alice' },
        { age: 30, name: 'Alice' },
        { age: 25, name: 'Charlie' },
      ];

      people.sort(
        chainComparators(
          (a: Person, b: Person) => a.age - b.age,
          (a: Person, b: Person) => a.name.localeCompare(b.name)
        )
      );

      expect(people).toEqual([
        { age: 25, name: 'Alice' },
        { age: 25, name: 'Charlie' },
        { age: 30, name: 'Alice' },
        { age: 30, name: 'Bob' },
      ]);
    });

    it('should use first comparator when values differ', () => {
      const people: Person[] = [
        { age: 30, name: 'Zack' },
        { age: 25, name: 'Aaron' },
      ];

      people.sort(
        chainComparators(
          (a: Person, b: Person) => a.age - b.age,
          (a: Person, b: Person) => a.name.localeCompare(b.name)
        )
      );

      expect(people[0].age).toBe(25);
      expect(people[1].age).toBe(30);
    });

    it('should handle more than two comparators', () => {
      interface Item {
        category: string;
        priority: number;
        name: string;
      }

      const items: Item[] = [
        { category: 'B', priority: 1, name: 'Item 3' },
        { category: 'A', priority: 2, name: 'Item 1' },
        { category: 'A', priority: 1, name: 'Item 2' },
        { category: 'A', priority: 1, name: 'Item 1' },
      ];

      items.sort(
        chainComparators(
          (a: Item, b: Item) => a.category.localeCompare(b.category),
          (a: Item, b: Item) => a.priority - b.priority,
          (a: Item, b: Item) => a.name.localeCompare(b.name)
        )
      );

      expect(items).toEqual([
        { category: 'A', priority: 1, name: 'Item 1' },
        { category: 'A', priority: 1, name: 'Item 2' },
        { category: 'A', priority: 2, name: 'Item 1' },
        { category: 'B', priority: 1, name: 'Item 3' },
      ]);
    });
  });
});
