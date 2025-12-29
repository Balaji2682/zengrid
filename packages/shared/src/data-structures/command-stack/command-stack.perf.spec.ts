import { CommandStack } from './command-stack';
import type { ICommand } from './command-stack.interface';

describe('CommandStack Performance', () => {
  // Helper to create a simple command
  const createCommand = (id: number): ICommand => ({
    description: `Command ${id}`,
    execute: () => {
      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += i;
      }
    },
    undo: () => {
      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += i;
      }
    },
  });

  it('should execute 10,000 commands in reasonable time', () => {
    const stack = new CommandStack({ maxSize: 10000 });
    const count = 10000;

    const start = performance.now();

    for (let i = 0; i < count; i++) {
      stack.execute(createCommand(i));
    }

    const duration = performance.now() - start;

    expect(stack.getUndoCount()).toBe(count);
    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    console.log(`Execute ${count} commands: ${duration.toFixed(2)}ms`);
  });

  it('should undo 10,000 commands in reasonable time', () => {
    const stack = new CommandStack({ maxSize: 10000 });
    const count = 10000;

    for (let i = 0; i < count; i++) {
      stack.execute(createCommand(i));
    }

    const start = performance.now();

    for (let i = 0; i < count; i++) {
      stack.undo();
    }

    const duration = performance.now() - start;

    expect(stack.getUndoCount()).toBe(0);
    expect(stack.getRedoCount()).toBe(count);
    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    console.log(`Undo ${count} commands: ${duration.toFixed(2)}ms`);
  });

  it('should redo 10,000 commands in reasonable time', () => {
    const stack = new CommandStack({ maxSize: 10000 });
    const count = 10000;

    for (let i = 0; i < count; i++) {
      stack.execute(createCommand(i));
    }

    for (let i = 0; i < count; i++) {
      stack.undo();
    }

    const start = performance.now();

    for (let i = 0; i < count; i++) {
      stack.redo();
    }

    const duration = performance.now() - start;

    expect(stack.getUndoCount()).toBe(count);
    expect(stack.getRedoCount()).toBe(0);
    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    console.log(`Redo ${count} commands: ${duration.toFixed(2)}ms`);
  });

  it('should handle mixed operations efficiently', () => {
    const stack = new CommandStack({ maxSize: 10000 });
    const iterations = 1000;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      // Execute 10 commands
      for (let j = 0; j < 10; j++) {
        stack.execute(createCommand(i * 10 + j));
      }

      // Undo 5 commands
      for (let j = 0; j < 5; j++) {
        stack.undo();
      }

      // Redo 3 commands
      for (let j = 0; j < 3; j++) {
        stack.redo();
      }
    }

    const duration = performance.now() - start;

    // Each iteration: +10 -5 +3 = +8 commands
    expect(stack.getUndoCount()).toBe(iterations * 8);
    expect(duration).toBeLessThan(100);
    console.log(
      `Mixed operations (${iterations} iterations): ${duration.toFixed(2)}ms`
    );
  });

  it('should enforce maxSize efficiently', () => {
    const stack = new CommandStack({ maxSize: 100 });
    const count = 10000;

    const start = performance.now();

    for (let i = 0; i < count; i++) {
      stack.execute(createCommand(i));
    }

    const duration = performance.now() - start;

    expect(stack.getUndoCount()).toBe(100);
    expect(duration).toBeLessThan(100);
    console.log(
      `Execute ${count} commands with maxSize=100: ${duration.toFixed(2)}ms`
    );
  });

  it('should handle canUndo/canRedo checks efficiently', () => {
    const stack = new CommandStack({ maxSize: 1000 });

    for (let i = 0; i < 1000; i++) {
      stack.execute(createCommand(i));
    }

    const iterations = 100000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      stack.canUndo();
      stack.canRedo();
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10); // Should be very fast (O(1))
    console.log(
      `${iterations * 2} canUndo/canRedo checks: ${duration.toFixed(2)}ms`
    );
  });

  it('should retrieve history efficiently', () => {
    const stack = new CommandStack({ maxSize: 1000 });

    for (let i = 0; i < 1000; i++) {
      stack.execute(createCommand(i));
    }

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      stack.getUndoHistory();
      stack.getRedoHistory();
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
    console.log(
      `${iterations * 2} history retrievals: ${duration.toFixed(2)}ms`
    );
  });

  it('should clear large stacks efficiently', () => {
    const stack = new CommandStack({ maxSize: 10000 });

    for (let i = 0; i < 10000; i++) {
      stack.execute(createCommand(i));
    }

    for (let i = 0; i < 5000; i++) {
      stack.undo();
    }

    const start = performance.now();
    stack.clear();
    const duration = performance.now() - start;

    expect(stack.getUndoCount()).toBe(0);
    expect(stack.getRedoCount()).toBe(0);
    expect(duration).toBeLessThan(10); // Should be very fast
    console.log(`Clear stack with 15000 total commands: ${duration.toFixed(2)}ms`);
  });

  it('should measure memory efficiency with maxSize limit', () => {
    const stack = new CommandStack({ maxSize: 100 });

    // Execute way more commands than maxSize
    for (let i = 0; i < 100000; i++) {
      stack.execute(createCommand(i));
    }

    // Stack should only keep maxSize commands
    expect(stack.getUndoCount()).toBe(100);

    // Verify the oldest commands were removed
    const history = stack.getUndoHistory();
    expect(history[0]).toBe('Command 99900');
    expect(history[99]).toBe('Command 99999');
  });

  it('should benchmark different stack sizes', () => {
    const sizes = [100, 1000, 10000];
    const results: Record<number, number> = {};

    for (const size of sizes) {
      const stack = new CommandStack({ maxSize: size });
      const start = performance.now();

      // Execute commands up to size
      for (let i = 0; i < size; i++) {
        stack.execute(createCommand(i));
      }

      // Undo half
      for (let i = 0; i < size / 2; i++) {
        stack.undo();
      }

      // Redo half
      for (let i = 0; i < size / 2; i++) {
        stack.redo();
      }

      const duration = performance.now() - start;
      results[size] = duration;

      expect(stack.getUndoCount()).toBe(size);
      console.log(`Stack size ${size}: ${duration.toFixed(2)}ms`);
    }

    // Verify that operation time scales reasonably
    // O(n) is acceptable for n operations
    expect(results[1000]).toBeLessThan(results[100] * 20); // Allow some variance
    expect(results[10000]).toBeLessThan(results[1000] * 20);
  });

  it('should handle rapid alternating undo/redo efficiently', () => {
    const stack = new CommandStack({ maxSize: 1000 });

    // Set up initial state
    for (let i = 0; i < 100; i++) {
      stack.execute(createCommand(i));
    }

    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      stack.undo();
      stack.redo();
    }

    const duration = performance.now() - start;

    expect(stack.getUndoCount()).toBe(100);
    expect(duration).toBeLessThan(50);
    console.log(
      `${iterations} alternating undo/redo: ${duration.toFixed(2)}ms`
    );
  });
});
