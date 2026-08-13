import { act, renderHook } from '@testing-library/react';
import { createToaster } from 'cincin';
import type { ReactNode } from 'react';

import { createToasterContext } from './context';

describe('createToasterContext', () => {
  describe('instance resolution', () => {
    it('should throw when no toaster is available anywhere', () => {
      const { useToaster } = createToasterContext();

      expect(() => renderHook(() => useToaster())).toThrow(
        'no toaster available'
      );
    });

    it('should fall back to the factory default without a provider', () => {
      const toaster = createToaster();
      const { useToaster } = createToasterContext(toaster);

      const { result } = renderHook(() => useToaster());

      expect(result.current).toBe(toaster);
    });

    it('should take the instance from the provider', () => {
      const toaster = createToaster();
      const { ToasterProvider, useToaster } = createToasterContext();

      const { result } = renderHook(() => useToaster(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ToasterProvider toaster={toaster}>{children}</ToasterProvider>
        ),
      });

      expect(result.current).toBe(toaster);
    });

    it('should let the provider override the factory default', () => {
      const fallback = createToaster();
      const override = createToaster();
      const { ToasterProvider, useToaster } = createToasterContext(fallback);

      const { result } = renderHook(() => useToaster(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ToasterProvider toaster={override}>{children}</ToasterProvider>
        ),
      });

      expect(result.current).toBe(override);
    });

    it('should let an explicit instance win over everything', () => {
      const fallback = createToaster();
      const explicit = createToaster();
      const { useToaster } = createToasterContext(fallback);

      const { result } = renderHook(() => useToaster(explicit));

      expect(result.current).toBe(explicit);
    });
  });

  describe('useToasts', () => {
    it('should expose the snapshot and rerender on commits', () => {
      const toaster = createToaster();
      const { useToasts } = createToasterContext(toaster);

      const { result } = renderHook(() => useToasts());
      expect(result.current).toEqual([]);

      act(() => {
        toaster.success('saved');
      });

      expect(result.current).toHaveLength(1);
      expect(result.current.at(0)!).toMatchObject({
        content: 'saved',
        type: 'success',
        status: 'active',
      });
    });

    it('should keep the same array reference between renders without commits', () => {
      const toaster = createToaster();
      const { useToasts } = createToasterContext(toaster);

      const { result, rerender } = renderHook(() => useToasts());
      act(() => {
        toaster.info('hi');
      });

      const first = result.current;
      rerender();

      expect(result.current).toBe(first); // uSES contract end to end
    });

    it('should rerender on dismiss and remove phases', () => {
      const toaster = createToaster();
      const { useToasts } = createToasterContext(toaster);

      const { result } = renderHook(() => useToasts());

      let id!: ReturnType<typeof toaster.create>;
      act(() => {
        id = toaster.create('bye');
      });

      act(() => {
        toaster.dismiss(id);
      });
      expect(result.current.at(0)!.status).toBe('dismissing');

      act(() => {
        toaster.remove(id);
      });
      expect(result.current).toEqual([]);
    });
  });
});
