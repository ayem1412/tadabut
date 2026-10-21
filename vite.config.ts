import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'playground',
  plugins: [react()],
  server: {
    open: '/react.html',
  },
});
