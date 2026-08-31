import { createRoot } from 'react-dom/client';
import * as React from 'react';
import { App } from './app';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
