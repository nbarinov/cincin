import { createRoot } from 'react-dom/client';
import * as React from 'react';
import { App } from './app';
import './page.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
