import { UniformHeightProvider } from './uniform-height-provider';
import { VariableHeightProvider } from './variable-height-provider';

describe('UniformHeightProvider', () => {
  describe('constructor', () => {
    it('should create with valid height and length', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.length).toBe(100);
    });

    it('should throw on negative height', () => {
      expect(() => new UniformHeightProvider(-1, 100)).toThrow(
        'Height must be positive'
      );
    });

    it('should throw on zero height', () => {
      expect(() => new UniformHeightProvider(0, 100)).toThrow(
        'Height must be positive'
      );
    });

    it('should throw on negative row count', () => {
      expect(() => new UniformHeightProvider(30, -1)).toThrow(
        'Row count must be non-negative'
      );
    });

    it('should allow zero rows', () => {
      const provider = new UniformHeightProvider(30, 0);
      expect(provider.length).toBe(0);
    });
  });

  describe('getHeight', () => {
    it('should return uniform height for any row', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.getHeight(0)).toBe(30);
      expect(provider.getHeight(50)).toBe(30);
      expect(provider.getHeight(99)).toBe(30);
    });

    it('should throw on negative index', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(() => provider.getHeight(-1)).toThrow('out of bounds');
    });

    it('should throw on index >= length', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(() => provider.getHeight(100)).toThrow('out of bounds');
    });
  });

  describe('getOffset', () => {
    it('should return 0 for index 0', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.getOffset(0)).toBe(0);
    });

    it('should return index * height', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.getOffset(1)).toBe(30);
      expect(provider.getOffset(10)).toBe(300);
      expect(provider.getOffset(50)).toBe(1500);
    });

    it('should allow index = length (end offset)', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.getOffset(100)).toBe(3000);
    });

    it('should throw on negative index', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(() => provider.getOffset(-1)).toThrow('out of bounds');
    });

    it('should throw on index > length', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(() => provider.getOffset(101)).toThrow('out of bounds');
    });
  });

  describe('getTotalHeight', () => {
    it('should return length * height', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.getTotalHeight()).toBe(3000);
    });

    it('should return 0 for zero rows', () => {
      const provider = new UniformHeightProvider(30, 0);
      expect(provider.getTotalHeight()).toBe(0);
    });
  });

  describe('findIndexAtOffset', () => {
    it('should return 0 for negative offset', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.findIndexAtOffset(-10)).toBe(0);
    });

    it('should return 0 for offset 0', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.findIndexAtOffset(0)).toBe(0);
    });

    it('should return length for offset >= totalHeight', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.findIndexAtOffset(3000)).toBe(100);
      expect(provider.findIndexAtOffset(5000)).toBe(100);
    });

    it('should find correct index for exact offset', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.findIndexAtOffset(60)).toBe(2);
      expect(provider.findIndexAtOffset(300)).toBe(10);
    });

    it('should find correct index for mid-row offset', () => {
      const provider = new UniformHeightProvider(30, 100);
      expect(provider.findIndexAtOffset(45)).toBe(1); // 45 is in row 1 (30-60)
      expect(provider.findIndexAtOffset(75)).toBe(2); // 75 is in row 2 (60-90)
    });

    it('should return 0 for empty provider', () => {
      const provider = new UniformHeightProvider(30, 0);
      expect(provider.findIndexAtOffset(100)).toBe(0);
    });
  });
});

describe('VariableHeightProvider', () => {
  describe('constructor', () => {
    it('should create with array of heights', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);
      expect(provider.length).toBe(3);
    });

    it('should throw if any height is negative', () => {
      expect(() => new VariableHeightProvider([30, -1, 50])).toThrow(
        'All heights must be non-negative'
      );
    });

    it('should allow zero heights', () => {
      const provider = new VariableHeightProvider([0, 30, 0]);
      expect(provider.length).toBe(3);
    });

    it('should create empty provider', () => {
      const provider = new VariableHeightProvider([]);
      expect(provider.length).toBe(0);
    });
  });

  describe('getHeight', () => {
    it('should return correct height for each row', () => {
      const provider = new VariableHeightProvider([30, 40, 50, 30, 60]);
      expect(provider.getHeight(0)).toBe(30);
      expect(provider.getHeight(1)).toBe(40);
      expect(provider.getHeight(2)).toBe(50);
      expect(provider.getHeight(3)).toBe(30);
      expect(provider.getHeight(4)).toBe(60);
    });

    it('should throw on out of bounds', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);
      expect(() => provider.getHeight(-1)).toThrow('out of bounds');
      expect(() => provider.getHeight(3)).toThrow('out of bounds');
    });
  });

  describe('getOffset', () => {
    it('should return 0 for index 0', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);
      expect(provider.getOffset(0)).toBe(0);
    });

    it('should return cumulative sum up to index', () => {
      const provider = new VariableHeightProvider([30, 40, 50, 30, 60]);
      expect(provider.getOffset(1)).toBe(30);
      expect(provider.getOffset(2)).toBe(70); // 30 + 40
      expect(provider.getOffset(3)).toBe(120); // 30 + 40 + 50
      expect(provider.getOffset(4)).toBe(150); // 30 + 40 + 50 + 30
      expect(provider.getOffset(5)).toBe(210); // Total
    });

    it('should allow index = length', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);
      expect(provider.getOffset(3)).toBe(120);
    });

    it('should throw on out of bounds', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);
      expect(() => provider.getOffset(-1)).toThrow('out of bounds');
      expect(() => provider.getOffset(4)).toThrow('out of bounds');
    });
  });

  describe('getTotalHeight', () => {
    it('should return sum of all heights', () => {
      const provider = new VariableHeightProvider([30, 40, 50, 30, 60]);
      expect(provider.getTotalHeight()).toBe(210);
    });

    it('should return 0 for empty provider', () => {
      const provider = new VariableHeightProvider([]);
      expect(provider.getTotalHeight()).toBe(0);
    });

    it('should handle all zeros', () => {
      const provider = new VariableHeightProvider([0, 0, 0]);
      expect(provider.getTotalHeight()).toBe(0);
    });
  });

  describe('findIndexAtOffset', () => {
    const provider = new VariableHeightProvider([30, 40, 50, 30, 60]);

    it('should return 0 for negative offset', () => {
      expect(provider.findIndexAtOffset(-10)).toBe(0);
    });

    it('should return 0 for offset 0', () => {
      expect(provider.findIndexAtOffset(0)).toBe(0);
    });

    it('should return length for offset >= totalHeight', () => {
      expect(provider.findIndexAtOffset(210)).toBe(5);
      expect(provider.findIndexAtOffset(1000)).toBe(5);
    });

    it('should find correct index for exact offset boundaries', () => {
      expect(provider.findIndexAtOffset(0)).toBe(0); // Row 0 starts
      expect(provider.findIndexAtOffset(30)).toBe(1); // Row 1 starts
      expect(provider.findIndexAtOffset(70)).toBe(2); // Row 2 starts
      expect(provider.findIndexAtOffset(120)).toBe(3); // Row 3 starts
      expect(provider.findIndexAtOffset(150)).toBe(4); // Row 4 starts
    });

    it('should find correct index for mid-row offsets', () => {
      expect(provider.findIndexAtOffset(15)).toBe(0); // Within row 0 (0-30)
      expect(provider.findIndexAtOffset(50)).toBe(1); // Within row 1 (30-70)
      expect(provider.findIndexAtOffset(100)).toBe(2); // Within row 2 (70-120)
      expect(provider.findIndexAtOffset(130)).toBe(3); // Within row 3 (120-150)
      expect(provider.findIndexAtOffset(180)).toBe(4); // Within row 4 (150-210)
    });

    it('should handle all zeros', () => {
      const zeros = new VariableHeightProvider([0, 0, 0]);
      expect(zeros.findIndexAtOffset(0)).toBe(0);
      expect(zeros.findIndexAtOffset(100)).toBe(0); // Total is 0, return 0
    });

    it('should return 0 for empty provider', () => {
      const empty = new VariableHeightProvider([]);
      expect(empty.findIndexAtOffset(100)).toBe(0);
    });
  });

  describe('setHeight', () => {
    it('should update height and offsets', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);

      provider.setHeight(1, 60); // Change 40 to 60

      expect(provider.getHeight(1)).toBe(60);
      expect(provider.getOffset(2)).toBe(90); // 30 + 60
      expect(provider.getTotalHeight()).toBe(140); // 30 + 60 + 50
    });

    it('should throw on negative height', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);
      expect(() => provider.setHeight(1, -1)).toThrow('must be non-negative');
    });

    it('should allow zero height', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);
      provider.setHeight(1, 0);
      expect(provider.getHeight(1)).toBe(0);
      expect(provider.getTotalHeight()).toBe(80);
    });

    it('should throw on out of bounds', () => {
      const provider = new VariableHeightProvider([30, 40, 50]);
      expect(() => provider.setHeight(-1, 30)).toThrow('out of bounds');
      expect(() => provider.setHeight(3, 30)).toThrow('out of bounds');
    });
  });
});
