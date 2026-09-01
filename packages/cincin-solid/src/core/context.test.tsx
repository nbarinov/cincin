import { cleanup, render } from '@solidjs/testing-library';
import { createToaster } from 'cincin';
import type { Toaster } from 'cincin';
import type { JSX } from 'solid-js';
import { createToasterContext } from './context';

/** Runs `use` in a child's setup under a wrapping parent (a provider,
 * usually): the context travels one level, like a real tree. The
 * children ride as a closure on purpose — an eager `<Child />`
 * argument would run before the provider exists (Solid JSX creates
 * components at the call site), while `{children()}` inside the
 * wrapper's JSX compiles to a lazy getter under the provider's scope. */
function renderTree<T>(
  wrap: ((children: () => JSX.Element) => JSX.Element) | null,
  use: () => T
): T {
  let result!: T;

  const Child = () => {
    result = use();
    return <div />;
  };

  render(() => (wrap === null ? <Child /> : wrap(() => <Child />)));

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
      const { ToasterProvider, useToaster } = createToasterContext();

      expect(() =>
        renderTree(
          // A plain-JS consumer can mount the provider with a missing instance.
          (children) => (
            <ToasterProvider toaster={undefined as never}>
              {children()}
            </ToasterProvider>
          ),
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
      const { ToasterProvider, useToaster } = createToasterContext();

      const resolved = renderTree(
        (children) => (
          <ToasterProvider toaster={toaster}>{children()}</ToasterProvider>
        ),
        () => useToaster()
      );

      expect(resolved).toBe(toaster);
    });

    it('should let the provider override the factory default', () => {
      const fallback = createToaster();
      const override = createToaster();
      const { ToasterProvider, useToaster } = createToasterContext(fallback);

      const resolved = renderTree(
        (children) => (
          <ToasterProvider toaster={override}>{children()}</ToasterProvider>
        ),
        () => useToaster()
      );

      expect(resolved).toBe(override);
    });

    it('should let an explicit instance win over everything', () => {
      const fallback = createToaster();
      const provided = createToaster();
      const explicit = createToaster();
      const { ToasterProvider, useToaster } = createToasterContext(fallback);

      const resolved = renderTree(
        (children) => (
          <ToasterProvider toaster={provided}>{children()}</ToasterProvider>
        ),
        () => useToaster(explicit)
      );

      expect(resolved).toBe(explicit);
    });
  });

  describe('useToastEntries', () => {
    it('should expose the snapshot and follow commits', () => {
      const toaster = createToaster();
      const { useToastEntries } = createToasterContext(toaster);

      const entries = renderTree(null, () => useToastEntries());
      expect(entries()).toEqual([]);

      toaster.success('saved');

      expect(entries()).toHaveLength(1);
      expect(entries().at(0)!).toMatchObject({
        content: 'saved',
        type: 'success',
      });
    });

    it('should keep the same array reference between reads without commits', () => {
      const toaster = createToaster();
      const { useToastEntries } = createToasterContext(toaster);

      const entries = renderTree(null, () => useToastEntries());
      toaster.info('hi');

      expect(entries()).toBe(entries()); // stable snapshot reference
      expect(entries()).toBe(toaster.getSnapshot());
    });

    it('should follow update and remove commits', () => {
      const toaster = createToaster();
      const { useToastEntries } = createToasterContext(toaster);

      const entries = renderTree(null, () => useToastEntries());

      const id = toaster.create('bye');
      toaster.update(id, { content: 'updated' });
      expect(entries().at(0)!.content).toBe('updated');

      toaster.remove(id);
      expect(entries()).toEqual([]);
    });
  });

  it('should scope contexts per factory: two contexts do not collide', () => {
    const first = createToaster();
    const second = createToaster() as Toaster<{ body: string }>;
    const firstContext = createToasterContext<string>();
    const secondContext = createToasterContext<{ body: string }>();

    let resolvedFirst!: Toaster<string>;
    let resolvedSecond!: Toaster<{ body: string }>;

    const Child = () => {
      resolvedFirst = firstContext.useToaster();
      resolvedSecond = secondContext.useToaster();
      return <div />;
    };

    render(() => (
      <firstContext.ToasterProvider toaster={first}>
        <secondContext.ToasterProvider toaster={second}>
          <Child />
        </secondContext.ToasterProvider>
      </firstContext.ToasterProvider>
    ));

    expect(resolvedFirst).toBe(first);
    expect(resolvedSecond).toBe(second);
  });
});
