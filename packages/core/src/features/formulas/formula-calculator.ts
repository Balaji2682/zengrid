/**
 * Formula Calculator using DependencyGraph
 *
 * Tracks formula dependencies and calculates cells in correct order.
 */

import { DependencyGraph } from '@zengrid/shared/data-structures/dependency-graph';

/**
 * Cell formula information
 */
export interface CellFormula {
  cell: string;
  formula: string;
  dependencies: string[];
}

/**
 * FormulaCalculator - Formula dependency tracking and calculation ordering
 *
 * Uses a dependency graph to track formula relationships and determine
 * the correct calculation order, with circular reference detection.
 *
 * @example
 * ```typescript
 * const calculator = new FormulaCalculator();
 *
 * // Cell C1 = A1 + B1
 * calculator.setFormula('C1', '=A1+B1', ['A1', 'B1']);
 *
 * // Cell D1 = C1 * 2
 * calculator.setFormula('D1', '=C1*2', ['C1']);
 *
 * // Get calculation order (dependencies first)
 * const order = calculator.getCalculationOrder();
 * // ['C1', 'D1'] - C1 first (no formula deps), then D1 (depends on C1)
 *
 * // User changes A1 - get cells to recalculate
 * const toRecalc = calculator.getCellsToRecalculate(['A1']);
 * // ['C1', 'D1'] - all cells that transitively depend on A1
 * ```
 */
export class FormulaCalculator {
  private graph = new DependencyGraph({ throwOnCycle: true });
  private formulas: Map<string, CellFormula> = new Map();

  /**
   * Register a formula cell
   *
   * @param cell - Cell reference (e.g., 'A1')
   * @param formula - Formula string (e.g., '=SUM(B1:B10)')
   * @param dependencies - Array of cell references this formula depends on
   * @throws Error if circular reference detected
   */
  setFormula(cell: string, formula: string, dependencies: string[]): void {
    // Add node for this cell
    this.graph.addNode(cell);

    // Remove old dependencies if formula already exists
    const oldFormula = this.formulas.get(cell);
    if (oldFormula) {
      for (const dep of oldFormula.dependencies) {
        this.graph.removeDependency(cell, dep);
      }
    }

    // Add new dependencies
    try {
      for (const dep of dependencies) {
        this.graph.addNode(dep);

        // Check if this would create a cycle BEFORE adding
        if (this.graph.wouldCreateCycle(cell, dep)) {
          throw new Error(`Circular reference: ${cell} → ${dep} creates a cycle`);
        }

        this.graph.addDependency(cell, dep); // cell depends on dep
      }

      this.formulas.set(cell, { cell, formula, dependencies });
    } catch (error) {
      // Restore old formula if update failed
      if (oldFormula) {
        for (const dep of oldFormula.dependencies) {
          this.graph.addDependency(cell, dep);
        }
      }
      throw error;
    }
  }

  /**
   * Remove a formula
   *
   * @param cell - Cell reference
   */
  removeFormula(cell: string): void {
    this.graph.removeNode(cell);
    this.formulas.delete(cell);
  }

  /**
   * Get formula for a cell
   *
   * @param cell - Cell reference
   * @returns Formula info or undefined
   */
  getFormula(cell: string): CellFormula | undefined {
    return this.formulas.get(cell);
  }

  /**
   * Check if cell has a formula
   *
   * @param cell - Cell reference
   * @returns true if cell has formula
   */
  hasFormula(cell: string): boolean {
    return this.formulas.has(cell);
  }

  /**
   * Get all cells with formulas
   *
   * @returns Array of cell references
   */
  getAllFormulaCells(): string[] {
    return Array.from(this.formulas.keys());
  }

  /**
   * Get calculation order for all formulas
   *
   * Returns cells in dependency order (dependencies before dependents).
   *
   * @returns Array of cell references in calculation order
   * @throws Error if circular references detected
   */
  getCalculationOrder(): string[] {
    const { order, hasCycle, cycleNodes } = this.graph.topologicalSort();

    if (hasCycle) {
      throw new Error(`Circular references detected: ${cycleNodes.join(' → ')}`);
    }

    // Filter to only cells with formulas (NodeId[] -> string[])
    return order.filter(cell => this.formulas.has(cell as string)) as string[];
  }

  /**
   * Get cells to recalculate when specific cells change
   *
   * Returns all formula cells that transitively depend on the changed cells,
   * in correct calculation order.
   *
   * @param changedCells - Array of cell references that changed
   * @returns Array of formula cells to recalculate, in order
   */
  getCellsToRecalculate(changedCells: string[]): string[] {
    const affectedCells = this.graph.getCalculationOrder(changedCells);

    // Return only formula cells that need recalculation (NodeId[] -> string[])
    return affectedCells.filter(cell => this.formulas.has(cell as string)) as string[];
  }

  /**
   * Get direct dependencies of a cell
   *
   * @param cell - Cell reference
   * @returns Array of cell references this cell depends on
   */
  getDependencies(cell: string): string[] {
    return this.graph.getDependencies(cell) as string[];
  }

  /**
   * Get direct dependents of a cell
   *
   * @param cell - Cell reference
   * @returns Array of cell references that depend on this cell
   */
  getDependents(cell: string): string[] {
    return this.graph.getDependents(cell) as string[];
  }

  /**
   * Get all transitive dependencies (recursive)
   *
   * @param cell - Cell reference
   * @returns Array of all cells this cell transitively depends on
   */
  getTransitiveDependencies(cell: string): string[] {
    return this.graph.getTransitiveDependencies(cell) as string[];
  }

  /**
   * Get all transitive dependents (recursive)
   *
   * @param cell - Cell reference
   * @returns Array of all cells that transitively depend on this cell
   */
  getTransitiveDependents(cell: string): string[] {
    return this.graph.getTransitiveDependents(cell) as string[];
  }

  /**
   * Check if adding a dependency would create a cycle
   *
   * @param cell - Dependent cell
   * @param dependency - Dependency cell
   * @returns true if would create cycle
   */
  wouldCreateCycle(cell: string, dependency: string): boolean {
    return this.graph.wouldCreateCycle(cell, dependency);
  }

  /**
   * Detect all circular references in current formulas
   *
   * @returns Array of cycles, where each cycle is an array of cell references
   */
  detectCircularReferences(): string[][] {
    return this.graph.detectCycles() as string[][];
  }

  /**
   * Get statistics about the formula graph
   */
  getStats(): {
    formulaCount: number;
    dependencyCount: number;
    maxDepth: number;
  } {
    const stats = this.graph.getStats();

    return {
      formulaCount: this.formulas.size,
      dependencyCount: stats.edgeCount,
      maxDepth: stats.maxDepth,
    };
  }

  /**
   * Clear all formulas
   */
  clear(): void {
    this.graph.clear();
    this.formulas.clear();
  }
}
