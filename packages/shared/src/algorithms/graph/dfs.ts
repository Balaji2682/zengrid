import type { AdjacencyList, DFSOptions } from './graph.interface';

/**
 * Depth-First Search (DFS)
 *
 * Explores as far as possible along each branch before backtracking.
 *
 * **Time Complexity:** O(V + E) where V = vertices, E = edges
 * **Space Complexity:** O(V) for the recursion stack
 *
 * **Use Cases:**
 * - Path finding
 * - Cycle detection
 * - Topological sorting
 * - Connected components
 * - Maze solving
 *
 * @example
 * ```typescript
 * const graph: AdjacencyList<string> = new Map([
 *   ['A', new Set(['B', 'C'])],
 *   ['B', new Set(['D'])],
 *   ['C', new Set(['D'])],
 *   ['D', new Set()],
 * ]);
 *
 * const visited = dfs(graph, 'A');
 * // visited: ['A', 'B', 'D', 'C'] (depth-first order)
 * ```
 *
 * @param graph - Adjacency list representation
 * @param start - Starting node
 * @param options - Traversal options
 * @returns Array of visited nodes in DFS order
 */
export function dfs<T>(
  graph: AdjacencyList<T>,
  start: T,
  options: DFSOptions<T> = {}
): T[] {
  const visited = new Set<T>();
  const result: T[] = [];
  const recursionStack = new Set<T>();

  const traverse = (node: T, depth: number): void => {
    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    result.push(node);

    options.onVisit?.(node, depth);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (recursionStack.has(neighbor)) {
          // Back edge detected (cycle)
          options.onBackEdge?.(node, neighbor);
        } else {
          traverse(neighbor, depth + 1);
        }
      }
    }

    recursionStack.delete(node);
    options.onBacktrack?.(node);
  };

  traverse(start, 0);

  return result;
}

/**
 * DFS to find a path between two nodes
 *
 * @param graph - Adjacency list
 * @param start - Start node
 * @param end - End node
 * @returns Path from start to end, or empty array if no path exists
 */
export function dfsPath<T>(graph: AdjacencyList<T>, start: T, end: T): T[] {
  const visited = new Set<T>();
  const path: T[] = [];

  const traverse = (node: T): boolean => {
    if (visited.has(node)) return false;

    visited.add(node);
    path.push(node);

    if (node === end) return true;

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (traverse(neighbor)) return true;
      }
    }

    path.pop();
    return false;
  };

  traverse(start);

  return path;
}

/**
 * Detect if a graph has cycles using DFS
 *
 * @param graph - Adjacency list
 * @returns true if graph has cycles
 */
export function hasCycle<T>(graph: AdjacencyList<T>): boolean {
  const visited = new Set<T>();
  const recursionStack = new Set<T>();

  const traverse = (node: T): boolean => {
    if (recursionStack.has(node)) return true; // Cycle detected
    if (visited.has(node)) return false;

    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (traverse(neighbor)) return true;
      }
    }

    recursionStack.delete(node);
    return false;
  };

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (traverse(node)) return true;
    }
  }

  return false;
}

/**
 * Find all strongly connected components using Tarjan's algorithm
 *
 * A strongly connected component is a maximal set of vertices
 * where every vertex is reachable from every other vertex.
 *
 * @param graph - Adjacency list
 * @returns Array of strongly connected components
 */
export function stronglyConnectedComponents<T>(graph: AdjacencyList<T>): T[][] {
  const index = new Map<T, number>();
  const lowLink = new Map<T, number>();
  const onStack = new Set<T>();
  const stack: T[] = [];
  const components: T[][] = [];
  let currentIndex = 0;

  const tarjan = (node: T): void => {
    index.set(node, currentIndex);
    lowLink.set(node, currentIndex);
    currentIndex++;
    stack.push(node);
    onStack.add(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!index.has(neighbor)) {
          tarjan(neighbor);
          lowLink.set(node, Math.min(lowLink.get(node)!, lowLink.get(neighbor)!));
        } else if (onStack.has(neighbor)) {
          lowLink.set(node, Math.min(lowLink.get(node)!, index.get(neighbor)!));
        }
      }
    }

    // If node is a root node, pop the stack and create a component
    if (lowLink.get(node) === index.get(node)) {
      const component: T[] = [];
      let w: T;

      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== node);

      components.push(component);
    }
  };

  for (const node of graph.keys()) {
    if (!index.has(node)) {
      tarjan(node);
    }
  }

  return components;
}
