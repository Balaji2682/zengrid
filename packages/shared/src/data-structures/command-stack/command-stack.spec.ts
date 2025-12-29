import { CommandStack } from './command-stack';
import type { ICommand } from './command-stack.interface';

describe('CommandStack', () => {
  // Helper to create a simple command
  const createCommand = (
    description: string,
    executeFn?: () => void,
    undoFn?: () => void,
    redoFn?: () => void
  ): ICommand => ({
    description,
    execute: executeFn || jest.fn(),
    undo: undoFn || jest.fn(),
    redo: redoFn,
  });

  describe('constructor', () => {
    it('should create a command stack with default maxSize', () => {
      const stack = new CommandStack();
      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(0);
    });

    it('should create a command stack with custom maxSize', () => {
      const stack = new CommandStack({ maxSize: 50 });
      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(0);
    });

    it('should throw error if maxSize is less than 1', () => {
      expect(() => new CommandStack({ maxSize: 0 })).toThrow(
        'maxSize must be at least 1'
      );
      expect(() => new CommandStack({ maxSize: -1 })).toThrow(
        'maxSize must be at least 1'
      );
    });

    it('should accept maxSize of 1', () => {
      expect(() => new CommandStack({ maxSize: 1 })).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should execute a command and add it to undo stack', () => {
      const stack = new CommandStack();
      const executeFn = jest.fn();
      const command = createCommand('Test', executeFn);

      stack.execute(command);

      expect(executeFn).toHaveBeenCalledTimes(1);
      expect(stack.canUndo()).toBe(true);
      expect(stack.getUndoCount()).toBe(1);
    });

    it('should clear redo stack when executing a new command', () => {
      const stack = new CommandStack();
      const cmd1 = createCommand('Cmd1');
      const cmd2 = createCommand('Cmd2');
      const cmd3 = createCommand('Cmd3');

      stack.execute(cmd1);
      stack.execute(cmd2);
      stack.undo();

      expect(stack.canRedo()).toBe(true);
      expect(stack.getRedoCount()).toBe(1);

      stack.execute(cmd3);

      expect(stack.canRedo()).toBe(false);
      expect(stack.getRedoCount()).toBe(0);
    });

    it('should enforce maxSize by removing oldest commands', () => {
      const stack = new CommandStack({ maxSize: 3 });

      for (let i = 0; i < 5; i++) {
        stack.execute(createCommand(`Cmd${i}`));
      }

      expect(stack.getUndoCount()).toBe(3);
      const history = stack.getUndoHistory();
      expect(history).toEqual(['Cmd2', 'Cmd3', 'Cmd4']);
    });

    it('should throw error when command is null or undefined', () => {
      const stack = new CommandStack();

      expect(() => stack.execute(null as any)).toThrow(
        'Command cannot be null or undefined'
      );
      expect(() => stack.execute(undefined as any)).toThrow(
        'Command cannot be null or undefined'
      );
    });

    it('should handle executing many commands', () => {
      const stack = new CommandStack({ maxSize: 1000 });

      for (let i = 0; i < 1000; i++) {
        stack.execute(createCommand(`Cmd${i}`));
      }

      expect(stack.getUndoCount()).toBe(1000);
    });
  });

  describe('undo', () => {
    it('should undo the last command', () => {
      const stack = new CommandStack();
      const undoFn = jest.fn();
      const command = createCommand('Test', undefined, undoFn);

      stack.execute(command);
      const result = stack.undo();

      expect(result).toBe(true);
      expect(undoFn).toHaveBeenCalledTimes(1);
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(true);
    });

    it('should move command to redo stack', () => {
      const stack = new CommandStack();
      const command = createCommand('Test');

      stack.execute(command);
      stack.undo();

      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(1);
    });

    it('should return false when nothing to undo', () => {
      const stack = new CommandStack();
      const result = stack.undo();

      expect(result).toBe(false);
    });

    it('should handle multiple undos', () => {
      const stack = new CommandStack();
      const undoFn1 = jest.fn();
      const undoFn2 = jest.fn();
      const undoFn3 = jest.fn();

      stack.execute(createCommand('Cmd1', undefined, undoFn1));
      stack.execute(createCommand('Cmd2', undefined, undoFn2));
      stack.execute(createCommand('Cmd3', undefined, undoFn3));

      stack.undo();
      stack.undo();
      stack.undo();

      expect(undoFn3).toHaveBeenCalledTimes(1);
      expect(undoFn2).toHaveBeenCalledTimes(1);
      expect(undoFn1).toHaveBeenCalledTimes(1);
      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(3);
    });
  });

  describe('redo', () => {
    it('should redo the last undone command using execute', () => {
      const stack = new CommandStack();
      const executeFn = jest.fn();
      const command = createCommand('Test', executeFn);

      stack.execute(command);
      stack.undo();

      const result = stack.redo();

      expect(result).toBe(true);
      expect(executeFn).toHaveBeenCalledTimes(2); // once for execute, once for redo
      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);
    });

    it('should use custom redo method if available', () => {
      const stack = new CommandStack();
      const executeFn = jest.fn();
      const redoFn = jest.fn();
      const command = createCommand('Test', executeFn, undefined, redoFn);

      stack.execute(command);
      stack.undo();
      stack.redo();

      expect(executeFn).toHaveBeenCalledTimes(1); // only initial execute
      expect(redoFn).toHaveBeenCalledTimes(1); // custom redo used
    });

    it('should return false when nothing to redo', () => {
      const stack = new CommandStack();
      const result = stack.redo();

      expect(result).toBe(false);
    });

    it('should handle multiple redos', () => {
      const stack = new CommandStack();

      stack.execute(createCommand('Cmd1'));
      stack.execute(createCommand('Cmd2'));
      stack.execute(createCommand('Cmd3'));

      stack.undo();
      stack.undo();
      stack.undo();

      stack.redo();
      stack.redo();
      stack.redo();

      expect(stack.getUndoCount()).toBe(3);
      expect(stack.getRedoCount()).toBe(0);
    });

    it('should move command back to undo stack', () => {
      const stack = new CommandStack();
      const command = createCommand('Test');

      stack.execute(command);
      stack.undo();
      stack.redo();

      expect(stack.getUndoCount()).toBe(1);
      expect(stack.getRedoCount()).toBe(0);
    });
  });

  describe('canUndo', () => {
    it('should return false when undo stack is empty', () => {
      const stack = new CommandStack();
      expect(stack.canUndo()).toBe(false);
    });

    it('should return true when undo stack has commands', () => {
      const stack = new CommandStack();
      stack.execute(createCommand('Test'));
      expect(stack.canUndo()).toBe(true);
    });
  });

  describe('canRedo', () => {
    it('should return false when redo stack is empty', () => {
      const stack = new CommandStack();
      expect(stack.canRedo()).toBe(false);
    });

    it('should return true when redo stack has commands', () => {
      const stack = new CommandStack();
      stack.execute(createCommand('Test'));
      stack.undo();
      expect(stack.canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear both undo and redo stacks', () => {
      const stack = new CommandStack();

      stack.execute(createCommand('Cmd1'));
      stack.execute(createCommand('Cmd2'));
      stack.undo();

      expect(stack.getUndoCount()).toBe(1);
      expect(stack.getRedoCount()).toBe(1);

      stack.clear();

      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(0);
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
    });

    it('should allow operations after clear', () => {
      const stack = new CommandStack();

      stack.execute(createCommand('Cmd1'));
      stack.clear();
      stack.execute(createCommand('Cmd2'));

      expect(stack.getUndoCount()).toBe(1);
      expect(stack.canUndo()).toBe(true);
    });
  });

  describe('getUndoCount and getRedoCount', () => {
    it('should return correct counts', () => {
      const stack = new CommandStack();

      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(0);

      stack.execute(createCommand('Cmd1'));
      stack.execute(createCommand('Cmd2'));

      expect(stack.getUndoCount()).toBe(2);
      expect(stack.getRedoCount()).toBe(0);

      stack.undo();

      expect(stack.getUndoCount()).toBe(1);
      expect(stack.getRedoCount()).toBe(1);
    });
  });

  describe('getUndoHistory and getRedoHistory', () => {
    it('should return command descriptions', () => {
      const stack = new CommandStack();

      stack.execute(createCommand('Add Item'));
      stack.execute(createCommand('Delete Item'));
      stack.execute(createCommand('Update Item'));

      const undoHistory = stack.getUndoHistory();
      expect(undoHistory).toEqual(['Add Item', 'Delete Item', 'Update Item']);

      stack.undo();
      const redoHistory = stack.getRedoHistory();
      expect(redoHistory).toEqual(['Update Item']);
    });

    it('should return default descriptions for commands without description', () => {
      const stack = new CommandStack();

      stack.execute({ execute: jest.fn(), undo: jest.fn() });
      stack.execute({ execute: jest.fn(), undo: jest.fn() });

      const history = stack.getUndoHistory();
      expect(history).toEqual(['Command 1', 'Command 2']);
    });

    it('should return empty arrays when stacks are empty', () => {
      const stack = new CommandStack();

      expect(stack.getUndoHistory()).toEqual([]);
      expect(stack.getRedoHistory()).toEqual([]);
    });
  });

  describe('complex scenarios', () => {
    it('should handle alternating execute and undo operations', () => {
      const stack = new CommandStack();

      stack.execute(createCommand('Cmd1'));
      expect(stack.getUndoCount()).toBe(1);

      stack.undo();
      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(1);

      stack.execute(createCommand('Cmd2'));
      expect(stack.getUndoCount()).toBe(1);
      expect(stack.getRedoCount()).toBe(0); // redo cleared
    });

    it('should handle undo/redo cycles', () => {
      const stack = new CommandStack();

      stack.execute(createCommand('Cmd1'));
      stack.execute(createCommand('Cmd2'));

      for (let i = 0; i < 5; i++) {
        stack.undo();
        stack.undo();
        stack.redo();
        stack.redo();
      }

      expect(stack.getUndoCount()).toBe(2);
      expect(stack.getRedoCount()).toBe(0);
    });

    it('should maintain state consistency during complex operations', () => {
      const stack = new CommandStack({ maxSize: 5 });

      // Execute 3 commands
      stack.execute(createCommand('Cmd1'));
      stack.execute(createCommand('Cmd2'));
      stack.execute(createCommand('Cmd3'));

      // Undo 2
      stack.undo();
      stack.undo();

      expect(stack.getUndoCount()).toBe(1);
      expect(stack.getRedoCount()).toBe(2);

      // Execute new command (should clear redo)
      stack.execute(createCommand('Cmd4'));

      expect(stack.getUndoCount()).toBe(2);
      expect(stack.getRedoCount()).toBe(0);

      // Redo should now fail
      expect(stack.redo()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle maxSize of 1', () => {
      const stack = new CommandStack({ maxSize: 1 });

      stack.execute(createCommand('Cmd1'));
      stack.execute(createCommand('Cmd2'));

      expect(stack.getUndoCount()).toBe(1);
      expect(stack.getUndoHistory()).toEqual(['Cmd2']);
    });

    it('should handle executing same command multiple times', () => {
      const stack = new CommandStack();
      const executeFn = jest.fn();
      const command = createCommand('Test', executeFn);

      stack.execute(command);
      stack.execute(command);
      stack.execute(command);

      expect(executeFn).toHaveBeenCalledTimes(3);
      expect(stack.getUndoCount()).toBe(3);
    });

    it('should handle commands with errors in execute', () => {
      const stack = new CommandStack();
      const errorCommand = createCommand('Error', () => {
        throw new Error('Execute failed');
      });

      expect(() => stack.execute(errorCommand)).toThrow('Execute failed');
      // Command should NOT be added if execute throws
      expect(stack.getUndoCount()).toBe(0);
    });

    it('should handle commands with errors in undo', () => {
      const stack = new CommandStack();
      const errorCommand = createCommand(
        'Error',
        jest.fn(),
        () => {
          throw new Error('Undo failed');
        }
      );

      stack.execute(errorCommand);

      expect(() => stack.undo()).toThrow('Undo failed');
      // If undo throws, command is removed from undoStack but not added to redoStack
      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(0);
    });

    it('should handle large number of operations', () => {
      const stack = new CommandStack({ maxSize: 10000 });
      const operations = 10000;

      for (let i = 0; i < operations; i++) {
        stack.execute(createCommand(`Cmd${i}`));
      }

      expect(stack.getUndoCount()).toBe(operations);

      for (let i = 0; i < operations; i++) {
        stack.undo();
      }

      expect(stack.getUndoCount()).toBe(0);
      expect(stack.getRedoCount()).toBe(operations);

      for (let i = 0; i < operations; i++) {
        stack.redo();
      }

      expect(stack.getUndoCount()).toBe(operations);
      expect(stack.getRedoCount()).toBe(0);
    });
  });

  describe('stateful command example', () => {
    it('should correctly undo/redo stateful operations', () => {
      const stack = new CommandStack();
      let value = 0;

      // Create increment command
      const increment = (amount: number): ICommand => ({
        description: `Increment by ${amount}`,
        execute: () => {
          value += amount;
        },
        undo: () => {
          value -= amount;
        },
      });

      stack.execute(increment(5));
      expect(value).toBe(5);

      stack.execute(increment(3));
      expect(value).toBe(8);

      stack.undo();
      expect(value).toBe(5);

      stack.undo();
      expect(value).toBe(0);

      stack.redo();
      expect(value).toBe(5);

      stack.redo();
      expect(value).toBe(8);
    });
  });
});
