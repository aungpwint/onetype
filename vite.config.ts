import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

const host = process.env.TAURI_DEV_HOST

function chunkFor(id: string): string | undefined {
    if (!id.includes('node_modules')) return undefined
    if (id.includes('framer-motion')) return 'motion'
    if (id.includes('zustand')) return 'state' // before the react/ check below: zustand/esm/react/* must stay whole
    if (id.includes('lucide-react')) return 'icons'
    if (id.includes('@tauri-apps')) return 'tauri'
    // React runtime plus its direct application deps — keeping each library's
    // full import closure in one chunk avoids manual-chunk circularity encoded
    // as `react -> state -> react` / `vendor -> react -> vendor`.
    if (
        id.includes('react-router') ||
        id.includes('react-dom') ||
        id.includes('react/') ||
        id.includes('react/jsx-') ||
        id.includes('react-is') ||
        id.includes('react-remove-scroll') ||
        id.includes('use-sync-external-store') ||
        id.includes('scheduler') ||
        id.includes('set-cookie-parser') ||
        id.includes('/cookie/') ||
        id.includes('@floating-ui') ||
        id.includes('@radix-ui')
    ) {
        return 'react'
    }
    return 'vendor'
}

// https://vite.dev/config/
export default defineConfig(async () => ({
    plugins: [react(), tailwindcss()],

    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },

    build: {
        // Production bundles must not ship source maps (they would expose the
        // original TypeScript sources alongside their production runtime).
        sourcemap: false,

        rollupOptions: {
            output: {
                // Split large stable libraries into cacheable chunks so the
                // initial load and future updates stay snappy on desktop.
                manualChunks(id: string): string | undefined {
                    return chunkFor(id)
                },
            },
        },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: 'ws',
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            // 3. tell Vite to ignore watching the `src-tauri` folder
            ignored: ['**/src-tauri/**'],
        },
    },
}))
