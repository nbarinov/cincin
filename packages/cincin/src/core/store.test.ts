import { ToastStore } from './store';
import type { Toast, ToastId, ToastNotifyEvent } from './types';

function makeToast(id: string, overrides: Partial<Toast> = {}): Toast {
  return {
    id,
    content: `content of ${id}`,
    type: 'message',
    status: 'active',
    duration: 4000,
    dismissible: true,
    paused: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function added(toast: Toast): ToastNotifyEvent {
  return { type: 'added', toast };
}

describe('ToastStore', () => {
  describe('snapshot discipline', () => {
    it('should not change the snapshot until commit', () => {
      const store = new ToastStore();
      const before = store.getSnapshot();

      store.set(makeToast('a'));
      store.delete('a');
      store.set(makeToast('b'));

      expect(store.getSnapshot()).toBe(before);
      expect(store.getSnapshot()).toEqual([]);
    });

    it('should produce a new frozen snapshot on commit', () => {
      const store = new ToastStore();
      const before = store.getSnapshot();
      const toast = makeToast('a');

      store.set(toast);
      store.commit(added(toast));

      const after = store.getSnapshot();
      expect(after).not.toBe(before);
      expect(after).toEqual([toast]);
      expect(Object.isFrozen(after)).toBe(true);
    });

    it('should keep the snapshot reference on an empty commit', () => {
      const store = new ToastStore();
      const toast = makeToast('a');
      store.set(toast);
      store.commit(added(toast));

      const before = store.getSnapshot();
      store.commit();

      expect(store.getSnapshot()).toBe(before);
    });

    it('should keep insertion order and preserve position on re-set', () => {
      const store = new ToastStore();
      store.set(makeToast('a'));
      store.set(makeToast('b'));
      store.set(makeToast('c'));

      store.set(makeToast('a', { content: 'updated a' })); // upsert не двигает
      store.commit(added(makeToast('a')));

      expect(store.getSnapshot().map((t) => t.id)).toEqual(['a', 'b', 'c']);
      expect(store.getSnapshot().at(0)!.content).toBe('updated a');
    });
  });

  describe('queries', () => {
    it('should count all without a predicate and filtered with one', () => {
      const store = new ToastStore();
      store.set(makeToast('a', { status: 'active' }));
      store.set(makeToast('b', { status: 'queued' }));
      store.set(makeToast('c', { status: 'active' }));

      expect(store.count()).toBe(3);
      expect(store.count((t) => t.status === 'active')).toBe(2);
      expect(store.count((t) => t.status === 'dismissing')).toBe(0);
    });
  });

  describe('notify semantics', () => {
    it('should deliver each event to every listener before the next event', () => {
      const store = new ToastStore();
      const calls: string[] = [];
      store.subscribe((e) => calls.push(`first:${e.toast.id}`));
      store.subscribe((e) => calls.push(`second:${e.toast.id}`));

      const a = makeToast('a');
      const b = makeToast('b');
      store.set(a);
      store.set(b);
      store.commit(added(a), added(b));

      expect(calls).toEqual(['first:a', 'second:a', 'first:b', 'second:b']);
    });

    it('should not deliver the current batch to a listener subscribed during notify', () => {
      const store = new ToastStore();
      const late: ToastId[] = [];
      store.subscribe(() => {
        store.subscribe((e) => late.push(e.toast.id));
      });

      const a = makeToast('a');
      const b = makeToast('b');
      store.set(a);
      store.set(b);
      store.commit(added(a), added(b));

      expect(late).toEqual([]);

      const c = makeToast('c');
      store.set(c);
      store.commit(added(c));
      expect(late.length).toBeGreaterThan(0);
    });

    it('should stop delivering to a listener unsubscribed during notify', () => {
      const store = new ToastStore();
      const received: ToastId[] = [];
      const unsubscribe = store.subscribe((e) => {
        received.push(e.toast.id);
        unsubscribe();
      });

      const a = makeToast('a');
      const b = makeToast('b');
      store.set(a);
      store.set(b);
      store.commit(added(a), added(b));

      expect(received).toEqual(['a']);
    });

    it('should survive a throwing listener and rethrow asynchronously', () => {
      vi.useFakeTimers();

      const store = new ToastStore();
      const survived: ToastId[] = [];
      store.subscribe(() => {
        throw new Error('broken subscriber');
      });
      store.subscribe((e) => survived.push(e.toast.id));

      const a = makeToast('a');
      store.set(a);

      expect(() => store.commit(added(a))).not.toThrow();
      expect(survived).toEqual(['a']);

      expect(() => vi.runAllTimers()).toThrow('broken subscriber');

      vi.useRealTimers();
    });
  });
});
