import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'render-blocking-entry',
    apply: 'build',
    // Vite 5 recreates the entry script and drops its blocking attribute.
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html.replace('<script type="module"', '<script type="module" blocking="render"'),
    },
  }],
})
