import { Subscribable } from './subscribable';

type Theme = 'light' | 'dark';

const THEME_KEY = 'cincin:theme';

class ThemeStore extends Subscribable {
  constructor() {
    super();

    this.getSnapshot = this.getSnapshot.bind(this);
    this.getServerSnapshot = this.getServerSnapshot.bind(this);
    this.getPrepaintedSnapshot = this.getPrepaintedSnapshot.bind(this);
  }

  getSnapshot(): Theme | null {
    return parseTheme(localStorage.getItem(THEME_KEY));
  }

  getServerSnapshot(): Theme | null {
    return null;
  }

  getPrepaintedSnapshot(): Theme | null {
    if (typeof document === 'undefined') {
      return null;
    }

    return parseTheme(document.documentElement.dataset.colorScheme);
  }

  apply(next: Theme | null): void {
    if (next === null) {
      localStorage.removeItem(THEME_KEY);
    } else {
      localStorage.setItem(THEME_KEY, next);
    }

    this.notify();
  }

  protected override onSubscribe(): void {
    if (this.listeners.size === 1) {
      window.addEventListener('storage', this.onStorage);
    }
  }

  protected override onUnsubscribe(): void {
    if (this.listeners.size === 0) {
      window.removeEventListener('storage', this.onStorage);
    }
  }

  private onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === null) {
      this.notify();
    }
  };
}

const theme = new ThemeStore();

export { THEME_KEY, theme };
export type { Theme };

// utils

function parseTheme(value: string | null | undefined): Theme | null {
  if (value === 'light' || value === 'dark') {
    return value;
  }

  return null;
}
