import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single-page app. Everything runs locally in the browser; there is no
// backend and no proxy to any external service by design.
export default defineConfig({
  plugins: [react()],
  // pdfjs-dist ships a worker that we import lazily; keep it out of the
  // optimised dep graph so the main bundle stays lean.
  worker: {
    format: 'es',
  },
});
