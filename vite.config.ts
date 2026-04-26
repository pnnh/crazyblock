import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        chunkSizeWarningLimit: 1800,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/phaser')) {
                        return 'phaser';
                    }
                }
            }
        }
    }
});
