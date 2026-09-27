import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The Firebase SDK (Auth + Firestore) alone is ~750 kB minified / ~190 kB gzipped.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split large vendor libraries into separately cached chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('firebase')) return 'firebase'
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'charts'
          return undefined
        },
      },
    },
  },
})
