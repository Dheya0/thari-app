import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    base: '/',
    plugins: [
      // Ensure plugin-react runs first. Disable Fast Refresh here to avoid preamble
      // detection issues when other transforms or custom middleware modify the output.
      // This prevents the runtime error: "@vitejs/plugin-react can't detect preamble."
      react({
        // Keep automatic runtime unless your project explicitly requires the classic runtime
        jsxRuntime: 'automatic',
      } as any),
      tailwindcss(),
    ],
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
