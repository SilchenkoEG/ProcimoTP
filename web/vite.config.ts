import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev only: forward API calls to a locally running API (`npm run start:dev` in api/).
    // In Docker, nginx does the same job, so the app always calls a relative /api.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
