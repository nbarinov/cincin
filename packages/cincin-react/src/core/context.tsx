'use client';

import type { Toaster, Toast } from 'cincin';
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

function createToasterContext<Content extends {} = string>(
  defaultToaster?: Toaster<Content>
) {
  const Context = createContext<Toaster<Content> | null>(
    defaultToaster ?? null
  );

  function ToasterProvider(props: {
    toaster: Toaster<Content>;
    children: ReactNode;
  }) {
    return (
      <Context.Provider value={props.toaster}>
        {props.children}
      </Context.Provider>
    );
  }

  function useToaster(toaster?: Toaster<Content>): Toaster<Content> {
    const fromContext = useContext(Context);
    const resolved = toaster ?? fromContext ?? null; // Normalize both nullish values: a JS consumer can mount the provider with an undefined toaster.

    if (resolved === null) {
      throw new Error(
        '[cincin] no toaster available. Pass one to createToasterContext, wrap the tree in <ToasterProvider>, or provide an instance explicitly.'
      );
    }

    return resolved;
  }

  function useToasts(
    toaster?: Toaster<Content>
  ): ReadonlyArray<Toast<Content>> {
    const instance = useToaster(toaster);

    return useSyncExternalStore(
      instance.subscribe,
      instance.getSnapshot,
      getServerSnapshot
    );
  }

  return { ToasterProvider, useToaster, useToasts };
}

export { createToasterContext };

const EMPTY_SNAPSHOT: ReadonlyArray<never> = Object.freeze([]);

const getServerSnapshot = (): ReadonlyArray<never> => EMPTY_SNAPSHOT;
