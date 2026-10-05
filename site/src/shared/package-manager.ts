import { Subscribable } from './subscribable';

const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;
const PACKAGE_MANAGER_KEY = 'cincin:pm';

type PackageManager = (typeof PACKAGE_MANAGERS)[number];

class PackageManagerStore extends Subscribable {
  constructor() {
    super();

    this.getSnapshot = this.getSnapshot.bind(this);
    this.getServerSnapshot = this.getServerSnapshot.bind(this);
  }

  getSnapshot(): PackageManager | null {
    return parsePackageManager(localStorage.getItem(PACKAGE_MANAGER_KEY));
  }

  getServerSnapshot(): PackageManager | null {
    return null;
  }

  apply(next: PackageManager): void {
    localStorage.setItem(PACKAGE_MANAGER_KEY, next);
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
    if (event.key === PACKAGE_MANAGER_KEY || event.key === null) {
      this.notify();
    }
  };
}

const packageManager = new PackageManagerStore();

function isPackageManager(value: unknown): value is PackageManager {
  return PACKAGE_MANAGERS.some((manager) => manager === value);
}

export {
  PACKAGE_MANAGER_KEY,
  PACKAGE_MANAGERS,
  isPackageManager,
  packageManager,
};
export type { PackageManager };

// utils

// Anything can sit in storage; only a known manager counts.
function parsePackageManager(value: string | null): PackageManager | null {
  return isPackageManager(value) ? value : null;
}
