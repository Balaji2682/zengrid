/**
 * Dependency Graph (DAG) Interface
 *
 * Used for:
 * - Formula dependency tracking (cell A1 depends on B1, C1)
 * - Topological sorting for calculation order
 * - Cycle detection to prevent circular references
 * - Dirty cell tracking for incremental recalculation
 */

/**
 * Graph node identifier
 */
export type NodeId = string | number;

/**
 * Dependency relationship
 */
export interface Dependency {
  /**
   * Source node (dependent)
   */
  from: NodeId;

  /**
   * Target node (dependency)
   */
  to: NodeId;
}

/**
 * Topological sort result
 */
export interface TopologicalSortResult {
  /**
   * Sorted nodes in dependency order
   */
  order: NodeId[];

  /**
   * Whether the graph has cycles
   */
  hasCycle: boolean;

  /**
   * Nodes involved in cycles (if any)
   */
  cycleNodes: NodeId[];
}

/**
 * Graph statistics
 */
export interface GraphStats {
  /**
   * Total number of nodes
   */
  nodeCount: number;

  /**
   * Total number of edges (dependencies)
   */
  edgeCount: number;

  /**
   * Nodes with no dependencies (sources)
   */
  sourceCount: number;

  /**
   * Nodes with no dependents (sinks)
   */
  sinkCount: number;

  /**
   * Maximum dependency chain length
   */
  maxDepth: number;
}

/**
 * Dependency Graph options
 */
export interface DependencyGraphOptions {
  /**
   * Allow self-loops (node depending on itself)
   * @default false
   */
  allowSelfLoops?: boolean;

  /**
   * Throw error on cycle detection
   * @default false
   */
  throwOnCycle?: boolean;
}

/**
 * Dependency Graph interface
 */
export interface IDependencyGraph {
  /**
   * Add a node to the graph
   */
  addNode(id: NodeId): void;

  /**
   * Add a dependency edge (from depends on to)
   */
  addDependency(from: NodeId, to: NodeId): boolean;

  /**
   * Remove a node and all its dependencies
   */
  removeNode(id: NodeId): boolean;

  /**
   * Remove a specific dependency
   */
  removeDependency(from: NodeId, to: NodeId): boolean;

  /**
   * Check if a node exists
   */
  hasNode(id: NodeId): boolean;

  /**
   * Check if a dependency exists
   */
  hasDependency(from: NodeId, to: NodeId): boolean;

  /**
   * Get all dependencies of a node (what it depends on)
   */
  getDependencies(id: NodeId): NodeId[];

  /**
   * Get all dependents of a node (what depends on it)
   */
  getDependents(id: NodeId): NodeId[];

  /**
   * Get all transitive dependencies (recursive)
   */
  getTransitiveDependencies(id: NodeId): NodeId[];

  /**
   * Get all transitive dependents (recursive)
   */
  getTransitiveDependents(id: NodeId): NodeId[];

  /**
   * Detect if adding a dependency would create a cycle
   */
  wouldCreateCycle(from: NodeId, to: NodeId): boolean;

  /**
   * Detect all cycles in the graph
   */
  detectCycles(): NodeId[][];

  /**
   * Perform topological sort
   */
  topologicalSort(): TopologicalSortResult;

  /**
   * Get calculation order for incremental updates
   */
  getCalculationOrder(changedNodes: NodeId[]): NodeId[];

  /**
   * Clear all nodes and edges
   */
  clear(): void;

  /**
   * Get all nodes
   */
  getAllNodes(): NodeId[];

  /**
   * Get statistics about the graph
   */
  getStats(): GraphStats;

  /**
   * Clone the graph
   */
  clone(): IDependencyGraph;
}
