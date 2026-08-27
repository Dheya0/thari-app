import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom']
    },
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    preview: {
      port: 3000,
      host: '0.0.0.0'
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      minify: 'esbuild',
      target: 'es2020',
      cssMinify: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    }
  };
});
