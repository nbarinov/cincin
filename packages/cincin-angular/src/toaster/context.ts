import { createToasterContext } from 'cincin-angular/core';
import type { ToastContent } from './content';
import { toast } from './toast';

// The skin's toaster travels through DI, the Angular way for an
// instance shared down a tree: an input would land after the
// constructor, and the presenter is built on the toaster once.
const { provideToaster, injectToaster } =
  createToasterContext<ToastContent>(toast);

export { provideToaster, injectToaster };
