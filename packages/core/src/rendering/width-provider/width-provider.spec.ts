import { UniformWidthProvider } from './uniform-width-provider';
import { VariableWidthProvider } from './variable-width-provider';

describe('UniformWidthProvider', () => {
  describe('constructor', () => {
    it('should create with valid width and length', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.length).toBe(50);
    });

    it('should throw on negative width', () => {
      expect(() => new UniformWidthProvider(-1, 50)).toThrow(
        'Width must be positive'
      );
    });

    it('should throw on zero width', () => {
      expect(() => new UniformWidthProvider(0, 50)).toThrow(
        'Width must be positive'
      );
    });

    it('should throw on negative column count', () => {
      expect(() => new UniformWidthProvider(100, -1)).toThrow(
        'Column count must be non-negative'
      );
    });

    it('should allow zero columns', () => {
      const provider = new UniformWidthProvider(100, 0);
      expect(provider.length).toBe(0);
    });
  });

  describe('getWidth', () => {
    it('should return uniform width for any column', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.getWidth(0)).toBe(100);
      expect(provider.getWidth(25)).toBe(100);
      expect(provider.getWidth(49)).toBe(100);
    });

    it('should throw on negative index', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(() => provider.getWidth(-1)).toThrow('out of bounds');
    });

    it('should throw on index >= length', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(() => provider.getWidth(50)).toThrow('out of bounds');
    });
  });

  describe('getOffset', () => {
    it('should return 0 for index 0', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.getOffset(0)).toBe(0);
    });

    it('should return index * width', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.getOffset(1)).toBe(100);
      expect(provider.getOffset(10)).toBe(1000);
      expect(provider.getOffset(25)).toBe(2500);
    });

    it('should allow index = length (end offset)', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.getOffset(50)).toBe(5000);
    });

    it('should throw on negative index', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(() => provider.getOffset(-1)).toThrow('out of bounds');
    });

    it('should throw on index > length', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(() => provider.getOffset(51)).toThrow('out of bounds');
    });
  });

  describe('getTotalWidth', () => {
    it('should return length * width', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.getTotalWidth()).toBe(5000);
    });

    it('should return 0 for zero columns', () => {
      const provider = new UniformWidthProvider(100, 0);
      expect(provider.getTotalWidth()).toBe(0);
    });
  });

  describe('findIndexAtOffset', () => {
    it('should return 0 for negative offset', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.findIndexAtOffset(-10)).toBe(0);
    });

    it('should return 0 for offset 0', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.findIndexAtOffset(0)).toBe(0);
    });

    it('should return length for offset >= totalWidth', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.findIndexAtOffset(5000)).toBe(50);
      expect(provider.findIndexAtOffset(10000)).toBe(50);
    });

    it('should find correct index for exact offset', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.findIndexAtOffset(200)).toBe(2);
      expect(provider.findIndexAtOffset(1000)).toBe(10);
    });

    it('should find correct index for mid-column offset', () => {
      const provider = new UniformWidthProvider(100, 50);
      expect(provider.findIndexAtOffset(150)).toBe(1); // 150 is in column 1 (100-200)
      expect(provider.findIndexAtOffset(550)).toBe(5); // 550 is in column 5 (500-600)
    });

    it('should return 0 for empty provider', () => {
      const provider = new UniformWidthProvider(100, 0);
      expect(provider.findIndexAtOffset(100)).toBe(0);
    });
  });
});

describe('VariableWidthProvider', () => {
  describe('constructor', () => {
    it('should create with array of widths', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);
      expect(provider.length).toBe(3);
    });

    it('should throw if any width is negative', () => {
      expect(() => new VariableWidthProvider([100, -1, 200])).toThrow(
        'All widths must be non-negative'
      );
    });

    it('should allow zero widths', () => {
      const provider = new VariableWidthProvider([0, 100, 0]);
      expect(provider.length).toBe(3);
    });

    it('should create empty provider', () => {
      const provider = new VariableWidthProvider([]);
      expect(provider.length).toBe(0);
    });
  });

  describe('getWidth', () => {
    it('should return correct width for each column', () => {
      const provider = new VariableWidthProvider([100, 150, 200, 100, 120]);
      expect(provider.getWidth(0)).toBe(100);
      expect(provider.getWidth(1)).toBe(150);
      expect(provider.getWidth(2)).toBe(200);
      expect(provider.getWidth(3)).toBe(100);
      expect(provider.getWidth(4)).toBe(120);
    });

    it('should throw on out of bounds', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);
      expect(() => provider.getWidth(-1)).toThrow('out of bounds');
      expect(() => provider.getWidth(3)).toThrow('out of bounds');
    });
  });

  describe('getOffset', () => {
    it('should return 0 for index 0', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);
      expect(provider.getOffset(0)).toBe(0);
    });

    it('should return cumulative sum up to index', () => {
      const provider = new VariableWidthProvider([100, 150, 200, 100, 120]);
      expect(provider.getOffset(1)).toBe(100);
      expect(provider.getOffset(2)).toBe(250); // 100 + 150
      expect(provider.getOffset(3)).toBe(450); // 100 + 150 + 200
      expect(provider.getOffset(4)).toBe(550); // 100 + 150 + 200 + 100
      expect(provider.getOffset(5)).toBe(670); // Total
    });

    it('should allow index = length', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);
      expect(provider.getOffset(3)).toBe(450);
    });

    it('should throw on out of bounds', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);
      expect(() => provider.getOffset(-1)).toThrow('out of bounds');
      expect(() => provider.getOffset(4)).toThrow('out of bounds');
    });
  });

  describe('getTotalWidth', () => {
    it('should return sum of all widths', () => {
      const provider = new VariableWidthProvider([100, 150, 200, 100, 120]);
      expect(provider.getTotalWidth()).toBe(670);
    });

    it('should return 0 for empty provider', () => {
      const provider = new VariableWidthProvider([]);
      expect(provider.getTotalWidth()).toBe(0);
    });

    it('should handle all zeros', () => {
      const provider = new VariableWidthProvider([0, 0, 0]);
      expect(provider.getTotalWidth()).toBe(0);
    });
  });

  describe('findIndexAtOffset', () => {
    const provider = new VariableWidthProvider([100, 150, 200, 100, 120]);

    it('should return 0 for negative offset', () => {
      expect(provider.findIndexAtOffset(-10)).toBe(0);
    });

    it('should return 0 for offset 0', () => {
      expect(provider.findIndexAtOffset(0)).toBe(0);
    });

    it('should return length for offset >= totalWidth', () => {
      expect(provider.findIndexAtOffset(670)).toBe(5);
      expect(provider.findIndexAtOffset(1000)).toBe(5);
    });

    it('should find correct index for exact offset boundaries', () => {
      expect(provider.findIndexAtOffset(0)).toBe(0); // Column 0 starts
      expect(provider.findIndexAtOffset(100)).toBe(1); // Column 1 starts
      expect(provider.findIndexAtOffset(250)).toBe(2); // Column 2 starts
      expect(provider.findIndexAtOffset(450)).toBe(3); // Column 3 starts
      expect(provider.findIndexAtOffset(550)).toBe(4); // Column 4 starts
    });

    it('should find correct index for mid-column offsets', () => {
      expect(provider.findIndexAtOffset(50)).toBe(0); // Within column 0 (0-100)
      expect(provider.findIndexAtOffset(180)).toBe(1); // Within column 1 (100-250)
      expect(provider.findIndexAtOffset(350)).toBe(2); // Within column 2 (250-450)
      expect(provider.findIndexAtOffset(480)).toBe(3); // Within column 3 (450-550)
      expect(provider.findIndexAtOffset(600)).toBe(4); // Within column 4 (550-670)
    });

    it('should handle all zeros', () => {
      const zeros = new VariableWidthProvider([0, 0, 0]);
      expect(zeros.findIndexAtOffset(0)).toBe(0);
      expect(zeros.findIndexAtOffset(100)).toBe(0); // Total is 0, return 0
    });

    it('should return 0 for empty provider', () => {
      const empty = new VariableWidthProvider([]);
      expect(empty.findIndexAtOffset(100)).toBe(0);
    });
  });

  describe('setWidth', () => {
    it('should update width and offsets', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);

      provider.setWidth(1, 180); // Change 150 to 180

      expect(provider.getWidth(1)).toBe(180);
      expect(provider.getOffset(2)).toBe(280); // 100 + 180
      expect(provider.getTotalWidth()).toBe(480); // 100 + 180 + 200
    });

    it('should throw on negative width', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);
      expect(() => provider.setWidth(1, -1)).toThrow('must be non-negative');
    });

    it('should allow zero width', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);
      provider.setWidth(1, 0);
      expect(provider.getWidth(1)).toBe(0);
      expect(provider.getTotalWidth()).toBe(300);
    });

    it('should throw on out of bounds', () => {
      const provider = new VariableWidthProvider([100, 150, 200]);
      expect(() => provider.setWidth(-1, 100)).toThrow('out of bounds');
      expect(() => provider.setWidth(3, 100)).toThrow('out of bounds');
    });
  });
});
