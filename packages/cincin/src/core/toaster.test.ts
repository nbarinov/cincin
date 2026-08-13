import { createToaster } from './toaster';

declare const console: { warn(...args: unknown[]): void };

describe('store', () => {
  describe('snapshot', () => {
    it('should be empty on creation and stable by reference between commits', () => {
      const t = createToaster();
      const snapshot = t.getSnapshot();

      expect(snapshot).toEqual([]);
      expect(t.getSnapshot()).toBe(snapshot); // uSES-контракт: без мутаций ссылка та же
    });

    it('should keep the old snapshot untouched and produce a new reference on commit', () => {
      const t = createToaster();
      const before = t.getSnapshot();

      t.create('hi');

      expect(before).toEqual([]); // старая ссылка нетронута
      expect(t.getSnapshot()).toHaveLength(1);
    });

    it('should keep insertion order: new toasts go last', () => {
      const t = createToaster();
      const firstId = t.create('a');
      const secondId = t.create('b');

      expect(t.getSnapshot().map((toast) => toast.content)).toEqual(['a', 'b']);
      expect(
        t
          .getSnapshot()
          .every((toast) => toast.id === firstId || toast.id === secondId)
      ).toBe(true);
    });
  });

  describe('create & sugar', () => {
    it('should return id and create an active toast with defaults', () => {
      const t = createToaster();
      const id = t.create('hi');
      const toast = t.getSnapshot().at(0)!;

      expect(toast).toMatchObject({
        id,
        content: 'hi',
        type: 'message',
        status: 'active',
        duration: 4000,
        dismissible: true,
        paused: false,
      });
    });

    it('should give loading toasts Infinity duration by default', () => {
      const t = createToaster();
      t.loading('...');

      expect(t.getSnapshot().at(0)!.duration).toBe(Infinity);
    });

    it('should set toast type from sugar methods', () => {
      const t = createToaster();

      const sId = t.success('ok');
      const eId = t.error('fail');
      const wId = t.warning('warn');
      const iId = t.info('info');
      const snapshot = t.getSnapshot();

      expect(snapshot.find((toast) => toast.id === sId)!.type).toBe('success');
      expect(snapshot.find((toast) => toast.id === eId)!.type).toBe('error');
      expect(snapshot.find((toast) => toast.id === wId)!.type).toBe('warning');
      expect(snapshot.find((toast) => toast.id === iId)!.type).toBe('info');
    });

    it('should let explicit duration override the type default', () => {
      const t = createToaster();
      t.loading('...', { duration: 2000 });

      expect(t.getSnapshot().at(0)!.duration).toBe(2000);
    });
  });

  describe('dismiss & remove', () => {
    it('should move toast to dismissing status and keep it in the snapshot', () => {
      const t = createToaster();
      const id = t.create('hi');

      t.dismiss(id);

      expect(t.getSnapshot()).toHaveLength(1);
      expect(t.getSnapshot().at(0)!.status).toBe('dismissing');
    });

    it('should remove toast from the snapshot on remove', () => {
      const t = createToaster();
      const id = t.create('hi');

      t.dismiss(id);
      t.remove(id);

      expect(t.getSnapshot()).toEqual([]);
    });

    it('should dismiss all toasts when called without arguments', () => {
      const t = createToaster();
      t.create('a');
      t.create('b');

      t.dismiss();

      expect(
        t.getSnapshot().every((toast) => toast.status === 'dismissing')
      ).toBe(true);
    });

    it('should warn and do nothing when dismiss receives explicit undefined', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();
      t.create('a');
      t.create('b');

      (t.dismiss as (id?: unknown) => void)(undefined);

      expect(t.getSnapshot().every((toast) => toast.status === 'active')).toBe(
        true
      );
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('should emit dismissed and removed events once per phase', () => {
      const t = createToaster();
      const events: string[] = [];
      const id = t.create('hi');

      t.subscribe((e) => events.push(e.type));
      t.dismiss(id);
      t.remove(id);

      expect(events).toEqual(['dismissed', 'removed']);
    });

    it('should not emit a second dismissed event for an already dismissing toast', () => {
      const t = createToaster();
      const events: string[] = [];
      const id = t.create('hi');

      t.subscribe((e) => events.push(e.type));
      t.dismiss(id);
      t.dismiss(id);

      expect(events).toEqual(['dismissed']);
    });

    it('should auto-remove a dismissing toast after removeTimeout as a safety net', () => {
      vi.useFakeTimers();

      const t = createToaster({ removeTimeout: 2000 });
      const id = t.create('hi');

      t.dismiss(id);
      vi.advanceTimersByTime(1999);
      expect(t.getSnapshot()).toHaveLength(1); // рендерер ещё может позвать remove
      vi.advanceTimersByTime(1);
      expect(t.getSnapshot()).toEqual([]);

      vi.useRealTimers();
    });

    it('should dismiss only the listed toasts in a single commit', () => {
      const t = createToaster();
      const a = t.create('a');
      const b = t.create('b');
      t.create('c');

      t.dismiss([a, b]);

      const statuses = t.getSnapshot().map((toast) => toast.status);
      expect(statuses).toEqual(['dismissing', 'dismissing', 'active']);
    });

    it('should do nothing when dismiss receives an empty array', () => {
      const t = createToaster();
      t.create('a');

      t.dismiss([]);

      // регресс-тест футгана: «пустая выборка» ≠ «все»
      expect(t.getSnapshot().at(0)!.status).toBe('active');
    });

    it('should remove all toasts when remove is called without arguments', () => {
      const t = createToaster();
      t.create('a');
      t.create('b');

      t.remove();

      expect(t.getSnapshot()).toEqual([]);
    });
  });

  describe('dev warnings', () => {
    it('should warn and do nothing when update targets a missing toast', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();

      t.update('ghost', { content: 'x' });

      expect(t.getSnapshot()).toEqual([]);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('should warn and generate an id when an empty string id is passed', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();
      const id = t.create('hi', { id: '' });

      expect(id).not.toBe('');
      expect(t.getSnapshot().at(0)!.id).toBe(id);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('duration engine', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-dismiss an active toast after its duration', () => {
      const t = createToaster();
      t.create('hi', { duration: 1000 });

      vi.advanceTimersByTime(999);
      expect(t.getSnapshot().at(0)!.status).toBe('active');
      vi.advanceTimersByTime(1);
      expect(t.getSnapshot().at(0)!.status).toBe('dismissing');
    });

    it('should never auto-dismiss an Infinity toast', () => {
      const t = createToaster();
      t.loading('...');

      vi.advanceTimersByTime(1_000_000);
      expect(t.getSnapshot().at(0)!.status).toBe('active');
    });

    it('should not restart the timer on content-only update', () => {
      const t = createToaster();
      const id = t.create('1/3', { duration: 1000 });

      vi.advanceTimersByTime(900);
      t.update(id, { content: '2/3' });
      vi.advanceTimersByTime(100); // 1000ms total since creation
      expect(t.getSnapshot().at(0)!.status).toBe('dismissing');
    });

    it('should restart the timer when update changes the duration', () => {
      const t = createToaster();
      const id = t.create('x', { duration: 1000 });

      vi.advanceTimersByTime(900);
      t.update(id, { duration: 1000 });
      vi.advanceTimersByTime(999);
      expect(t.getSnapshot().at(0)!.status).toBe('active');
      vi.advanceTimersByTime(1);
      expect(t.getSnapshot().at(0)!.status).toBe('dismissing');
    });

    it('should restart with the new type default when update changes the type', () => {
      const t = createToaster();
      const id = t.loading('saving...');

      vi.advanceTimersByTime(60_000);
      t.update(id, { type: 'success', content: 'saved' });
      expect(t.getSnapshot().at(0)!.status).toBe('active');

      vi.advanceTimersByTime(4000); // config default kicks in from the update moment
      expect(t.getSnapshot().at(0)!.status).toBe('dismissing');
    });

    it('should freeze the remainder on pause and finish it after resume', () => {
      const t = createToaster();
      const id = t.create('hi', { duration: 5000 });

      vi.advanceTimersByTime(2000);
      t.pause(id);
      vi.advanceTimersByTime(60_000);
      expect(t.getSnapshot().at(0)!.status).toBe('active');
      expect(t.getRemainingMs(id)).toBe(3000);

      t.resume(id);
      vi.advanceTimersByTime(3000);
      expect(t.getSnapshot().at(0)!.status).toBe('dismissing');
    });

    it('should not tick while queued and start on promotion', () => {
      const t = createToaster({ max: 1 });
      const first = t.create('a', { duration: 1000 });
      t.create('b', { duration: 1000 });

      vi.advanceTimersByTime(500);
      expect(t.getRemainingMs(t.getSnapshot().at(1)!.id)).toBe(1000); // full duration ahead

      t.dismiss(first);
      vi.advanceTimersByTime(999);
      expect(t.getSnapshot().at(1)!.status).toBe('active');
      vi.advanceTimersByTime(1);
      expect(t.getSnapshot().at(1)!.status).toBe('dismissing');
    });

    it('should not pause dismissing toasts so the safety net keeps ticking', () => {
      const t = createToaster({ removeTimeout: 2000 });
      const id = t.create('hi');

      t.dismiss(id);
      t.pause(id); // must be a no-op
      vi.advanceTimersByTime(2000);
      expect(t.getSnapshot()).toEqual([]);
    });

    it('should stop everything on destroy', () => {
      const t = createToaster();
      const events: string[] = [];
      t.create('a', { duration: 1000 });
      t.subscribe((e) => events.push(e.type));

      t.destroy();
      vi.advanceTimersByTime(60_000);

      expect(t.getSnapshot().at(0)!.status).toBe('active'); // frozen in place
      expect(events).toEqual([]); // listeners dropped
    });
  });

  // Real timers here: promise microtasks and fake timers make vi.waitFor flaky.
  describe('promise', () => {
    it('should show loading immediately and switch to success with factory content', async () => {
      const t = createToaster();
      const p = t.promise(Promise.resolve(42), {
        loading: 'wait',
        success: (v) => `got ${v}`,
      });

      expect(t.getSnapshot().at(0)!.type).toBe('loading');
      expect(t.getSnapshot().at(0)!.duration).toBe(Infinity);

      await expect(p).resolves.toBe(42); // unwrap mirror
      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.content).toBe('got 42')
      );
      expect(t.getSnapshot().at(0)!.type).toBe('success');
    });

    it('should accept plain content for phases', async () => {
      const t = createToaster();
      await t.promise(Promise.resolve('ok'), {
        loading: 'wait',
        success: 'done',
      });

      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.content).toBe('done')
      );
    });

    it('should mirror the original rejection instead of swallowing it', async () => {
      const t = createToaster();
      const boom = new Error('boom');
      const p = t.promise(Promise.reject(boom), {
        loading: 'wait',
        error: 'failed',
      });

      await expect(p).rejects.toBe(boom);
      await vi.waitFor(() => expect(t.getSnapshot().at(0)!.type).toBe('error'));
      expect(t.getSnapshot().at(0)!.content).toBe('failed');
    });

    it('should keep loading until an async factory resolves', async () => {
      const t = createToaster();
      let release!: (content: string) => void;
      const gate = new Promise<string>((r) => (release = r));

      void t.promise(Promise.resolve('res'), {
        loading: 'wait',
        success: () => gate, // the await res.json() case
      });

      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.type).toBe('loading')
      );
      release('parsed');
      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.content).toBe('parsed')
      );
      expect(t.getSnapshot().at(0)!.type).toBe('success');
    });

    it('should dismiss the toast when the settled phase is omitted', async () => {
      const t = createToaster();
      await t.promise(Promise.resolve('ok'), { loading: 'wait' }); // no success phase

      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.status).toBe('dismissing')
      );
    });

    it('should fall through to the error phase when the success factory fails', async () => {
      const t = createToaster();
      const p = t.promise(Promise.resolve('ok'), {
        loading: 'wait',
        success: () => {
          throw new Error('parse failed');
        },
        error: (e) => `error: ${(e as Error).message}`,
      });

      await expect(p).resolves.toBe('ok'); // the mirror is untouched by factory failures
      await vi.waitFor(() => expect(t.getSnapshot().at(0)!.type).toBe('error'));
      expect(t.getSnapshot().at(0)!.content).toBe('error: parse failed');
    });

    it('should dismiss and warn when the error phase factory fails too', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();

      void t
        .promise(Promise.reject(new Error('boom')), {
          loading: 'wait',
          error: () => {
            throw new Error('renderer of errors is broken');
          },
        })
        .catch(() => {}); // silence the mirrored rejection in the test

      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.status).toBe('dismissing')
      );
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('should silently skip settling a toast the user already dismissed', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();
      let release!: (content: string) => void;
      const gate = new Promise<string>((r) => (release = r));

      void t.promise(Promise.resolve('res'), {
        loading: 'wait',
        success: () => gate,
      });
      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.type).toBe('loading')
      );

      t.dismiss(t.getSnapshot().at(0)!.id); // the user is faster than res.json()
      release('too late');
      await new Promise((r) => setTimeout(r, 0)); // let the settle path run

      expect(t.getSnapshot().at(0)!.content).toBe('wait'); // untouched
      expect(t.getSnapshot().at(0)!.status).toBe('dismissing');
      expect(warn).not.toHaveBeenCalled(); // a legitimate race, not a user error
      warn.mockRestore();
    });
  });
});
