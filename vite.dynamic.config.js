// Konfigurasi terpisah khusus untuk modul login Dynamic.
// Jalankan: npx vite build --config vite.dynamic.config.js
// Hasilnya ada di public/dynamic/ dan tidak mengganggu vite.config.js bawaan Laravel.
import { defineConfig } from 'vite';

export default defineConfig({
    publicDir: false,
    base: './',
    build: {
        outDir: 'public/dynamic',
        emptyOutDir: true,
        target: 'es2022',
        rollupOptions: {
            input: 'resources/js/dynamic-auth.js',
            output: {
                entryFileNames: 'dynamic-auth.js',
                chunkFileNames: 'chunks/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            },
        },
    },
});
