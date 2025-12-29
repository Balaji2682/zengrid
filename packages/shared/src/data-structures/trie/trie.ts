import type {
  ITrie,
  ITrieNode,
  TrieOptions,
  TrieSearchResult,
} from './trie.interface';

/**
 * Trie Node implementation
 */
class TrieNode implements ITrieNode {
  char: string;
  isEndOfWord: boolean = false;
  children: Map<string, ITrieNode> = new Map();
  wordCount: number = 0;

  constructor(char: string = '') {
    this.char = char;
  }
}

/**
 * Trie (Prefix Tree) Data Structure
 *
 * A tree-based data structure for efficient prefix-based searches.
 *
 * **Time Complexity:**
 * - Insert: O(m) where m = word length
 * - Search: O(m)
 * - Autocomplete: O(m + n) where n = number of suggestions
 * - Delete: O(m)
 *
 * **Space Complexity:** O(ALPHABET_SIZE * m * n) where n = number of words
 *
 * **Use Cases:**
 * - Column filter autocomplete: type "ap" → suggests "apple", "application"
 * - Search suggestions: real-time filtering as user types
 * - Dictionary lookups: spell checking
 * - IP routing tables
 *
 * @example
 * ```typescript
 * const trie = new Trie();
 * trie.insert('apple');
 * trie.insert('application');
 * trie.insert('app');
 *
 * trie.search('apple');           // true
 * trie.search('appl');            // false
 * trie.startsWith('app');         // true
 * trie.autocomplete('app');       // ['app', 'apple', 'application']
 *
 * const result = trie.find('app');
 * // {
 * //   term: 'app',
 * //   isComplete: true,
 * //   suggestions: ['app', 'apple', 'application'],
 * //   count: 3
 * // }
 * ```
 *
 * @example Grid Integration
 * ```typescript
 * // Column filter with autocomplete
 * class FilterManager {
 *   private valueTrie = new Trie();
 *
 *   indexColumn(col: number): void {
 *     const values = this.grid.getColumnValues(col);
 *     values.forEach(v => this.valueTrie.insert(String(v)));
 *   }
 *
 *   getSuggestions(prefix: string): string[] {
 *     return this.valueTrie.autocomplete(prefix, 10);
 *   }
 * }
 * ```
 */
export class Trie implements ITrie {
  private root: ITrieNode;
  private options: Required<TrieOptions>;
  private wordCount: number = 0;

  constructor(options: TrieOptions = {}) {
    this.root = new TrieNode();
    this.options = {
      caseSensitive: options.caseSensitive ?? false,
      maxSuggestions: options.maxSuggestions ?? 10,
      allowPartial: options.allowPartial ?? true,
    };
  }

  /**
   * Insert a word into the trie
   *
   * @param word - Word to insert
   *
   * @example
   * ```typescript
   * trie.insert('hello');
   * trie.insert('world');
   * ```
   */
  insert(word: string): void {
    if (!word) return;

    const normalized = this.normalize(word);
    let node = this.root;

    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode(char));
      }
      node = node.children.get(char)!;
      node.wordCount++;
    }

    if (!node.isEndOfWord) {
      node.isEndOfWord = true;
      this.wordCount++;
    }
  }

  /**
   * Search for an exact word in the trie
   *
   * @param word - Word to search for
   * @returns true if word exists, false otherwise
   *
   * @example
   * ```typescript
   * trie.insert('apple');
   * trie.search('apple');  // true
   * trie.search('app');    // false (not a complete word)
   * trie.search('apples'); // false
   * ```
   */
  search(word: string): boolean {
    if (!word) return false;

    const node = this.findNode(this.normalize(word));
    return node !== null && node.isEndOfWord;
  }

  /**
   * Check if any word starts with the given prefix
   *
   * @param prefix - Prefix to check
   * @returns true if prefix exists, false otherwise
   *
   * @example
   * ```typescript
   * trie.insert('apple');
   * trie.startsWith('app');  // true
   * trie.startsWith('ban');  // false
   * ```
   */
  startsWith(prefix: string): boolean {
    if (!prefix) return true;

    const node = this.findNode(this.normalize(prefix));
    return node !== null;
  }

  /**
   * Get autocomplete suggestions for a prefix
   *
   * @param prefix - Prefix to search for
   * @param maxResults - Maximum number of results (default: from options)
   * @returns Array of suggestions
   *
   * @example
   * ```typescript
   * trie.insert('apple');
   * trie.insert('application');
   * trie.insert('app');
   *
   * trie.autocomplete('app');     // ['app', 'apple', 'application']
   * trie.autocomplete('app', 2);  // ['app', 'apple']
   * ```
   */
  autocomplete(prefix: string, maxResults?: number): string[] {
    const max = maxResults ?? this.options.maxSuggestions;
    const normalized = this.normalize(prefix);
    const node = this.findNode(normalized);

    if (!node) return [];

    const suggestions: string[] = [];
    this.collectWords(node, normalized, suggestions, max);

    // Restore original case if needed
    if (!this.options.caseSensitive && prefix) {
      return suggestions.map(word => this.restoreCase(word, prefix));
    }

    return suggestions;
  }

  /**
   * Get detailed search result with metadata
   *
   * @param term - Search term
   * @returns Search result with suggestions and metadata
   *
   * @example
   * ```typescript
   * const result = trie.find('app');
   * // {
   * //   term: 'app',
   * //   isComplete: true,
   * //   suggestions: ['app', 'apple', 'application'],
   * //   count: 3
   * // }
   * ```
   */
  find(term: string): TrieSearchResult {
    const normalized = this.normalize(term);
    const node = this.findNode(normalized);

    if (!node) {
      return {
        term,
        isComplete: false,
        suggestions: [],
        count: 0,
      };
    }

    return {
      term,
      isComplete: node.isEndOfWord,
      suggestions: this.autocomplete(term),
      count: node.wordCount,
    };
  }

  /**
   * Delete a word from the trie
   *
   * @param word - Word to delete
   * @returns true if word was deleted, false if word didn't exist
   *
   * @example
   * ```typescript
   * trie.insert('apple');
   * trie.delete('apple');  // true
   * trie.delete('banana'); // false (doesn't exist)
   * ```
   */
  delete(word: string): boolean {
    if (!word) return false;

    const normalized = this.normalize(word);
    return this.deleteRecursive(this.root, normalized, 0);
  }

  /**
   * Clear all words from the trie
   */
  clear(): void {
    this.root = new TrieNode();
    this.wordCount = 0;
  }

  /**
   * Get all words in the trie
   *
   * @returns Array of all words
   *
   * @example
   * ```typescript
   * trie.insert('apple');
   * trie.insert('banana');
   * trie.getAllWords(); // ['apple', 'banana']
   * ```
   */
  getAllWords(): string[] {
    const words: string[] = [];
    this.collectWords(this.root, '', words, Infinity);
    return words;
  }

  /**
   * Get the number of unique words in the trie
   *
   * @returns Number of words
   */
  size(): number {
    return this.wordCount;
  }

  /**
   * Check if the trie is empty
   *
   * @returns true if empty, false otherwise
   */
  isEmpty(): boolean {
    return this.wordCount === 0;
  }

  // ==================== Private Methods ====================

  /**
   * Normalize a string based on case sensitivity option
   */
  private normalize(str: string): string {
    return this.options.caseSensitive ? str : str.toLowerCase();
  }

  /**
   * Restore original case from prefix to suggestion
   */
  private restoreCase(suggestion: string, prefix: string): string {
    if (suggestion.length < prefix.length) return suggestion;

    // Match the case of the prefix
    let result = '';
    for (let i = 0; i < prefix.length; i++) {
      const prefixChar = prefix[i];
      const suggestionChar = suggestion[i];

      if (prefixChar === prefixChar.toUpperCase()) {
        result += suggestionChar.toUpperCase();
      } else {
        result += suggestionChar.toLowerCase();
      }
    }

    // Append the rest
    result += suggestion.slice(prefix.length);
    return result;
  }

  /**
   * Find a node in the trie by traversing the path
   */
  private findNode(word: string): ITrieNode | null {
    let node = this.root;

    for (const char of word) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }

    return node;
  }

  /**
   * Collect all words from a node using DFS
   */
  private collectWords(
    node: ITrieNode,
    prefix: string,
    results: string[],
    maxResults: number
  ): void {
    if (results.length >= maxResults) return;

    if (node.isEndOfWord) {
      results.push(prefix);
      if (results.length >= maxResults) return;
    }

    // Traverse children in sorted order for consistent results
    const sortedChildren = Array.from(node.children.keys()).sort();

    for (const char of sortedChildren) {
      if (results.length >= maxResults) break;

      const child = node.children.get(char)!;
      this.collectWords(child, prefix + char, results, maxResults);
    }
  }

  /**
   * Recursively delete a word from the trie
   */
  private deleteRecursive(
    node: ITrieNode,
    word: string,
    index: number
  ): boolean {
    if (index === word.length) {
      // Reached end of word
      if (!node.isEndOfWord) {
        return false; // Word doesn't exist
      }

      node.isEndOfWord = false;
      this.wordCount--;

      // Return true if node has no children (can be deleted)
      return node.children.size === 0;
    }

    const char = word[index];
    const childNode = node.children.get(char);

    if (!childNode) {
      return false; // Word doesn't exist
    }

    // Decrement word count
    childNode.wordCount--;

    // Recursively delete in child
    const shouldDeleteChild = this.deleteRecursive(childNode, word, index + 1);

    if (shouldDeleteChild) {
      node.children.delete(char);

      // Return true if current node has no children and is not end of another word
      return node.children.size === 0 && !node.isEndOfWord;
    }

    return false;
  }
}
