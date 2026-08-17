// The built core must import and run on bare Node: this probe fails if
// a DOM global ever leaks into the core's module scope or into the
// create/read paths. Run it after a build; CI and `pnpm check` share it.
import { createToaster } from '../packages/cincin/dist/index.mjs';

const toaster = createToaster();
toaster.message('ci probe');

if (toaster.getSnapshot().length !== 1) {
  throw new Error('snapshot mismatch');
}

toaster.destroy();
console.log('The core is clean on bare Node.');
