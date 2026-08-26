import { useEffect, useState } from 'react';

/**
 * Mirrors the vanilla example's toggle (same storage key): an override
 * pins `color-scheme` on the root, no override follows the OS. The
 * pre-paint script in index.html applies a stored override before the
 * first frame, so this component only has to keep it in sync.
 */
function ThemeToggle() {
  const [override, setOverride] = useState<'light' | 'dark' | null>(() =>
    readOverride()
  );
  const [systemDark, setSystemDark] = useState(() => matchDark().matches);

  useEffect(function sync() {
    const media = matchDark();
    const onChange = () => setSystemDark(media.matches);

    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  const dark = (override ?? (systemDark ? 'dark' : 'light')) === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const next = dark ? 'light' : 'dark';

        // Back on the system's own scheme: drop the override entirely.
        const nextOverride =
          next === (systemDark ? 'dark' : 'light') ? null : next;

        applyOverride(nextOverride);
        setOverride(nextOverride);
      }}
    >
      {dark ? 'Light' : 'Dark'}
    </button>
  );
}

export { ThemeToggle };

// utils

const THEME_KEY = 'cincin:theme';

/**
 * The single writer for the override, mirroring the pre-paint script
 * in index.html: both must agree on the storage key and the root
 * `color-scheme`. No override clears the inline style, so the CSS
 * `light dark` takes over and follows the OS.
 */
function applyOverride(next: 'light' | 'dark' | null) {
  if (next !== null) {
    localStorage.setItem(THEME_KEY, next);
  } else {
    localStorage.removeItem(THEME_KEY);
  }

  document.documentElement.style.colorScheme = next ?? '';
}

function readOverride(): 'light' | 'dark' | null {
  const stored = localStorage.getItem(THEME_KEY);

  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return null;
}

function matchDark(): MediaQueryList {
  return window.matchMedia('(prefers-color-scheme: dark)');
}
