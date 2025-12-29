import type {
  IDependencyGraph,
  NodeId,
  DependencyGraphOptions,
  TopologicalSortResult,
  GraphStats,
} from './dependency-graph.interface';

/**
 * Dependency Graph (Directed Acyclic Graph)
 *
 * A graph structure for tracking dependencies between nodes.
 * Optimized for formula calculation order and cycle detection.
 *
 * **Time Complexity:**
 * - Add node: O(1)
 * - Add edge: O(1) without cycle check, O(V + E) with cycle check
 * - Remove node: O(E) where E = edges connected to node
 * - Topological sort: O(V + E) using Kahn's algorithm
 * - Cycle detection: O(V + E) using DFS
 *
 * **Space Complexity:** O(V + E)
 *
 * **Use Cases:**
 * - Formula dependencies: =SUM(A1:A10) depends on cells A1 through A10
 * - Calculation order: Calculate dependencies before dependents
 * - Circular reference detection: =A1 in cell A1 is invalid
 * - Dirty cell propagation: When B1 changes, recalculate all cells that depend on B1
 *
 * @example Basic Formula Dependencies
 * ```typescript
 * const graph = new DependencyGraph();
 *
 * // Cell A3 contains formula =A1+A2
 * graph.addDependency('A3', 'A1'); // A3 depends on A1
 * graph.addDependency('A3', 'A2'); // A3 depends on A2
 *
 * // Cell A4 contains formula =A3*2
 * graph.addDependency('A4', 'A3'); // A4 depends on A3
 *
 * // Get calculation order
 * const { order } = graph.topologicalSort();
 * // order: ['A1', 'A2', 'A3', 'A4']
 *
 * // Detect circular reference
 * const wouldCycle = graph.wouldCreateCycle('A1', 'A4');
 * // wouldCycle: true (A4→A3→A1→A4 creates a cycle)
 * ```
 *
 * @example Incremental Recalculation
 * ```typescript
 * // User changes cell B1
 * const affectedCells = graph.getCalculationOrder(['B1']);
 * // Returns: ['B1', 'C1', 'D1', ...] (all cells that transitively depend on B1)
 *
 * // Recalculate only affected cells in correct order
 * affectedCells.forEach(cellId => {
 *   calculateCell(cellId);
 * });
 * ```
 */
export class DependencyGraph implements IDependencyGraph {
  /** Map of node → nodes it depends on */
  private dependencies: Map<NodeId, Set<NodeId>> = new Map();

  /** Map of node → nodes that depend on it */
  private dependents: Map<NodeId, Set<NodeId>> = new Map();

  private options: Required<DependencyGraphOptions>;

  constructor(options: DependencyGraphOptions = {}) {
    this.options = {
      allowSelfLoops: options.allowSelfLoops ?? false,
      throwOnCycle: options.throwOnCycle ?? false,
    };
  }

  /**
   * Add a node to the graph
   */
  addNode(id: NodeId): void {
    if (!this.dependencies.has(id)) {
      this.dependencies.set(id, new Set());
      this.dependents.set(id, new Set());
    }
  }

  /**
   * Add a dependency edge (from depends on to)
   *
   * @param from - Dependent node
   * @param to - Dependency node
   * @returns true if edge was added, false if it would create a cycle
   */
  addDependency(from: NodeId, to: NodeId): boolean {
    // Check for self-loops
    if (!this.options.allowSelfLoops && from === to) {
      if (this.options.throwOnCycle) {
        throw new Error(`Self-loop detected: ${from} depends on itself`);
      }
      return false;
    }

    // Ensure nodes exist
    this.addNode(from);
    this.addNode(to);

    // Check if this would create a cycle
    if (this.wouldCreateCycle(from, to)) {
      if (this.options.throwOnCycle) {
        throw new Error(`Circular dependency detected: adding ${from} → ${to} creates a cycle`);
      }
      return false;
    }

    // Add the edge
    this.dependencies.get(from)!.add(to);
    this.dependents.get(to)!.add(from);

    return true;
  }

  /**
   * Remove a node and all its dependencies
   */
  removeNode(id: NodeId): boolean {
    if (!this.hasNode(id)) return false;

    // Remove all edges where this node is the dependent
    const deps = this.dependencies.get(id)!;
    for (const dep of deps) {
      this.dependents.get(dep)!.delete(id);
    }

    // Remove all edges where this node is the dependency
    const depts = this.dependents.get(id)!;
    for (const dept of depts) {
      this.dependencies.get(dept)!.delete(id);
    }

    // Remove the node
    this.dependencies.delete(id);
    this.dependents.delete(id);

    return true;
  }

  /**
   * Remove a specific dependency
   */
  removeDependency(from: NodeId, to: NodeId): boolean {
    if (!this.hasDependency(from, to)) return false;

    this.dependencies.get(from)!.delete(to);
    this.dependents.get(to)!.delete(from);

    return true;
  }

  /**
   * Check if a node exists
   */
  hasNode(id: NodeId): boolean {
    return this.dependencies.has(id);
  }

  /**
   * Check if a dependency exists
   */
  hasDependency(from: NodeId, to: NodeId): boolean {
    return this.dependencies.get(from)?.has(to) ?? false;
  }

  /**
   * Get direct dependencies of a node (what it depends on)
   */
  getDependencies(id: NodeId): NodeId[] {
    return Array.from(this.dependencies.get(id) ?? []);
  }

  /**
   * Get direct dependents of a node (what depends on it)
   */
  getDependents(id: NodeId): NodeId[] {
    return Array.from(this.dependents.get(id) ?? []);
  }

  /**
   * Get all transitive dependencies (recursive)
   */
  getTransitiveDependencies(id: NodeId): NodeId[] {
    const visited = new Set<NodeId>();
    const result: NodeId[] = [];

    const dfs = (nodeId: NodeId): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const deps = this.dependencies.get(nodeId);
      if (deps) {
        for (const dep of deps) {
          result.push(dep);
          dfs(dep);
        }
      }
    };

    dfs(id);
    return result;
  }

  /**
   * Get all transitive dependents (recursive)
   */
  getTransitiveDependents(id: NodeId): NodeId[] {
    const visited = new Set<NodeId>();
    const result: NodeId[] = [];

    const dfs = (nodeId: NodeId): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const depts = this.dependents.get(nodeId);
      if (depts) {
        for (const dept of depts) {
          result.push(dept);
          dfs(dept);
        }
      }
    };

    dfs(id);
    return result;
  }

  /**
   * Check if adding a dependency would create a cycle
   *
   * Uses DFS to detect if there's a path from 'to' back to 'from'
   */
  wouldCreateCycle(from: NodeId, to: NodeId): boolean {
    if (from === to) return true;
    if (!this.hasNode(to)) return false;

    // Check if there's a path from 'to' to 'from'
    const visited = new Set<NodeId>();

    const dfs = (node: NodeId): boolean => {
      if (node === from) return true;
      if (visited.has(node)) return false;

      visited.add(node);

      const deps = this.dependents.get(node);
      if (deps) {
        for (const dept of deps) {
          if (dfs(dept)) return true;
        }
      }

      return false;
    };

    return dfs(to);
  }

  /**
   * Detect all cycles in the graph using DFS
   */
  detectCycles(): NodeId[][] {
    const cycles: NodeId[][] = [];
    const visited = new Set<NodeId>();
    const recursionStack = new Set<NodeId>();
    const path: NodeId[] = [];

    const dfs = (node: NodeId): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const depts = this.dependents.get(node);
      if (depts) {
        for (const dept of depts) {
          if (!visited.has(dept)) {
            dfs(dept);
          } else if (recursionStack.has(dept)) {
            // Found a cycle
            const cycleStart = path.indexOf(dept);
            const cycle = path.slice(cycleStart);
            cycles.push([...cycle, dept]);
          }
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const node of this.dependencies.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Perform topological sort using Kahn's algorithm
   *
   * Returns nodes in dependency order (dependencies before dependents)
   */
  topologicalSort(): TopologicalSortResult {
    const inDegree = new Map<NodeId, number>();
    const queue: NodeId[] = [];
    const order: NodeId[] = [];

    // Calculate in-degrees
    for (const node of this.dependencies.keys()) {
      inDegree.set(node, this.dependencies.get(node)!.size);
    }

    // Add nodes with no dependencies to queue
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);

      // Reduce in-degree of dependents
      const depts = this.dependents.get(node);
      if (depts) {
        for (const dept of depts) {
          const newDegree = inDegree.get(dept)! - 1;
          inDegree.set(dept, newDegree);

          if (newDegree === 0) {
            queue.push(dept);
          }
        }
      }
    }

    // Check for cycles
    const hasCycle = order.length !== this.dependencies.size;
    const cycleNodes: NodeId[] = [];

    if (hasCycle) {
      for (const [node, degree] of inDegree.entries()) {
        if (degree > 0) {
          cycleNodes.push(node);
        }
      }
    }

    return {
      order,
      hasCycle,
      cycleNodes,
    };
  }

  /**
   * Get calculation order for incremental updates
   *
   * Returns all nodes that need to be recalculated when the given nodes change,
   * in the correct calculation order.
   */
  getCalculationOrder(changedNodes: NodeId[]): NodeId[] {
    const affectedNodes = new Set<NodeId>(changedNodes);

    // Add all transitive dependents
    for (const node of changedNodes) {
      const dependents = this.getTransitiveDependents(node);
      dependents.forEach(d => affectedNodes.add(d));
    }

    // Create subgraph of affected nodes
    const subgraph = new DependencyGraph();

    for (const node of affectedNodes) {
      subgraph.addNode(node);
    }

    for (const node of affectedNodes) {
      const deps = this.getDependencies(node);
      for (const dep of deps) {
        if (affectedNodes.has(dep)) {
          subgraph.addDependency(node, dep);
        }
      }
    }

    // Topological sort of subgraph
    const { order, hasCycle } = subgraph.topologicalSort();

    if (hasCycle) {
      console.warn('Cycle detected in calculation order');
    }

    return order;
  }

  /**
   * Clear all nodes and edges
   */
  clear(): void {
    this.dependencies.clear();
    this.dependents.clear();
  }

  /**
   * Get all nodes
   */
  getAllNodes(): NodeId[] {
    return Array.from(this.dependencies.keys());
  }

  /**
   * Get statistics about the graph
   */
  getStats(): GraphStats {
    let edgeCount = 0;
    let sourceCount = 0;
    let sinkCount = 0;
    let maxDepth = 0;

    for (const [node, deps] of this.dependencies.entries()) {
      edgeCount += deps.size;

      if (deps.size === 0) {
        sourceCount++;
      }

      if (this.dependents.get(node)!.size === 0) {
        sinkCount++;
      }

      // Calculate depth (longest path to a source)
      const depth = this.calculateDepth(node);
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      nodeCount: this.dependencies.size,
      edgeCount,
      sourceCount,
      sinkCount,
      maxDepth,
    };
  }

  /**
   * Clone the graph
   */
  clone(): IDependencyGraph {
    const cloned = new DependencyGraph(this.options);

    // Copy nodes
    for (const node of this.dependencies.keys()) {
      cloned.addNode(node);
    }

    // Copy edges
    for (const [from, deps] of this.dependencies.entries()) {
      for (const to of deps) {
        cloned.addDependency(from, to);
      }
    }

    return cloned;
  }

  // ==================== Private Methods ====================

  private calculateDepth(node: NodeId): number {
    const visited = new Set<NodeId>();

    const dfs = (n: NodeId): number => {
      if (visited.has(n)) return 0; // Avoid infinite loops
      visited.add(n);

      const deps = this.dependencies.get(n);
      if (!deps || deps.size === 0) return 0;

      let maxChildDepth = 0;
      for (const dep of deps) {
        maxChildDepth = Math.max(maxChildDepth, dfs(dep));
      }

      return maxChildDepth + 1;
    };

    return dfs(node);
  }
}
