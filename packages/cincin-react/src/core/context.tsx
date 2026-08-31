'use client';

import type { Toaster, ToastEntry } from 'cincin';
import * as React from 'react';
import type { ReactNode } from 'react';
import { useToastEntries as useToastEntriesOf } from './use-toast-entries';

function createToasterContext<Content extends {} = string>(
  defaultToaster?: Toaster<Content>
) {
  const Context = React.createContext<Toaster<Content> | null>(
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
    const fromContext = React.useContext(Context);
    const resolved = toaster ?? fromContext ?? null; // Normalize both nullish values: a JS consumer can mount the provider with an undefined toaster.

    if (resolved === null) {
      throw new Error(
        '[cincin] no toaster available. Pass one to createToasterContext, wrap the tree in <ToasterProvider>, or provide an instance explicitly.'
      );
    }

    return resolved;
  }

  function useToastEntries(
    toaster?: Toaster<Content>
  ): ReadonlyArray<ToastEntry<Content>> {
    const instance = useToaster(toaster);

    return useToastEntriesOf(instance);
  }

  return { ToasterProvider, useToaster, useToastEntries };
}

export { createToasterContext };
