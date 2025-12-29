/**
 * Represents a command that can be executed, undone, and redone.
 */
export interface ICommand {
  /**
   * Executes the command.
   */
  execute(): void;

  /**
   * Undoes the command.
   */
  undo(): void;

  /**
   * Redoes the command (default implementation calls execute).
   */
  redo?(): void;

  /**
   * Optional description of the command for debugging.
   */
  description?: string;
}

/**
 * Configuration options for CommandStack.
 */
export interface ICommandStackOptions {
  /**
   * Maximum number of commands to keep in history.
   * @default 100
   */
  maxSize?: number;
}

/**
 * Interface for a command stack that supports undo/redo operations.
 */
export interface ICommandStack {
  /**
   * Executes a command and adds it to the undo stack.
   * Clears the redo stack.
   */
  execute(command: ICommand): void;

  /**
   * Undoes the last executed command.
   * @returns true if a command was undone, false otherwise
   */
  undo(): boolean;

  /**
   * Redoes the last undone command.
   * @returns true if a command was redone, false otherwise
   */
  redo(): boolean;

  /**
   * Checks if there are commands that can be undone.
   */
  canUndo(): boolean;

  /**
   * Checks if there are commands that can be redone.
   */
  canRedo(): boolean;

  /**
   * Clears all commands from the stack.
   */
  clear(): void;

  /**
   * Gets the number of commands in the undo stack.
   */
  getUndoCount(): number;

  /**
   * Gets the number of commands in the redo stack.
   */
  getRedoCount(): number;

  /**
   * Gets the descriptions of all commands in the undo stack.
   */
  getUndoHistory(): string[];

  /**
   * Gets the descriptions of all commands in the redo stack.
   */
  getRedoHistory(): string[];
}
