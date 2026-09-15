import * as React from 'react';

function ThemeToggle() {
  const override = React.useSyncExternalStore(
    subscribeOverride,
    readOverride,
    readServerOverride
  );
  const systemDark = React.useSyncExternalStore(
    subscribeSystem,
    readSystemDark,
    readServerSystemDark
  );

  const dark = (override ?? (systemDark ? 'dark' : 'light')) === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const next = dark ? 'light' : 'dark';

        const nextOverride =
          next === (systemDark ? 'dark' : 'light') ? null : next;

        applyOverride(nextOverride);
      }}
    >
      <span data-label="dark">Dark</span>
      <span data-label="light">Light</span>
    </button>
  );
}

export { ThemeToggle };

// utils

const THEME_KEY = 'cincin:theme';

const listeners = new Set<() => void>();

function applyOverride(next: 'light' | 'dark' | null) {
  if (next !== null) {
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.dataset.theme = next;
  } else {
    localStorage.removeItem(THEME_KEY);
    delete document.documentElement.dataset.theme;
  }

  document.documentElement.style.colorScheme = next ?? '';
  listeners.forEach((notify) => notify());
}

function subscribeOverride(onChange: () => void) {
  listeners.add(onChange);

  return () => {
    listeners.delete(onChange);
  };
}

function readOverride(): 'light' | 'dark' | null {
  const stored = localStorage.getItem(THEME_KEY);

  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return null;
}

function readServerOverride(): 'light' | 'dark' | null {
  return null;
}

function subscribeSystem(onChange: () => void) {
  const media = matchDark();

  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
}

function readSystemDark(): boolean {
  return matchDark().matches;
}

function readServerSystemDark(): boolean {
  return false;
}

function matchDark(): MediaQueryList {
  return window.matchMedia('(prefers-color-scheme: dark)');
}
