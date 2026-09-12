// The quick start: a ready-to-use toaster over the package singleton.
// The stylesheet is inlined into the component by the Angular
// compiler, so one import brings both the component and its skin. The
// headless building blocks live in 'cincin-angular/core'.
export { Toaster } from './toaster/toaster';
export { toast } from './toaster/toast';
export { provideToaster } from './toaster/context';
export type {
  ToastContent,
  ToastAction,
  ToasterLabels,
} from './toaster/content';
export type { ToasterPosition } from 'cincin-skin';
