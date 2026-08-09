import { resolveColumnPin } from './col-pin';

// Six columns, 100px each. widthOf just returns 100 for any index.
const widthOf = () => 100;

describe('resolveColumnPin', () => {
  it('reports no pins when both bands are empty', () => {
    const r = resolveColumnPin({ left: [], right: [] }, widthOf);
    expect(r.hasPins).toBe(false);
    expect(r.sideOf(0)).toBeNull();
  });

  it('sums the left band width and offsets each pinned column', () => {
    const r = resolveColumnPin({ left: [0, 1], right: [] }, widthOf);
    expect(r.hasPins).toBe(true);
    expect(r.leftBandWidth).toBe(200);
    expect(r.sideOf(0)).toBe('left');
    expect(r.sideOf(1)).toBe('left');
    expect(r.sideOf(2)).toBeNull();
    // Left cells stick at scrollLeft + their offset within the band.
    expect(r.stickyLeft(0, 500, 800)).toBe(500);
    expect(r.stickyLeft(1, 500, 800)).toBe(600);
  });

  it('anchors the right band to the viewport edge', () => {
    const r = resolveColumnPin({ left: [], right: [4, 5] }, widthOf);
    expect(r.rightBandWidth).toBe(200);
    expect(r.sideOf(4)).toBe('right');
    // viewport 800, right band 200 → first right cell at scrollLeft + 800 - 200.
    expect(r.stickyLeft(4, 500, 800)).toBe(500 + 800 - 200);
    expect(r.stickyLeft(5, 500, 800)).toBe(500 + 800 - 200 + 100);
  });

  it('handles both bands at once', () => {
    const r = resolveColumnPin({ left: [0], right: [5] }, widthOf);
    expect(r.leftBandWidth).toBe(100);
    expect(r.rightBandWidth).toBe(100);
    expect(r.stickyLeft(0, 0, 640)).toBe(0);
    expect(r.stickyLeft(5, 0, 640)).toBe(640 - 100);
  });

  it('gives scroll-independent band-local offsets for sticky bands', () => {
    const r = resolveColumnPin({ left: [0, 1], right: [4, 5] }, widthOf);
    // Left band: offset from the left edge of the (left:0) band.
    expect(r.bandLeft(0)).toBe(0);
    expect(r.bandLeft(1)).toBe(100);
    // Right band (width 200), placed inside a (right:0) band whose origin is the
    // right edge: cells sit at their offset minus the band width (negative).
    expect(r.bandLeft(4)).toBe(0 - 200);
    expect(r.bandLeft(5)).toBe(100 - 200);
    // Non-pinned columns have no band offset.
    expect(r.bandLeft(2)).toBe(0);
  });
});
