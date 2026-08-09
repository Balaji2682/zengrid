import { resolveColumnGroupCells } from './col-group';

// Five columns, 100px each.
const widthOf = () => 100;

describe('resolveColumnGroupCells', () => {
  it('resolves x and width from the spanned column range', () => {
    const resolved = resolveColumnGroupCells(
      [
        { label: 'A', startCol: 0, endCol: 2, level: 0 },
        { label: 'B', startCol: 2, endCol: 5, level: 0 },
      ],
      widthOf,
      5
    );
    expect(resolved[0]).toMatchObject({ label: 'A', x: 0, width: 200 });
    expect(resolved[1]).toMatchObject({ label: 'B', x: 200, width: 300 });
  });

  it('drops empty (start === end) spans', () => {
    const resolved = resolveColumnGroupCells(
      [{ label: 'Z', startCol: 1, endCol: 1, level: 0 }],
      widthOf,
      5
    );
    expect(resolved).toEqual([]);
  });

  it('clamps a span that runs past the last column', () => {
    const resolved = resolveColumnGroupCells(
      [{ label: 'Tail', startCol: 3, endCol: 99, level: 0 }],
      widthOf,
      5
    );
    expect(resolved[0]).toMatchObject({ x: 300, width: 200 });
  });
});
