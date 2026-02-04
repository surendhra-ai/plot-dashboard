import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures backward compatibility if you use process.env in some places
    'process.env': {}
  }
});