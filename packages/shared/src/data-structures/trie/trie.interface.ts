/**
 * Trie (Prefix Tree) Interface
 *
 * Used for:
 * - Autocomplete in column filters
 * - Search suggestions
 * - Dictionary lookups
 * - Prefix-based searches
 */

/**
 * Trie search result
 */
export interface TrieSearchResult {
  /**
   * The search term
   */
  term: string;

  /**
   * Whether the term exists as a complete word
   */
  isComplete: boolean;

  /**
   * All words with this prefix
   */
  suggestions: string[];

  /**
   * Number of words with this prefix
   */
  count: number;
}

/**
 * Trie node interface
 */
export interface ITrieNode {
  /**
   * Character at this node
   */
  char: string;

  /**
   * Is this the end of a word?
   */
  isEndOfWord: boolean;

  /**
   * Child nodes
   */
  children: Map<string, ITrieNode>;

  /**
   * Number of words passing through this node
   */
  wordCount: number;
}

/**
 * Trie options
 */
export interface TrieOptions {
  /**
   * Case-sensitive search
   * @default false
   */
  caseSensitive?: boolean;

  /**
   * Maximum suggestions to return
   * @default 10
   */
  maxSuggestions?: number;

  /**
   * Allow partial matches
   * @default true
   */
  allowPartial?: boolean;
}

/**
 * Trie data structure interface
 */
export interface ITrie {
  /**
   * Insert a word into the trie
   */
  insert(word: string): void;

  /**
   * Search for a word in the trie
   */
  search(word: string): boolean;

  /**
   * Check if any word starts with the given prefix
   */
  startsWith(prefix: string): boolean;

  /**
   * Get all words with the given prefix (autocomplete)
   */
  autocomplete(prefix: string, maxResults?: number): string[];

  /**
   * Get detailed search result
   */
  find(term: string): TrieSearchResult;

  /**
   * Delete a word from the trie
   */
  delete(word: string): boolean;

  /**
   * Clear all words from the trie
   */
  clear(): void;

  /**
   * Get all words in the trie
   */
  getAllWords(): string[];

  /**
   * Get the number of words in the trie
   */
  size(): number;

  /**
   * Check if the trie is empty
   */
  isEmpty(): boolean;
}
