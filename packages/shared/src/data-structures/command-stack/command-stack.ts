import type {
  ICommand,
  ICommandStack,
  ICommandStackOptions,
} from './command-stack.interface';

/**
 * Implementation of a command stack for undo/redo functionality.
 *
 * Time Complexity:
 * - execute: O(1)
 * - undo: O(1)
 * - redo: O(1)
 * - canUndo/canRedo: O(1)
 * - clear: O(1)
 *
 * Space Complexity: O(n) where n is the number of commands (up to maxSize)
 */
export class CommandStack implements ICommandStack {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private readonly maxSize: number;

  constructor(options: ICommandStackOptions = {}) {
    this.maxSize = options.maxSize ?? 100;

    if (this.maxSize < 1) {
      throw new Error('maxSize must be at least 1');
    }
  }

  /**
   * Executes a command and adds it to the undo stack.
   * Clears the redo stack as new actions invalidate the redo history.
   */
  execute(command: ICommand): void {
    if (!command) {
      throw new Error('Command cannot be null or undefined');
    }

    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];

    // Enforce max size by removing oldest commands
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undoes the last executed command.
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);

    return true;
  }

  /**
   * Redoes the last undone command.
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    const command = this.redoStack.pop()!;

    // Use custom redo if available, otherwise use execute
    if (command.redo) {
      command.redo();
    } else {
      command.execute();
    }

    this.undoStack.push(command);

    return true;
  }

  /**
   * Checks if there are commands that can be undone.
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Checks if there are commands that can be redone.
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clears all commands from both stacks.
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Gets the number of commands in the undo stack.
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Gets the number of commands in the redo stack.
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Gets the descriptions of all commands in the undo stack.
   */
  getUndoHistory(): string[] {
    return this.undoStack.map(
      (cmd, idx) => cmd.description ?? `Command ${idx + 1}`
    );
  }

  /**
   * Gets the descriptions of all commands in the redo stack.
   */
  getRedoHistory(): string[] {
    return this.redoStack.map(
      (cmd, idx) => cmd.description ?? `Command ${idx + 1}`
    );
  }
}
