import type { AdjacencyList, BFSOptions, PathResult } from './graph.interface';

/**
 * Breadth-First Search (BFS)
 *
 * Explores nodes level by level, visiting all neighbors before moving deeper.
 *
 * **Time Complexity:** O(V + E) where V = vertices, E = edges
 * **Space Complexity:** O(V) for the queue
 *
 * **Use Cases:**
 * - Shortest path in unweighted graphs
 * - Level-order traversal
 * - Finding connected components
 * - Web crawling
 * - Social network analysis (friends of friends)
 *
 * @example
 * ```typescript
 * const graph: AdjacencyList<string> = new Map([
 *   ['A', new Set(['B', 'C'])],
 *   ['B', new Set(['D', 'E'])],
 *   ['C', new Set(['F'])],
 *   ['D', new Set()],
 *   ['E', new Set()],
 *   ['F', new Set()],
 * ]);
 *
 * const visited = bfs(graph, 'A');
 * // visited: ['A', 'B', 'C', 'D', 'E', 'F'] (breadth-first order)
 * ```
 *
 * @param graph - Adjacency list representation
 * @param start - Starting node
 * @param options - Traversal options
 * @returns Array of visited nodes in BFS order
 */
export function bfs<T>(
  graph: AdjacencyList<T>,
  start: T,
  options: BFSOptions<T> = {}
): T[] {
  const visited = new Set<T>();
  const queue: Array<{ node: T; level: number }> = [];
  const result: T[] = [];

  const maxDepth = options.maxDepth ?? Infinity;

  queue.push({ node: start, level: 0 });
  visited.add(start);

  while (queue.length > 0) {
    const { node, level } = queue.shift()!;

    result.push(node);
    options.onVisit?.(node, level);

    if (level >= maxDepth) continue;

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, level: level + 1 });
        }
      }
    }
  }

  return result;
}

/**
 * BFS to find shortest path between two nodes (unweighted)
 *
 * @param graph - Adjacency list
 * @param start - Start node
 * @param end - End node
 * @returns Path result with shortest path
 */
export function bfsShortestPath<T>(graph: AdjacencyList<T>, start: T, end: T): PathResult<T> {
  const visited = new Set<T>();
  const parent = new Map<T, T | null>();
  const queue: T[] = [];

  queue.push(start);
  visited.add(start);
  parent.set(start, null);

  while (queue.length > 0) {
    const node = queue.shift()!;

    if (node === end) {
      // Reconstruct path
      const path: T[] = [];
      let current: T | null = end;

      while (current !== null) {
        path.unshift(current);
        current = parent.get(current)!;
      }

      return {
        path,
        cost: path.length - 1,
        found: true,
      };
    }

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, node);
          queue.push(neighbor);
        }
      }
    }
  }

  return {
    path: [],
    cost: Infinity,
    found: false,
  };
}

/**
 * Find all nodes at a specific distance from start
 *
 * @param graph - Adjacency list
 * @param start - Start node
 * @param distance - Distance from start
 * @returns Array of nodes at the specified distance
 */
export function nodesAtDistance<T>(graph: AdjacencyList<T>, start: T, distance: number): T[] {
  const visited = new Set<T>();
  const queue: Array<{ node: T; dist: number }> = [];
  const result: T[] = [];

  queue.push({ node: start, dist: 0 });
  visited.add(start);

  while (queue.length > 0) {
    const { node, dist } = queue.shift()!;

    if (dist === distance) {
      result.push(node);
      continue; // Don't explore further from this node
    }

    if (dist > distance) break; // We've gone too far

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, dist: dist + 1 });
        }
      }
    }
  }

  return result;
}

/**
 * Find connected component containing a node
 *
 * @param graph - Adjacency list
 * @param start - Starting node
 * @returns All nodes in the connected component
 */
export function connectedComponent<T>(graph: AdjacencyList<T>, start: T): T[] {
  return bfs(graph, start);
}

/**
 * Find all connected components in the graph
 *
 * @param graph - Adjacency list
 * @returns Array of connected components
 */
export function allConnectedComponents<T>(graph: AdjacencyList<T>): T[][] {
  const visited = new Set<T>();
  const components: T[][] = [];

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      const component = bfs(graph, node);
      component.forEach(n => visited.add(n));
      components.push(component);
    }
  }

  return components;
}
