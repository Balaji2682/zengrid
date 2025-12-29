import { EventEmitter } from './event-emitter';

interface TestEvents {
  'test:simple': { message: string };
  'test:number': { value: number };
  'test:complex': { data: { nested: string } };
}

describe('EventEmitter', () => {
  let emitter: EventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new EventEmitter<TestEvents>();
  });

  describe('on/emit', () => {
    it('should call handler when event is emitted', () => {
      const handler = jest.fn();
      emitter.on('test:simple', handler);

      emitter.emit('test:simple', { message: 'hello' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should call multiple handlers for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('test:simple', handler1);
      emitter.on('test:simple', handler2);

      emitter.emit('test:simple', { message: 'hello' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should support multiple event types', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('test:simple', handler1);
      emitter.on('test:number', handler2);

      emitter.emit('test:simple', { message: 'hello' });
      emitter.emit('test:number', { value: 42 });

      expect(handler1).toHaveBeenCalledWith({ message: 'hello' });
      expect(handler2).toHaveBeenCalledWith({ value: 42 });
    });

    it('should return unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.on('test:simple', handler);

      unsubscribe();
      emitter.emit('test:simple', { message: 'hello' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should call handler only once', () => {
      const handler = jest.fn();
      emitter.once('test:simple', handler);

      emitter.emit('test:simple', { message: 'first' });
      emitter.emit('test:simple', { message: 'second' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ message: 'first' });
    });

    it('should return unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.once('test:simple', handler);

      unsubscribe();
      emitter.emit('test:simple', { message: 'hello' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove specific handler', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('test:simple', handler1);
      emitter.on('test:simple', handler2);

      emitter.off('test:simple', handler1);
      emitter.emit('test:simple', { message: 'hello' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle removing non-existent handler', () => {
      const handler = jest.fn();
      expect(() => emitter.off('test:simple', handler)).not.toThrow();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      emitter.on('test:simple', handler1);
      emitter.on('test:simple', handler2);
      emitter.on('test:number', handler3);

      emitter.removeAllListeners('test:simple');

      emitter.emit('test:simple', { message: 'hello' });
      emitter.emit('test:number', { value: 42 });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });

    it('should remove all listeners for all events', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('test:simple', handler1);
      emitter.on('test:number', handler2);

      emitter.removeAllListeners();

      emitter.emit('test:simple', { message: 'hello' });
      emitter.emit('test:number', { value: 42 });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct count', () => {
      expect(emitter.listenerCount('test:simple')).toBe(0);

      emitter.on('test:simple', jest.fn());
      expect(emitter.listenerCount('test:simple')).toBe(1);

      emitter.on('test:simple', jest.fn());
      expect(emitter.listenerCount('test:simple')).toBe(2);

      emitter.once('test:simple', jest.fn());
      expect(emitter.listenerCount('test:simple')).toBe(3);
    });
  });

  describe('eventNames', () => {
    it('should return all event names with listeners', () => {
      emitter.on('test:simple', jest.fn());
      emitter.on('test:number', jest.fn());
      emitter.once('test:complex', jest.fn());

      const names = emitter.eventNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('test:simple');
      expect(names).toContain('test:number');
      expect(names).toContain('test:complex');
    });
  });

  describe('maxListeners', () => {
    it('should warn when max listeners exceeded', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      emitter.setMaxListeners(2);

      emitter.on('test:simple', jest.fn());
      emitter.on('test:simple', jest.fn());
      emitter.on('test:simple', jest.fn());

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should get/set max listeners', () => {
      emitter.setMaxListeners(50);
      expect(emitter.getMaxListeners()).toBe(50);
    });

    it('should throw on invalid max listeners', () => {
      expect(() => emitter.setMaxListeners(-1)).toThrow();
      expect(() => emitter.setMaxListeners(1.5)).toThrow();
    });
  });

  describe('error handling', () => {
    it('should catch errors in handlers', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const throwingHandler = () => {
        throw new Error('Handler error');
      };
      const normalHandler = jest.fn();

      emitter.on('test:simple', throwingHandler);
      emitter.on('test:simple', normalHandler);

      emitter.emit('test:simple', { message: 'hello' });

      expect(errorSpy).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
