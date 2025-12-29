import { Trie } from './trie';

describe('Trie', () => {
  let trie: Trie;

  beforeEach(() => {
    trie = new Trie();
  });

  describe('insert', () => {
    it('should insert a word', () => {
      trie.insert('hello');
      expect(trie.search('hello')).toBe(true);
    });

    it('should insert multiple words', () => {
      trie.insert('hello');
      trie.insert('world');
      trie.insert('hi');

      expect(trie.search('hello')).toBe(true);
      expect(trie.search('world')).toBe(true);
      expect(trie.search('hi')).toBe(true);
    });

    it('should handle empty string', () => {
      trie.insert('');
      expect(trie.size()).toBe(0);
    });

    it('should not increase size for duplicate words', () => {
      trie.insert('apple');
      trie.insert('apple');

      expect(trie.size()).toBe(1);
    });

    it('should handle words with common prefixes', () => {
      trie.insert('app');
      trie.insert('apple');
      trie.insert('application');

      expect(trie.search('app')).toBe(true);
      expect(trie.search('apple')).toBe(true);
      expect(trie.search('application')).toBe(true);
      expect(trie.size()).toBe(3);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      trie.insert('apple');
      trie.insert('application');
      trie.insert('app');
    });

    it('should find exact words', () => {
      expect(trie.search('apple')).toBe(true);
      expect(trie.search('app')).toBe(true);
    });

    it('should not find partial words', () => {
      expect(trie.search('appl')).toBe(false);
      expect(trie.search('ap')).toBe(false);
    });

    it('should not find non-existent words', () => {
      expect(trie.search('banana')).toBe(false);
      expect(trie.search('applications')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(trie.search('')).toBe(false);
    });

    it('should be case-insensitive by default', () => {
      expect(trie.search('APPLE')).toBe(true);
      expect(trie.search('ApPlE')).toBe(true);
    });

    it('should be case-sensitive when configured', () => {
      const sensitiveTrie = new Trie({ caseSensitive: true });
      sensitiveTrie.insert('Apple');

      expect(sensitiveTrie.search('Apple')).toBe(true);
      expect(sensitiveTrie.search('apple')).toBe(false);
      expect(sensitiveTrie.search('APPLE')).toBe(false);
    });
  });

  describe('startsWith', () => {
    beforeEach(() => {
      trie.insert('apple');
      trie.insert('application');
      trie.insert('banana');
    });

    it('should find prefixes', () => {
      expect(trie.startsWith('app')).toBe(true);
      expect(trie.startsWith('appl')).toBe(true);
      expect(trie.startsWith('ban')).toBe(true);
    });

    it('should return false for non-existent prefixes', () => {
      expect(trie.startsWith('ora')).toBe(false);
      expect(trie.startsWith('xyz')).toBe(false);
    });

    it('should return true for empty prefix', () => {
      expect(trie.startsWith('')).toBe(true);
    });

    it('should return true for complete words', () => {
      expect(trie.startsWith('apple')).toBe(true);
      expect(trie.startsWith('banana')).toBe(true);
    });
  });

  describe('autocomplete', () => {
    beforeEach(() => {
      trie.insert('apple');
      trie.insert('application');
      trie.insert('apply');
      trie.insert('app');
      trie.insert('banana');
      trie.insert('band');
    });

    it('should return all words with given prefix', () => {
      const results = trie.autocomplete('app');
      expect(results).toContain('app');
      expect(results).toContain('apple');
      expect(results).toContain('application');
      expect(results).toContain('apply');
      expect(results).toHaveLength(4);
    });

    it('should return suggestions in sorted order', () => {
      const results = trie.autocomplete('app');
      expect(results).toEqual(['app', 'apple', 'application', 'apply']);
    });

    it('should respect maxResults parameter', () => {
      const results = trie.autocomplete('app', 2);
      expect(results).toHaveLength(2);
      expect(results).toEqual(['app', 'apple']);
    });

    it('should return empty array for non-existent prefix', () => {
      const results = trie.autocomplete('xyz');
      expect(results).toEqual([]);
    });

    it('should return all words for empty prefix', () => {
      const results = trie.autocomplete('');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit results to maxSuggestions option', () => {
      const limitedTrie = new Trie({ maxSuggestions: 2 });
      limitedTrie.insert('app');
      limitedTrie.insert('apple');
      limitedTrie.insert('application');

      const results = limitedTrie.autocomplete('app');
      expect(results).toHaveLength(2);
    });

    it('should preserve case in suggestions', () => {
      const results = trie.autocomplete('APP');
      // Should restore case from prefix
      results.forEach(word => {
        expect(word.substring(0, 3)).toBe('APP');
      });
    });
  });

  describe('find', () => {
    beforeEach(() => {
      trie.insert('app');
      trie.insert('apple');
      trie.insert('application');
    });

    it('should return complete result for existing prefix', () => {
      const result = trie.find('app');

      expect(result.term).toBe('app');
      expect(result.isComplete).toBe(true);
      expect(result.suggestions).toContain('app');
      expect(result.suggestions).toContain('apple');
      expect(result.count).toBe(3); // app, apple, application
    });

    it('should indicate incomplete word', () => {
      const result = trie.find('appl');

      expect(result.term).toBe('appl');
      expect(result.isComplete).toBe(false);
      expect(result.suggestions).toContain('apple');
      expect(result.suggestions).toContain('application');
      expect(result.count).toBe(2);
    });

    it('should return empty result for non-existent term', () => {
      const result = trie.find('xyz');

      expect(result.term).toBe('xyz');
      expect(result.isComplete).toBe(false);
      expect(result.suggestions).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      trie.insert('app');
      trie.insert('apple');
      trie.insert('application');
    });

    it('should delete a word', () => {
      const deleted = trie.delete('app');

      expect(deleted).toBe(true);
      expect(trie.search('app')).toBe(false);
      expect(trie.size()).toBe(2);
    });

    it('should not affect other words with same prefix', () => {
      trie.delete('app');

      expect(trie.search('apple')).toBe(true);
      expect(trie.search('application')).toBe(true);
    });

    it('should return false for non-existent word', () => {
      const deleted = trie.delete('banana');

      expect(deleted).toBe(false);
      expect(trie.size()).toBe(3);
    });

    it('should handle deleting all words', () => {
      trie.delete('app');
      trie.delete('apple');
      trie.delete('application');

      expect(trie.isEmpty()).toBe(true);
      expect(trie.size()).toBe(0);
    });

    it('should handle deleting longest word first', () => {
      trie.delete('application');

      expect(trie.search('application')).toBe(false);
      expect(trie.search('apple')).toBe(true);
      expect(trie.search('app')).toBe(true);
      expect(trie.size()).toBe(2);
    });

    it('should update word counts correctly', () => {
      trie.delete('application');

      const result = trie.find('app');
      expect(result.count).toBe(2); // app, apple
    });

    it('should handle empty string', () => {
      expect(trie.delete('')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all words', () => {
      trie.insert('apple');
      trie.insert('banana');
      trie.insert('cherry');

      trie.clear();

      expect(trie.isEmpty()).toBe(true);
      expect(trie.size()).toBe(0);
      expect(trie.getAllWords()).toEqual([]);
    });

    it('should allow new insertions after clear', () => {
      trie.insert('apple');
      trie.clear();
      trie.insert('banana');

      expect(trie.search('banana')).toBe(true);
      expect(trie.search('apple')).toBe(false);
      expect(trie.size()).toBe(1);
    });
  });

  describe('getAllWords', () => {
    it('should return all words in sorted order', () => {
      trie.insert('cherry');
      trie.insert('apple');
      trie.insert('banana');

      const words = trie.getAllWords();

      expect(words).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should return empty array for empty trie', () => {
      expect(trie.getAllWords()).toEqual([]);
    });

    it('should handle words with common prefixes', () => {
      trie.insert('app');
      trie.insert('apple');
      trie.insert('application');

      const words = trie.getAllWords();

      expect(words).toContain('app');
      expect(words).toContain('apple');
      expect(words).toContain('application');
      expect(words).toHaveLength(3);
    });
  });

  describe('size', () => {
    it('should return 0 for empty trie', () => {
      expect(trie.size()).toBe(0);
    });

    it('should return correct count after insertions', () => {
      trie.insert('apple');
      trie.insert('banana');

      expect(trie.size()).toBe(2);
    });

    it('should not count duplicates', () => {
      trie.insert('apple');
      trie.insert('apple');

      expect(trie.size()).toBe(1);
    });

    it('should decrease after deletions', () => {
      trie.insert('apple');
      trie.insert('banana');
      trie.delete('apple');

      expect(trie.size()).toBe(1);
    });
  });

  describe('isEmpty', () => {
    it('should return true for new trie', () => {
      expect(trie.isEmpty()).toBe(true);
    });

    it('should return false after insertion', () => {
      trie.insert('apple');
      expect(trie.isEmpty()).toBe(false);
    });

    it('should return true after clearing', () => {
      trie.insert('apple');
      trie.clear();

      expect(trie.isEmpty()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large number of words efficiently', () => {
      const start = performance.now();

      // Insert 10,000 words
      for (let i = 0; i < 10000; i++) {
        trie.insert(`word${i}`);
      }

      const insertTime = performance.now() - start;

      expect(trie.size()).toBe(10000);
      expect(insertTime).toBeLessThan(1000); // Should complete in < 1s
    });

    it('should search efficiently in large trie', () => {
      // Insert 10,000 words
      for (let i = 0; i < 10000; i++) {
        trie.insert(`word${i}`);
      }

      const start = performance.now();

      // Perform 1000 searches
      for (let i = 0; i < 1000; i++) {
        trie.search(`word${i}`);
      }

      const searchTime = performance.now() - start;

      expect(searchTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should autocomplete efficiently', () => {
      // Insert words with common prefix
      for (let i = 0; i < 1000; i++) {
        trie.insert(`prefix${i}`);
      }

      const start = performance.now();
      const results = trie.autocomplete('prefix', 10);
      const autocompleteTime = performance.now() - start;

      expect(results).toHaveLength(10);
      expect(autocompleteTime).toBeLessThan(50); // Should complete in < 50ms
    });
  });

  describe('Real-World Use Case: Column Filter Autocomplete', () => {
    it('should provide autocomplete for column values', () => {
      // Simulate column values from a grid
      const columnValues = [
        'Apple Inc.',
        'Apple Store',
        'Application Development',
        'Applied Sciences',
        'Banana Republic',
        'Band of Brothers',
      ];

      columnValues.forEach(value => trie.insert(value));

      // User types "app"
      const suggestions = trie.autocomplete('app', 5);

      expect(suggestions).toContain('apple inc.');
      expect(suggestions).toContain('apple store');
      expect(suggestions).toContain('application development');
      expect(suggestions).toContain('applied sciences');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle special characters in filter values', () => {
      trie.insert('user@example.com');
      trie.insert('user@test.com');
      trie.insert('admin@example.com');

      const results = trie.autocomplete('user@');

      expect(results).toContain('user@example.com');
      expect(results).toContain('user@test.com');
      expect(results).toHaveLength(2);
    });
  });
});
