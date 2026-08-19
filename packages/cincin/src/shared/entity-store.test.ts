import { EntityStore } from './entity-store';

interface Item {
  id: string;
  label: string;
  live: boolean;
}

type ItemEvent = { type: 'added'; item: Item };

function createItem(id: string, overrides: Partial<Item> = {}): Item {
  return { id, label: `label of ${id}`, live: true, ...overrides };
}

function createAddEvent(item: Item): ItemEvent {
  return { type: 'added', item };
}

function createStore(): EntityStore<string, Item, ItemEvent> {
  return new EntityStore({ selectId: (item) => item.id });
}

describe('EntityStore', () => {
  describe('keys', () => {
    it('should key entities by selectId', () => {
      const store = createStore();
      const item = createItem('a');

      store.set(item);

      expect(store.get('a')).toBe(item);
      expect(store.has('a')).toBe(true);
      expect(store.has('b')).toBe(false);
    });

    it('should replace an entity under the same key', () => {
      const store = createStore();
      store.set(createItem('a'));
      store.set(createItem('a', { label: 'replaced' }));

      expect(store.count()).toBe(1);
      expect(store.get('a')!.label).toBe('replaced');
    });

    it('should report whether delete removed anything', () => {
      const store = createStore();
      store.set(createItem('a'));

      expect(store.delete('a')).toBe(true);
      expect(store.delete('a')).toBe(false);
      expect(store.has('a')).toBe(false);
    });
  });

  describe('snapshot discipline', () => {
    it('should not change the snapshot until commit', () => {
      const store = createStore();
      const before = store.getSnapshot();

      store.set(createItem('a'));
      store.delete('a');
      store.set(createItem('b'));

      expect(store.getSnapshot()).toBe(before);
      expect(store.getSnapshot()).toEqual([]);
    });

    it('should produce a new frozen snapshot on commit', () => {
      const store = createStore();
      const before = store.getSnapshot();
      const item = createItem('a');

      store.set(item);
      store.commit(createAddEvent(item));

      const after = store.getSnapshot();
      expect(after).not.toBe(before);
      expect(after).toEqual([item]);
      expect(Object.isFrozen(after)).toBe(true);
    });

    it('should keep the snapshot reference on an empty commit', () => {
      const store = createStore();
      const item = createItem('a');
      store.set(item);
      store.commit(createAddEvent(item));

      const before = store.getSnapshot();
      store.commit();

      expect(store.getSnapshot()).toBe(before);
    });

    it('should keep insertion order and preserve position on re-set', () => {
      const store = createStore();
      store.set(createItem('a'));
      store.set(createItem('b'));
      store.set(createItem('c'));

      store.set(createItem('a', { label: 'updated a' })); // a re-set does not move
      store.commit(createAddEvent(createItem('a')));

      expect(store.getSnapshot().map((item) => item.id)).toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(store.getSnapshot().at(0)!.label).toBe('updated a');
    });
  });

  describe('queries', () => {
    it('should count all without a predicate and filtered with one', () => {
      const store = createStore();
      store.set(createItem('a', { live: true }));
      store.set(createItem('b', { live: false }));
      store.set(createItem('c', { live: true }));

      expect(store.count()).toBe(3);
      expect(store.count((item) => item.live)).toBe(2);
      expect(store.count((item) => item.label === 'none')).toBe(0);
    });

    it('should select matching entities in insertion order', () => {
      const store = createStore();
      store.set(createItem('a', { live: true }));
      store.set(createItem('b', { live: false }));
      store.set(createItem('c', { live: true }));

      expect(store.select((item) => item.live).map((item) => item.id)).toEqual([
        'a',
        'c',
      ]);
      expect(store.select(() => false)).toEqual([]);
    });
  });

  describe('notify semantics', () => {
    it('should deliver each event to every listener before the next event', () => {
      const store = createStore();
      const calls: string[] = [];
      store.subscribe((e) => calls.push(`first:${e.item.id}`));
      store.subscribe((e) => calls.push(`second:${e.item.id}`));

      const a = createItem('a');
      const b = createItem('b');
      store.set(a);
      store.set(b);
      store.commit(createAddEvent(a), createAddEvent(b));

      expect(calls).toEqual(['first:a', 'second:a', 'first:b', 'second:b']);
    });

    it('should not deliver the current batch to a listener subscribed during notify', () => {
      const store = createStore();
      const late: string[] = [];
      store.subscribe(() => {
        store.subscribe((e) => late.push(e.item.id));
      });

      const a = createItem('a');
      const b = createItem('b');
      store.set(a);
      store.set(b);
      store.commit(createAddEvent(a), createAddEvent(b));

      expect(late).toEqual([]);

      const c = createItem('c');
      store.set(c);
      store.commit(createAddEvent(c));
      expect(late.length).toBeGreaterThan(0);
    });

    it('should stop delivering to a listener unsubscribed during notify', () => {
      const store = createStore();
      const received: string[] = [];
      const unsubscribe = store.subscribe((e) => {
        received.push(e.item.id);
        unsubscribe();
      });

      const a = createItem('a');
      const b = createItem('b');
      store.set(a);
      store.set(b);
      store.commit(createAddEvent(a), createAddEvent(b));

      expect(received).toEqual(['a']);
    });

    it('should survive a throwing listener and rethrow asynchronously', () => {
      vi.useFakeTimers();

      const store = createStore();
      const survived: string[] = [];
      store.subscribe(() => {
        throw new Error('broken subscriber');
      });
      store.subscribe((e) => survived.push(e.item.id));

      const a = createItem('a');
      store.set(a);

      expect(() => store.commit(createAddEvent(a))).not.toThrow();
      expect(survived).toEqual(['a']);

      expect(() => vi.runAllTimers()).toThrow('broken subscriber');

      vi.useRealTimers();
    });
  });
});
