import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Studio from './studio/Studio';
import 'katex/dist/katex.min.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Studio />
  </StrictMode>
);
