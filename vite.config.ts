import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Preload the initial route's lazy chunk from the HTML head.
 *
 * Without this the browser only starts fetching ContactsPage (the default
 * route) AFTER index.js has downloaded, parsed and executed — a serial round
 * trip that showed up as a ~5s gap between FCP and LCP. With it, the chunk is
 * requested during HTML parse, in parallel with the shell bundles.
 */
const preloadInitialRoute = () => ({
  name: 'preload-initial-route',
  transformIndexHtml: {
    order: 'post' as const,
    handler(html: string, ctx: { bundle?: Record<string, { fileName?: string }> }) {
      if (!ctx.bundle) return html
      const targets = Object.keys(ctx.bundle).filter(
        (fileName) => /ContactsPage-[^/]+\.js$/.test(fileName)
      )
      if (targets.length === 0) return html
      const links = targets
        .map((fileName) => `    <link rel="modulepreload" crossorigin href="/${fileName}">`)
        .join('\n')
      return html.replace('</head>', `${links}\n  </head>`)
    },
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadInitialRoute()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Long-term caching: vendor code changes far less often than app code, so
    // returning users only re-download the small app chunk.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-dom') || id.includes('scheduler') || /node_modules[\\/](react|react-jsx)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          if (id.includes('@radix-ui')) return 'vendor-radix'
          if (id.includes('lucide-react') || id.includes('react-feather')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
})
