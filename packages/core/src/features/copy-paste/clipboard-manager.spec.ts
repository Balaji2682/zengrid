import { ClipboardManager } from './clipboard-manager';
import type { CellRange } from '../../types';

describe('ClipboardManager.copy', () => {
  const grid = [
    ['a0', 'b0', 'c0'],
    ['a1', 'b1', 'c1'],
    ['a2', 'b2', 'c2'],
    ['a3', 'b3', 'c3'],
    ['a4', 'b4', 'c4'],
  ];

  let writeText: jest.Mock;

  function makeManager(): ClipboardManager {
    return new ClipboardManager({
      getValue: (row, col) => grid[row]?.[col],
      setValue: () => {},
      getRowCount: () => grid.length,
      getColumnCount: () => grid[0].length,
    });
  }

  beforeEach(() => {
    // Force the writeText fallback so we can assert the exact TSV string
    // (jsdom does not implement Blob.text(), so ClipboardItem is unreliable here).
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: jest.fn().mockRejectedValue(new Error('no ClipboardItem')), writeText },
      configurable: true,
    });
    (globalThis as any).ClipboardItem = class {
      constructor(public data: unknown) {}
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('copies a single dense range as a rectangle', async () => {
    await makeManager().copy([{ startRow: 0, startCol: 0, endRow: 1, endCol: 1 }]);
    expect(writeText).toHaveBeenCalledWith('a0\tb0\na1\tb1');
  });

  it('copies multiple discontiguous cells onto their bounding box with empty gaps', async () => {
    const ranges: CellRange[] = [
      { startRow: 0, startCol: 1, endRow: 0, endCol: 1 },
      { startRow: 2, startCol: 1, endRow: 2, endCol: 1 },
      { startRow: 4, startCol: 1, endRow: 4, endCol: 1 },
    ];
    await makeManager().copy(ranges);
    expect(writeText).toHaveBeenCalledWith('b0\n\nb2\n\nb4');
  });

  it('preserves relative column offsets across discontiguous cells', async () => {
    const ranges: CellRange[] = [
      { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      { startRow: 1, startCol: 2, endRow: 1, endCol: 2 },
    ];
    await makeManager().copy(ranges);
    // bounding box cols 0..2: row 0 = a0 then gaps; row 1 = gaps then c1
    expect(writeText).toHaveBeenCalledWith('a0\t\t\n\t\tc1');
  });
});
