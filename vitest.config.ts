import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
        exclude: ['src-tauri', 'node_modules', 'dist'],
    },
})
