// The quick start: a ready-to-use toaster over the package singleton.
// The stylesheet travels through the consumer's bundler via this
// import, so one entry brings both the component and its skin. The
// headless building blocks live in 'cincin-react/core'.
import './toaster/styles.css';

export { Toaster } from './toaster/toaster';
export { toast } from './toaster/toast';
export type {
  ToastContent,
  ToastAction,
  ToasterLabels,
} from './toaster/content';
