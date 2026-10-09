// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // O tu plugin de framework (vue, svelte, etc.)
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← Único plugin de Tailwind
  ],
});