import autoprefixer from 'autoprefixer'
import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

// One PostHog upstream behind /ingest: strip the prefix and present the upstream's own Host, which is
// how PostHog tells the region apart.
const posthogProxy = (target) => ({
  target,
  changeOrigin: true,
  rewrite: (p) => p.replace(/^\/ingest/, ''),
})

export default defineConfig(() => {
  return {
    base: '/',
    build: {
      outDir: 'build',
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        // Mirrors production, where Caddy serves the SPA and proxies /api/* to
        // the backend on the same origin. Keeping VITE_API_BASE_URL empty in dev
        // means the app issues the same relative requests it will issue in prod.
        '/api': { target: 'http://localhost:8000', changeOrigin: true },
        // PostHog, the way Caddy routes it in prod (see shared/analytics.ts). Only reached when
        // VITE_POSTHOG_KEY is set. First match wins, so the assets paths go before the catch-all.
        '/ingest/static': posthogProxy('https://us-assets.i.posthog.com'),
        '/ingest/array': posthogProxy('https://us-assets.i.posthog.com'),
        '/ingest': posthogProxy('https://us.i.posthog.com'),
      },
    },
  }
})
