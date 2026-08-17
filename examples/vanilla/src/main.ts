import { createToaster } from 'cincin';
import { mountToastRegion } from './renderer';
import { mountThemeToggle } from './theme';

const toaster = createToaster({ max: 5 });

mountToastRegion(toaster, document.querySelector('#toasts')!);
mountThemeToggle(document.querySelector('#theme-toggle')!);

let counter = 0;

document.querySelector('#toast-message')!.addEventListener('click', () => {
  counter += 1;
  toaster.message(`Plain toast #${counter}`);
});

document
  .querySelector('#toast-success')!
  .addEventListener('click', () => toaster.success('Saved'));

document
  .querySelector('#toast-error')!
  .addEventListener('click', () => toaster.error('Something broke'));

document
  .querySelector('#toast-sticky')!
  .addEventListener('click', () =>
    toaster.info('Sticky: swipe right or hit ✕', { duration: Infinity })
  );

document.querySelector('#toast-update')!.addEventListener('click', () => {
  const id = toaster.loading('Working…', { duration: Infinity });

  setTimeout(() => {
    toaster.update(id, { type: 'success', content: 'Done', duration: 3000 });
  }, 1500);
});

document.querySelector('#toast-promise')!.addEventListener('click', () => {
  toaster
    .promise(fakeRequest(), {
      loading: 'Uploading…',
      success: (ms) => `Uploaded in ${Math.round(ms)}ms`,
      error: () => 'Upload failed',
    })
    .catch(() => {
      // The rejection is already reported as an error toast.
    });
});

document.querySelector('#toast-burst')!.addEventListener('click', () => {
  for (let i = 1; i <= 8; i += 1) {
    counter += 1;
    toaster.message(`Burst ${i}/8 (#${counter})`);
  }
});

document
  .querySelector('#toast-dismiss-all')!
  .addEventListener('click', () => toaster.dismiss());

function fakeRequest(): Promise<number> {
  const duration = 800 + Math.random() * 1200;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.3) {
        reject(new Error('flaky network'));
      } else {
        resolve(duration);
      }
    }, duration);
  });
}
