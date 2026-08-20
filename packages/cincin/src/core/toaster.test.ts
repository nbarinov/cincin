import { createToaster } from './toaster';

declare const console: { warn(...args: unknown[]): void };

describe('store', () => {
  describe('snapshot', () => {
    it('should be empty on creation and stable by reference between commits', () => {
      const t = createToaster();
      const snapshot = t.getSnapshot();

      expect(snapshot).toEqual([]);
      expect(t.getSnapshot()).toBe(snapshot); // uSES contract: no mutation, same reference
    });

    it('should keep the old snapshot untouched and produce a new reference on commit', () => {
      const t = createToaster();
      const before = t.getSnapshot();

      t.create('hi');

      expect(before).toEqual([]); // the old reference is untouched
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
    it('should return id and create a toast with defaults', () => {
      const t = createToaster();
      const id = t.create('hi');
      const toast = t.getSnapshot().at(0)!;

      expect(toast).toMatchObject({
        id,
        content: 'hi',
        type: 'message',
        duration: 4000,
        dismissible: true,
      });
    });

    it('should give loading toasts Infinity duration by default', () => {
      const t = createToaster();
      t.loading('...');

      expect(t.getSnapshot().at(0)!.duration).toBe(Infinity);
    });

    it('should set toast type from sugar methods', () => {
      const t = createToaster();
      t.success('s');
      t.error('e');
      t.warning('w');
      t.info('i');
      t.loading('l');
      t.message('m');

      expect(t.getSnapshot().map((toast) => toast.type)).toEqual([
        'success',
        'error',
        'warning',
        'info',
        'loading',
        'message',
      ]);
    });

    it('should let explicit duration override the type default', () => {
      const t = createToaster();
      t.loading('l', { duration: 1000 });

      expect(t.getSnapshot().at(0)!.duration).toBe(1000);
    });

    it('should upsert a live toast on create with the same id', () => {
      const t = createToaster();
      const events: string[] = [];
      const seen: unknown[] = [];
      t.subscribe((e) => {
        events.push(e.type);
        seen.push(e);
      });
      t.message('old', { id: 'x' });

      t.create('new', { id: 'x' });

      expect(t.getSnapshot()).toHaveLength(1);
      expect(t.getSnapshot().at(0)!.content).toBe('new');
      expect(events).toEqual(['added', 'updated']);
      // An upsert is stamped as such: presenters reopen only for these.
      expect(seen.at(-1)).toMatchObject({ type: 'updated', via: 'create' });
    });

    it('should update dismissible on upsert of a live toast', () => {
      const t = createToaster();
      const id = t.create('old');

      t.create('new', { id, dismissible: false });

      expect(t.getSnapshot().at(0)!.dismissible).toBe(false);
    });

    it('should keep dismissible untouched when the upsert omits it', () => {
      const t = createToaster();
      const id = t.create('old', { dismissible: false });

      t.create('new', { id });

      expect(t.getSnapshot().at(0)!.dismissible).toBe(false);
    });
  });

  describe('dismissible', () => {
    it('should default to true for every type but loading', () => {
      const t = createToaster();
      const message = t.message('m');
      const loading = t.loading('l');

      expect(t.getSnapshot().find((x) => x.id === message)!.dismissible).toBe(
        true
      );
      expect(t.getSnapshot().find((x) => x.id === loading)!.dismissible).toBe(
        false
      );
    });

    it('should honor an explicit dismissible on a loading toast', () => {
      const t = createToaster();
      t.loading('l', { dismissible: true });

      expect(t.getSnapshot().at(0)!.dismissible).toBe(true);
    });

    it('should re-derive dismissible from the new type on update', () => {
      const t = createToaster();
      const id = t.loading('l');

      t.update(id, { type: 'success' });
      expect(t.getSnapshot().at(0)!.dismissible).toBe(true);

      t.update(id, { type: 'loading' });
      expect(t.getSnapshot().at(0)!.dismissible).toBe(false);
    });

    it('should keep dismissible across content-only updates', () => {
      const t = createToaster();
      const id = t.message('m', { dismissible: false });

      t.update(id, { content: 'changed' });

      expect(t.getSnapshot().at(0)!.dismissible).toBe(false);
    });

    it('should let an explicit patch win over the type default', () => {
      const t = createToaster();
      const id = t.message('m');

      t.update(id, { type: 'loading', dismissible: true });

      expect(t.getSnapshot().at(0)!.dismissible).toBe(true);
    });

    it('should still remove a loading toast programmatically', () => {
      const t = createToaster();
      const id = t.loading('l');

      t.remove(id);

      expect(t.getSnapshot()).toEqual([]);
    });
  });

  describe('update', () => {
    it('should carry the patch on the updated event', () => {
      const t = createToaster();
      const id = t.message('a');
      const events: unknown[] = [];
      t.subscribe((e) => events.push(e));

      t.update(id, { duration: 4000 });

      expect(events.at(0)).toMatchObject({
        type: 'updated',
        patch: { duration: 4000 },
        prev: { content: 'a' },
        entry: { content: 'a', duration: 4000 },
        via: 'update',
      });
    });

    it('should re-derive duration from the new type', () => {
      const t = createToaster();
      const id = t.loading('l');

      t.update(id, { type: 'success' });

      expect(t.getSnapshot().at(0)!.duration).toBe(4000);
    });

    it('should keep an explicit duration across a type change', () => {
      const t = createToaster();
      const id = t.loading('l');

      t.update(id, { type: 'success', duration: 1000 });

      expect(t.getSnapshot().at(0)!.duration).toBe(1000);
    });
  });

  describe('remove', () => {
    it('should remove a toast from the snapshot and emit removed', () => {
      const t = createToaster();
      const events: string[] = [];
      t.subscribe((e) => events.push(e.type));
      const id = t.create('a');

      t.remove(id);

      expect(t.getSnapshot()).toEqual([]);
      expect(events).toEqual(['added', 'removed']);
    });

    it('should remove every toast when called without arguments', () => {
      const t = createToaster();
      t.create('a');
      t.create('b');

      t.remove();

      expect(t.getSnapshot()).toEqual([]);
    });

    it('should warn and do nothing when remove receives explicit undefined', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();
      t.create('a');

      t.remove(undefined as unknown as string);

      expect(t.getSnapshot()).toHaveLength(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('did you mean remove()?')
      );
      warn.mockRestore();
    });

    it('should remove only the listed toasts in a single commit', () => {
      const t = createToaster();
      const a = t.create('a');
      t.create('b');
      const c = t.create('c');
      const batches: number[] = [];
      let snapshots = 0;
      t.subscribe(() => {
        snapshots += 1;
      });

      t.remove([a, c]);
      batches.push(snapshots);

      expect(t.getSnapshot().map((x) => x.content)).toEqual(['b']);
      expect(batches).toEqual([2]); // two events, one batch
    });

    it('should deduplicate ids within one call', () => {
      const t = createToaster();
      const events: string[] = [];
      t.subscribe((e) => events.push(e.type));
      const id = t.create('a');

      t.remove([id, id]);

      expect(events.filter((e) => e === 'removed')).toHaveLength(1);
    });

    it('should do nothing when remove receives an empty array', () => {
      const t = createToaster();
      const events: string[] = [];
      t.subscribe((e) => events.push(e.type));
      t.create('a');

      t.remove([]);

      expect(t.getSnapshot()).toHaveLength(1);
      expect(events).toEqual(['added']);
    });

    it('should treat remove on a gone id as a silent no-op', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();

      expect(() => t.remove('nope')).not.toThrow();
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('dev warnings', () => {
    it('should warn and do nothing when update targets a missing toast', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();

      t.update('nope', { content: 'x' });

      expect(t.getSnapshot()).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('toast not found'),
        'nope'
      );
      warn.mockRestore();
    });

    it('should warn and generate an id when an empty string id is passed', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();

      const id = t.create('a', { id: '' });

      expect(id).toMatch(/^t-/);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('empty string id')
      );
      warn.mockRestore();
    });
  });

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

    it('should address the toast by the given id', async () => {
      const t = createToaster();
      const p = t.promise(
        Promise.resolve('ok'),
        { loading: 'wait', success: 'done' },
        { id: 'upload' }
      );

      expect(t.getSnapshot().at(0)!.id).toBe('upload');
      await p;
      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.content).toBe('done')
      );
      expect(t.getSnapshot().at(0)!.id).toBe('upload');
    });

    it('should upsert over a live toast with the same id', () => {
      const t = createToaster();
      t.message('draft', { id: 'doc' });

      t.promise(new Promise(() => {}), { loading: 'saving' }, { id: 'doc' });

      expect(t.getSnapshot()).toHaveLength(1);
      expect(t.getSnapshot().at(0)!.type).toBe('loading');
      expect(t.getSnapshot().at(0)!.content).toBe('saving');
    });

    it('should let dismissible open the loading phase', () => {
      const t = createToaster();
      t.promise(
        new Promise(() => {}),
        { loading: 'wait' },
        { dismissible: true }
      );

      expect(t.getSnapshot().at(0)!.dismissible).toBe(true);
    });

    it('should lock the loading phase and unlock the settled one', async () => {
      const t = createToaster();
      const p = t.promise(Promise.resolve('ok'), {
        loading: 'wait',
        success: 'done',
      });

      // While pending the user cannot close it: the outcome is unknown.
      expect(t.getSnapshot().at(0)!.dismissible).toBe(false);

      await p;
      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.type).toBe('success')
      );
      // The result is an ordinary toast again.
      expect(t.getSnapshot().at(0)!.dismissible).toBe(true);
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
        error: (e) => `failed: ${(e as Error).message}`,
      });

      await expect(p).rejects.toBe(boom);
      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.content).toBe('failed: boom')
      );
      expect(t.getSnapshot().at(0)!.type).toBe('error');
    });

    it('should keep loading until an async factory resolves', async () => {
      const t = createToaster();
      let release!: (value: string) => void;
      const gate = new Promise<string>((resolve) => {
        release = resolve;
      });

      const p = t.promise(Promise.resolve(1), {
        loading: 'wait',
        success: () => gate,
      });
      await p;
      await Promise.resolve();

      expect(t.getSnapshot().at(0)!.type).toBe('loading');

      release('late');
      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.content).toBe('late')
      );
    });

    it('should remove the toast when the settled phase is omitted', async () => {
      const t = createToaster();

      await t.promise(Promise.resolve('ok'), { loading: 'wait' });

      await vi.waitFor(() => expect(t.getSnapshot()).toEqual([]));
    });

    it('should fall through to the error phase when the success factory fails', async () => {
      const t = createToaster();
      const p = t.promise(Promise.resolve('ok'), {
        loading: 'wait',
        success: () => {
          throw new Error('render failed');
        },
        error: (e) => `error: ${(e as Error).message}`,
      });

      await p;
      await vi.waitFor(() =>
        expect(t.getSnapshot().at(0)!.content).toBe('error: render failed')
      );
    });

    it('should remove and warn when the error phase factory fails too', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const t = createToaster();
      const p = t.promise(Promise.reject(new Error('boom')), {
        loading: 'wait',
        error: () => {
          throw new Error('also broken');
        },
      });

      await expect(p).rejects.toThrow('boom');
      await vi.waitFor(() => expect(t.getSnapshot()).toEqual([]));
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('error phase factory failed'),
        expect.any(Error)
      );
      warn.mockRestore();
    });

    it('should silently skip settling a toast that was removed meanwhile', async () => {
      const t = createToaster();
      let release!: (value: string) => void;
      const gate = new Promise<string>((resolve) => {
        release = resolve;
      });
      const p = t.promise(gate, { loading: 'wait', success: 'done' });

      t.remove(t.getSnapshot().at(0)!.id);
      release('ok');
      await p;
      await Promise.resolve();
      await Promise.resolve();

      expect(t.getSnapshot()).toEqual([]);
    });
  });
});
