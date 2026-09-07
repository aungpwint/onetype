import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig(async () => ({
    plugins: [react(), tailwindcss()],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },

    build: {
        rollupOptions: {
            output: {
                // Split large stable libraries into cacheable chunks so the
                // initial load and future updates stay snappy on desktop.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined
                    if (id.includes('framer-motion')) return 'motion'
                    if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/') || id.includes('react/jsx-'))
                        return 'react'
                    if (id.includes('lucide-react')) return 'icons'
                    if (id.includes('zustand')) return 'state'
                    if (id.includes('@tauri-apps')) return 'tauri'
                    return 'vendor'
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
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ['**/src-tauri/**'],
        },
    },
}))
