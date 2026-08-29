import { cleanup, render } from '@testing-library/vue';
import { createToaster } from 'cincin';
import type { Toaster } from 'cincin';
import { defineComponent, h, nextTick } from 'vue';
import { createToasterContext } from './context';

/** Runs `use` in a child's setup under a parent that runs `provide` in
 * its own: the injection travels one level, like a real tree. */
function renderTree<T>(provide: (() => void) | null, use: () => T): T {
  let result!: T;

  const Child = defineComponent({
    setup() {
      result = use();
    },
    // An options-level render, not a setup-returned one: the throw
    // cases leave setup without a return, and Vue would warn about a
    // missing template mid-unwind.
    render: () => h('div'),
  });

  const Parent = defineComponent({
    setup() {
      provide?.();
      return () => h(Child);
    },
  });

  render(Parent);

  return result;
}

afterEach(() => {
  cleanup();
});

describe('createToasterContext', () => {
  describe('instance resolution', () => {
    it('should throw when no toaster is available anywhere', () => {
      const { useToaster } = createToasterContext();

      expect(() => renderTree(null, () => useToaster())).toThrow(
        'no toaster available'
      );
    });

    it('should throw the designed error for a provider with an undefined toaster', () => {
      const { provideToaster, useToaster } = createToasterContext();

      expect(() =>
        renderTree(
          // A plain-JS consumer can provide a missing instance.
          () => provideToaster(undefined as never),
          () => useToaster()
        )
      ).toThrow('no toaster available');
    });

    it('should fall back to the factory default without a provider', () => {
      const toaster = createToaster();
      const { useToaster } = createToasterContext(toaster);

      const resolved = renderTree(null, () => useToaster());

      expect(resolved).toBe(toaster);
    });

    it('should take the instance from the provider', () => {
      const toaster = createToaster();
      const { provideToaster, useToaster } = createToasterContext();

      const resolved = renderTree(
        () => provideToaster(toaster),
        () => useToaster()
      );

      expect(resolved).toBe(toaster);
    });

    it('should let the provider override the factory default', () => {
      const fallback = createToaster();
      const override = createToaster();
      const { provideToaster, useToaster } = createToasterContext(fallback);

      const resolved = renderTree(
        () => provideToaster(override),
        () => useToaster()
      );

      expect(resolved).toBe(override);
    });

    it('should let an explicit instance win over everything', () => {
      const fallback = createToaster();
      const provided = createToaster();
      const explicit = createToaster();
      const { provideToaster, useToaster } = createToasterContext(fallback);

      const resolved = renderTree(
        () => provideToaster(provided),
        () => useToaster(explicit)
      );

      expect(resolved).toBe(explicit);
    });
  });

  describe('useToastEntries', () => {
    it('should expose the snapshot and follow commits', async () => {
      const toaster = createToaster();
      const { useToastEntries } = createToasterContext(toaster);

      const entries = renderTree(null, () => useToastEntries());
      expect(entries.value).toEqual([]);

      toaster.success('saved');
      await nextTick();

      expect(entries.value).toHaveLength(1);
      expect(entries.value.at(0)!).toMatchObject({
        content: 'saved',
        type: 'success',
      });
    });

    it('should keep the same array reference between reads without commits', () => {
      const toaster = createToaster();
      const { useToastEntries } = createToasterContext(toaster);

      const entries = renderTree(null, () => useToastEntries());
      toaster.info('hi');

      expect(entries.value).toBe(entries.value); // stable snapshot reference
      expect(entries.value).toBe(toaster.getSnapshot());
    });

    it('should follow update and remove commits', () => {
      const toaster = createToaster();
      const { useToastEntries } = createToasterContext(toaster);

      const entries = renderTree(null, () => useToastEntries());

      const id = toaster.create('bye');
      toaster.update(id, { content: 'updated' });
      expect(entries.value.at(0)!.content).toBe('updated');

      toaster.remove(id);
      expect(entries.value).toEqual([]);
    });
  });

  it('should scope injections per context: two contexts do not collide', () => {
    const first = createToaster();
    const second = createToaster() as Toaster<{ body: string }>;
    const firstContext = createToasterContext<string>();
    const secondContext = createToasterContext<{ body: string }>();

    let resolvedFirst!: Toaster<string>;
    let resolvedSecond!: Toaster<{ body: string }>;

    const Child = defineComponent({
      setup() {
        resolvedFirst = firstContext.useToaster();
        resolvedSecond = secondContext.useToaster();
        return () => h('div');
      },
    });

    const Parent = defineComponent({
      setup() {
        firstContext.provideToaster(first);
        secondContext.provideToaster(second);
        return () => h(Child);
      },
    });

    render(Parent);

    expect(resolvedFirst).toBe(first);
    expect(resolvedSecond).toBe(second);
  });
});
