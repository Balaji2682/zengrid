import type { Zengrid } from '@zengrid/core';

export function initDependencyGraphDemo(grid: Zengrid) {
  const formulaSelect = document.getElementById('formula-select') as HTMLSelectElement;
  const addFormulaBtn = document.getElementById('add-formula-btn') as HTMLButtonElement;
  const calculateOrderBtn = document.getElementById('calculate-order-btn') as HTMLButtonElement;
  const testCycleBtn = document.getElementById('test-cycle-btn') as HTMLButtonElement;
  const formulaGraph = document.getElementById('formula-graph') as HTMLDivElement;
  const formulaCount = document.getElementById('formula-count') as HTMLDivElement;
  const dependencyCount = document.getElementById('dependency-count') as HTMLDivElement;

  function updateFormulaStats() {
    const stats = grid.formulaCalculator.getStats();
    formulaCount.textContent = stats.formulaCount.toString();
    dependencyCount.textContent = stats.dependencyCount.toString();
  }

  function renderFormulaGraph() {
    const formulas = grid.formulaCalculator.getAllFormulaCells();

    if (formulas.length === 0) {
      formulaGraph.textContent = 'No formulas added yet. Use the controls to add formulas.';
      return;
    }

    let output = 'Formulas:\n';
    formulas.forEach(cell => {
      const formula = grid.formulaCalculator.getFormula(cell);
      const deps = grid.formulaCalculator.getDependencies(cell);
      output += `\n${cell} = ${formula?.formula}\n`;
      output += `  Dependencies: ${deps.join(', ') || 'none'}\n`;
    });

    formulaGraph.textContent = output;
  }

  addFormulaBtn.addEventListener('click', () => {
    const selected = formulaSelect.value;
    const [cell, expr] = selected.split('=');

    const depPattern = /([A-Z]\d+)/g;
    const deps = Array.from(expr.matchAll(depPattern)).map(m => m[1]).filter(d => d !== cell);

    try {
      grid.formulaCalculator.setFormula(cell, `=${expr}`, deps);
      renderFormulaGraph();
      updateFormulaStats();
      formulaGraph.style.color = '#27ae60';
    } catch (error: any) {
      formulaGraph.textContent = `❌ Error: ${error.message}`;
      formulaGraph.style.color = '#e74c3c';
    }
  });

  calculateOrderBtn.addEventListener('click', () => {
    try {
      const order = grid.formulaCalculator.getCalculationOrder();

      let output = '✓ Calculation Order (dependencies first):\n\n';
      order.forEach((cell, index) => {
        output += `${index + 1}. ${cell}\n`;
      });

      output += '\n💡 This is the correct order to evaluate formulas,\nensuring dependencies are calculated first!';

      formulaGraph.textContent = output;
      formulaGraph.style.color = '#27ae60';
    } catch (error: any) {
      formulaGraph.textContent = `❌ Error: ${error.message}`;
      formulaGraph.style.color = '#e74c3c';
    }
  });

  testCycleBtn.addEventListener('click', () => {
    try {
      grid.formulaCalculator.setFormula('A1', '=F1', ['F1']);

      formulaGraph.textContent = '✓ Formula added (no cycle detected yet)';
      renderFormulaGraph();
    } catch (error: any) {
      formulaGraph.textContent = `✓ CIRCULAR REFERENCE DETECTED!\n\n❌ ${error.message}\n\n💡 The DependencyGraph successfully prevented\nan invalid circular reference!`;
      formulaGraph.style.color = '#e74c3c';
    }
  });

  renderFormulaGraph();
  updateFormulaStats();
}
