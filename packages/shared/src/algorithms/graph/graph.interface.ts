/**
 * Graph algorithm interfaces and types
 */

/**
 * Generic graph representation (adjacency list)
 */
export type AdjacencyList<T = any> = Map<T, Set<T>>;

/**
 * Weighted edge
 */
export interface WeightedEdge<T> {
  from: T;
  to: T;
  weight: number;
}

/**
 * DFS traversal options
 */
export interface DFSOptions<T> {
  /**
   * Callback when visiting a node
   */
  onVisit?: (node: T, depth: number) => void;

  /**
   * Callback when backtracking from a node
   */
  onBacktrack?: (node: T) => void;

  /**
   * Callback when detecting a back edge (cycle)
   */
  onBackEdge?: (from: T, to: T) => void;
}

/**
 * BFS traversal options
 */
export interface BFSOptions<T> {
  /**
   * Callback when visiting a node
   */
  onVisit?: (node: T, level: number) => void;

  /**
   * Maximum depth to traverse
   */
  maxDepth?: number;
}

/**
 * Path result
 */
export interface PathResult<T> {
  /**
   * Nodes in the path
   */
  path: T[];

  /**
   * Total cost/distance
   */
  cost: number;

  /**
   * Whether a path was found
   */
  found: boolean;
}
