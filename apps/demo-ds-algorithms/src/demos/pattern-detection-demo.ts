import type { Zengrid } from '@zengrid/core';

export function initPatternDetectionDemo(grid: Zengrid) {
  const patternInput = document.getElementById('pattern-input') as HTMLInputElement;
  const patternLength = document.getElementById('pattern-length') as HTMLInputElement;
  const patternPreviewBtn = document.getElementById('pattern-preview-btn') as HTMLButtonElement;
  const patternPreset1 = document.getElementById('pattern-preset1') as HTMLButtonElement;
  const patternPreset2 = document.getElementById('pattern-preset2') as HTMLButtonElement;
  const patternPreset3 = document.getElementById('pattern-preset3') as HTMLButtonElement;
  const patternResult = document.getElementById('pattern-result') as HTMLDivElement;
  const patternType = document.getElementById('pattern-type') as HTMLDivElement;
  const patternConfidence = document.getElementById('pattern-confidence') as HTMLDivElement;

  function previewPattern() {
    const input = patternInput.value;
    const length = parseInt(patternLength.value, 10);

    const sourceValues = input.split(',').map(v => {
      const trimmed = v.trim();
      const num = Number(trimmed);
      return isNaN(num) ? trimmed : num;
    });

    const preview = grid.autofillManager.previewFill(sourceValues, length);

    patternType.textContent = preview.patternType;
    patternConfidence.textContent = `${(preview.confidence * 100).toFixed(0)}%`;

    let output = `Pattern: ${preview.pattern}\n`;
    output += `Confidence: ${(preview.confidence * 100).toFixed(0)}%\n\n`;
    output += `Source: [${sourceValues.join(', ')}]\n\n`;
    output += `Autofilled to ${length} values:\n`;
    output += `[${preview.values.join(', ')}]`;

    patternResult.textContent = output;
  }

  patternPreviewBtn.addEventListener('click', previewPattern);

  patternPreset1.addEventListener('click', () => {
    patternInput.value = '1,2,3';
    patternLength.value = '10';
    previewPattern();
  });

  patternPreset2.addEventListener('click', () => {
    patternInput.value = '2,4,8';
    patternLength.value = '10';
    previewPattern();
  });

  patternPreset3.addEventListener('click', () => {
    patternInput.value = 'Item 1,Item 2,Item 3';
    patternLength.value = '10';
    previewPattern();
  });
}
