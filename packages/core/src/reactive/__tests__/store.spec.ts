import { GridStoreImpl } from '../store';
import { resetTracking } from '../tracking';
import { resetDebug } from '../debug';
import { resetScheduler, flushEffects } from '../effect-scheduler';

let store: GridStoreImpl;

beforeEach(() => {
  resetTracking();
  resetDebug();
  resetScheduler();
  store = new GridStoreImpl();
});

describe('GridStore', () => {
  describe('extend + get', () => {
    it('round-trips a value', () => {
      store.extend('rows.raw', [1, 2, 3], 'core');
      expect(store.get('rows.raw')).toEqual([1, 2, 3]);
    });

    it('throws on duplicate key', () => {
      store.extend('x', 1, 'core');
      expect(() => store.extend('x', 2, 'core')).toThrow('already exists');
    });
  });

  describe('phantom deps', () => {
    it('computed reads missing key, extend later triggers recompute', () => {
      // Computed reads a key that doesn't exist yet
      store.computed(
        'doubled',
        () => {
          const val = store.get('num') as number;
          return val !== undefined ? val * 2 : -1;
        },
        'core'
      );

      expect(store.get('doubled')).toBe(-1);

      // Now extend the missing key
      store.extend('num', 5, 'plugin');

      // The computed should recompute with the real value
      expect(store.get('doubled')).toBe(10);
    });

    it('effect reads missing key, computed created later re-fires effect', () => {
      const runs: Array<number | undefined> = [];
      store.effect(
        'reader',
        () => {
          runs.push(store.get('derived') as number | undefined);
        },
        'core'
      );

      // First run subscribed to a phantom placeholder for 'derived'
      expect(runs).toEqual([undefined]);

      // Creating the computed must activate the phantom so the effect re-subscribes
      store.extend('base', 3, 'plugin');
      store.computed('derived', () => (store.get('base') as number) * 2, 'core');

      flushEffects();
      expect(runs[runs.length - 1]).toBe(6);
    });
  });

  describe('phase enforcement', () => {
    it('throws when computed at lower phase reads higher-phase signal', () => {
      store.extend('high', 42, 'core', 20);

      expect(() => {
        store.computed(
          'low',
          () => {
            return store.get('high');
          },
          'core',
          10
        );
        // Force evaluation
        store.get('low');
      }).toThrow(/Phase violation/);
    });

    it('getUnphased bypasses phase check', () => {
      store.extend('high', 42, 'core', 20);

      store.computed(
        'low',
        () => {
          return store.getUnphased('high');
        },
        'core',
        10
      );

      expect(store.get('low')).toBe(42);
    });
  });

  describe('actions', () => {
    it('re-entrant same-name action throws', () => {
      store.action(
        'selfCall',
        () => {
          store.exec('selfCall');
        },
        'core'
      );

      expect(() => store.exec('selfCall')).toThrow(/Re-entrant/);
    });

    it('different-name action during exec succeeds', () => {
      store.extend('val', 0, 'core');
      store.action(
        'inner',
        () => {
          store.get('val') as number; // just read
        },
        'core'
      );
      store.action(
        'outer',
        () => {
          store.exec('inner');
        },
        'core'
      );

      expect(() => store.exec('outer')).not.toThrow();
    });

    it('throws on unknown action', () => {
      expect(() => store.exec('nope')).toThrow(/not found/);
    });

    it('throws on duplicate action', () => {
      store.action('a', () => {}, 'core');
      expect(() => store.action('a', () => {}, 'core')).toThrow('already registered');
    });
  });

  describe('disposePlugin', () => {
    it('cleans up all owned primitives', () => {
      store.extend('p.val', 10, 'plugin-a');
      let effectRan = 0;
      store.effect(
        'p.eff',
        () => {
          void store.get('p.val');
          effectRan++;
        },
        'plugin-a'
      );

      const initial = effectRan;
      store.disposePlugin('plugin-a');

      // After dispose, the signal and effect should be gone
      // Getting the key should return undefined (phantom placeholder)
      expect(store.get('p.val')).toBeUndefined();

      // Effect should not run again
      expect(effectRan).toBe(initial);
    });

    it('runs arbitrary disposables', () => {
      let disposed = false;
      store.addDisposable('plugin-b', () => {
        disposed = true;
      });

      store.disposePlugin('plugin-b');
      expect(disposed).toBe(true);
    });
  });

  describe('disposeAll', () => {
    it('cleans everything', () => {
      store.extend('a', 1, 'p1');
      store.extend('b', 2, 'p2');
      store.action('act', () => {}, 'p1');
      let disposed = false;
      store.addDisposable('p2', () => {
        disposed = true;
      });

      store.disposeAll();

      expect(disposed).toBe(true);
      // All keys should be gone
      expect(store.get('a')).toBeUndefined();
      expect(store.get('b')).toBeUndefined();
    });

    it('clears ownership and phantom tracking', () => {
      store.extend('x', 1, 'owner1');
      // Create a phantom dep by reading a missing key
      store.computed('phantom-reader', () => store.get('missing.key'), 'owner1');

      store.disposeAll();

      // After disposeAll, a fresh store should be able to reuse the same keys
      const store2 = new GridStoreImpl();
      expect(() => store2.extend('x', 2, 'owner1')).not.toThrow();
      expect(store2.get('x')).toBe(2);
      store2.disposeAll();
    });
  });

  describe('getRow', () => {
    it('returns correct row from rows.raw', () => {
      const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
      store.extend('rows.raw', rows, 'core');

      expect(store.getRow(0)).toEqual({ id: 1 });
      expect(store.getRow(2)).toEqual({ id: 3 });
      expect(store.getRow(5)).toBeUndefined();
    });
  });

  describe('computed', () => {
    it('throws on duplicate computed key', () => {
      store.computed('c', () => 1, 'core');
      expect(() => store.computed('c', () => 2, 'core')).toThrow('already exists');
    });
  });

  describe('effect', () => {
    it('throws on duplicate effect name', () => {
      store.extend('x', 0, 'core');
      store.effect(
        'e',
        () => {
          void store.get('x');
        },
        'core'
      );
      expect(() =>
        store.effect(
          'e',
          () => {
            void store.get('x');
          },
          'core'
        )
      ).toThrow('already registered');
    });
  });

  describe('set()', () => {
    it('updates existing signal value', () => {
      store.extend('x', 1, 'core');
      store.set('x', 42);
      expect(store.get('x')).toBe(42);
    });

    it('triggers computed recomputation', () => {
      store.extend('x', 1, 'core');
      store.computed('doubled', () => (store.get('x') as number) * 2, 'core');
      expect(store.get('doubled')).toBe(2);

      store.set('x', 5);
      expect(store.get('doubled')).toBe(10);
    });

    it('throws if key does not exist', () => {
      expect(() => store.set('nonexistent', 1)).toThrow('Store key "nonexistent" does not exist');
    });

    it('throws for computed-only keys', () => {
      store.extend('x', 1, 'core');
      store.computed('derived', () => (store.get('x') as number) + 1, 'core');
      expect(() => store.set('derived', 99)).toThrow('Store key "derived" does not exist');
    });
  });
});
