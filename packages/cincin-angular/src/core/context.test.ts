import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Provider } from '@angular/core';
import { render } from '@testing-library/angular';
import { createToaster } from 'cincin';
import type { Toaster } from 'cincin';
import { createToasterContext } from './context';

/** Runs `use` in a component's constructor under the given providers:
 * the injection travels the injector chain, like a real tree. */
async function renderWith<T>(providers: Provider[], use: () => T): Promise<T> {
  let result: T | undefined;

  @Component({ template: '' })
  class Host {
    constructor() {
      result = use();
    }
  }

  await render(Host, { providers });

  if (result === undefined) {
    throw new Error('the host never ran');
  }

  return result;
}

describe('createToasterContext', () => {
  describe('instance resolution', () => {
    it('should throw when no toaster is available anywhere', async () => {
      const { injectToaster } = createToasterContext();

      await expect(renderWith([], () => injectToaster())).rejects.toThrow(
        'no toaster available'
      );
    });

    it('should throw the designed error for a provider with an undefined toaster', async () => {
      const { provideToaster, injectToaster } = createToasterContext();

      await expect(
        // A plain-JS consumer can provide a missing instance.
        renderWith([provideToaster(undefined as never)], () => injectToaster())
      ).rejects.toThrow('no toaster available');
    });

    it('should fall back to the factory default without a provider', async () => {
      const toaster = createToaster();
      const { injectToaster } = createToasterContext(toaster);

      const resolved = await renderWith([], () => injectToaster());
      expect(resolved).toBe(toaster);
    });

    it('should take the instance from the provider', async () => {
      const toaster = createToaster();
      const { provideToaster, injectToaster } = createToasterContext();

      const resolved = await renderWith([provideToaster(toaster)], () =>
        injectToaster()
      );
      expect(resolved).toBe(toaster);
    });

    it('should let the provider override the factory default', async () => {
      const fallback = createToaster();
      const override = createToaster();
      const { provideToaster, injectToaster } = createToasterContext(fallback);

      const resolved = await renderWith([provideToaster(override)], () =>
        injectToaster()
      );
      expect(resolved).toBe(override);
    });

    it('should let an explicit instance win over everything', async () => {
      const fallback = createToaster();
      const provided = createToaster();
      const explicit = createToaster();
      const { provideToaster, injectToaster } = createToasterContext(fallback);

      const resolved = await renderWith([provideToaster(provided)], () =>
        injectToaster(explicit)
      );
      expect(resolved).toBe(explicit);
    });
  });

  describe('injectToastEntries', () => {
    it('should expose the snapshot and follow commits', async () => {
      const toaster = createToaster();
      const { injectToastEntries } = createToasterContext(toaster);

      const entries = await renderWith([], () => injectToastEntries());
      expect(entries()).toEqual([]);

      toaster.success('saved');
      TestBed.tick();
      expect(entries()).toHaveLength(1);
      expect(entries().at(0)).toMatchObject({
        content: 'saved',
        type: 'success',
      });
    });

    it('should keep the same array reference between reads without commits', async () => {
      const toaster = createToaster();
      const { injectToastEntries } = createToasterContext(toaster);

      const entries = await renderWith([], () => injectToastEntries());
      toaster.info('hi');

      expect(entries()).toBe(entries()); // stable snapshot reference
      expect(entries()).toBe(toaster.getSnapshot());
    });

    it('should follow update and remove commits', async () => {
      const toaster = createToaster();
      const { injectToastEntries } = createToasterContext(toaster);

      const entries = await renderWith([], () => injectToastEntries());
      const id = toaster.create('bye');
      toaster.update(id, { content: 'updated' });
      expect(entries().at(0)?.content).toBe('updated');

      toaster.remove(id);
      expect(entries()).toEqual([]);
    });
  });

  it('should scope injections per context: two contexts do not collide', async () => {
    const first = createToaster();
    const second: Toaster<{ body: string }> = createToaster();
    const firstContext = createToasterContext<string>();
    const secondContext = createToasterContext<{ body: string }>();

    const resolved = await renderWith(
      [
        firstContext.provideToaster(first),
        secondContext.provideToaster(second),
      ],
      () => ({
        first: firstContext.injectToaster(),
        second: secondContext.injectToaster(),
      })
    );

    expect(resolved.first).toBe(first);
    expect(resolved.second).toBe(second);
  });
});
