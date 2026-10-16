import * as React from 'react';

function useMediaQuery(query: string): boolean | undefined {
  return React.useSyncExternalStore(
    React.useCallback(
      (callback) => {
        const mediaQueryList = listOf(query);
        mediaQueryList.addEventListener('change', callback);

        return () => mediaQueryList.removeEventListener('change', callback);
      },
      [query]
    ),
    () => listOf(query).matches,
    () => undefined
  );
}

export { useMediaQuery };

// utils

const lists = new Map<string, MediaQueryList>();

function listOf(query: string): MediaQueryList {
  let mediaQueryList = lists.get(query);

  if (mediaQueryList === undefined) {
    mediaQueryList = window.matchMedia(query);
    lists.set(query, mediaQueryList);
  }

  return mediaQueryList;
}
