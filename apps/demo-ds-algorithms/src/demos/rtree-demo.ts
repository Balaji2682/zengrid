import type { Zengrid } from '@zengrid/core';

export function initRTreeDemo(grid: Zengrid) {
  const rtreeInitBtn = document.getElementById('rtree-init') as HTMLButtonElement;
  const hitTestOutput = document.getElementById('hit-test-output') as HTMLDivElement;
  const rtreeCells = document.getElementById('rtree-cells') as HTMLDivElement;
  const rtreeHits = document.getElementById('rtree-hits') as HTMLDivElement;

  let hitCount = 0;

  rtreeInitBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.border = '2px solid #3498db';
    canvas.style.cursor = 'crosshair';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d')!;

    const cellWidth = 50;
    const cellHeight = 30;
    const visibleCols = Math.floor(canvas.width / cellWidth);
    const visibleRows = Math.floor(canvas.height / cellHeight);

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let row = 0; row < visibleRows; row++) {
      for (let col = 0; col < visibleCols; col++) {
        ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);

        if (row % 5 === 0 && col % 4 === 0) {
          ctx.fillStyle = '#999';
          ctx.font = '10px monospace';
          ctx.fillText(`R${row}C${col}`, col * cellWidth + 2, row * cellHeight + 12);
        }
      }
    }

    hitTestOutput.innerHTML = '';
    hitTestOutput.appendChild(canvas);

    const info = document.createElement('div');
    info.style.marginTop = '10px';
    info.style.fontFamily = 'monospace';
    info.style.fontSize = '12px';
    info.id = 'hit-info';
    info.textContent = 'Click on the grid to test hit detection. Each cell is 50×30px.';
    hitTestOutput.appendChild(info);

    for (let row = 0; row < 100; row++) {
      for (let col = 0; col < 100; col++) {
        const rect = {
          minX: col * cellWidth,
          minY: row * cellHeight,
          maxX: (col + 1) * cellWidth,
          maxY: (row + 1) * cellHeight,
        };
        grid.spatialHitTester.registerCell(row, col, rect);
      }
    }

    rtreeCells.textContent = '10,000';

    rtreeInitBtn.textContent = '✓ Initialized!';
    rtreeInitBtn.disabled = true;

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const start = performance.now();
      const cell = grid.spatialHitTester.getCellAtPoint(x, y);
      const end = performance.now();

      hitCount++;
      rtreeHits.textContent = hitCount.toString();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      for (let row = 0; row < visibleRows; row++) {
        for (let col = 0; col < visibleCols; col++) {
          ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
          if (row % 5 === 0 && col % 4 === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '10px monospace';
            ctx.fillText(`R${row}C${col}`, col * cellWidth + 2, row * cellHeight + 12);
          }
        }
      }

      if (cell) {
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.fillRect(cell.col * cellWidth, cell.row * cellHeight, cellWidth, cellHeight);

        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.strokeRect(cell.col * cellWidth, cell.row * cellHeight, cellWidth, cellHeight);

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        const expectedCol = Math.floor(x / cellWidth);
        const expectedRow = Math.floor(y / cellHeight);
        const isCorrect = cell.row === expectedRow && cell.col === expectedCol;

        info.innerHTML = `
          <strong style="color: ${isCorrect ? '#27ae60' : '#e74c3c'}">
            ${isCorrect ? '✓ CORRECT!' : '✗ MISMATCH!'}
          </strong><br>
          Click Position: (${x.toFixed(0)}, ${y.toFixed(0)})<br>
          <strong>RTree Result:</strong> Row ${cell.row}, Col ${cell.col}<br>
          <strong>Expected:</strong> Row ${expectedRow}, Col ${expectedCol}<br>
          <strong>Cell Bounds:</strong> X[${cell.col * cellWidth}, ${(cell.col + 1) * cellWidth}], Y[${cell.row * cellHeight}, ${(cell.row + 1) * cellHeight}]<br>
          <strong>Lookup Time:</strong> ${(end - start).toFixed(4)}ms<br>
          Total Clicks: ${hitCount}
        `;
      } else {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        info.innerHTML = `
          <strong style="color: #e74c3c">✗ No cell detected</strong><br>
          Click Position: (${x.toFixed(0)}, ${y.toFixed(0)})<br>
          This position is outside the registered grid area.
        `;
      }
    });
  });
}
