import { defineConfig } from 'vite'; // ^4.4.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // ^4.2.0
import viteCompression from 'vite-plugin-compression'; // ^0.5.1
import legacy from '@vitejs/plugin-legacy'; // ^4.0.0
import { visualizer } from 'rollup-plugin-visualizer'; // ^5.9.0

// Enterprise-grade Vite configuration for RefactorTrack web application
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';

  return {
    // Plugin configuration with enterprise-level optimizations
    plugins: [
      // React plugin with Fast Refresh and Emotion support
      react({
        fastRefresh: true,
        babel: {
          plugins: ['@emotion/babel-plugin'],
        },
      }),

      // TypeScript path resolution
      tsconfigPaths(),

      // Production-only plugins
      ...(isProduction
        ? [
            // Brotli compression
            viteCompression({
              algorithm: 'brotli',
              ext: '.br',
              threshold: 10240, // 10KB
              compressionOptions: { level: 11 },
            }),

            // Gzip compression
            viteCompression({
              algorithm: 'gzip',
              ext: '.gz',
              threshold: 10240, // 10KB
            }),

            // Legacy browser support
            legacy({
              targets: ['defaults', 'not IE 11'],
              additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
              modernPolyfills: true,
            }),

            // Bundle analysis
            visualizer({
              filename: './stats.html',
              open: false,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],

    // Development server configuration
    server: {
      port: 3000,
      host: true,
      strictPort: true,
      cors: true,
      hmr: {
        overlay: true,
        clientPort: 3000,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
      },
    },

    // Production build configuration
    build: {
      outDir: 'dist',
      sourcemap: true,
      minify: 'terser',
      target: ['es2015', 'chrome90', 'firefox88', 'safari14', 'edge90'],
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@mui/material', '@emotion/react', '@emotion/styled'],
            state: ['@reduxjs/toolkit', 'react-redux'],
            utils: ['lodash', 'date-fns', 'uuid'],
          },
        },
      },
      chunkSizeWarningLimit: 2000,
      cssCodeSplit: true,
      assetsInlineLimit: 4096, // 4KB
      reportCompressedSize: true,
    },

    // Path resolution and aliases
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@hooks': '/src/hooks',
        '@utils': '/src/utils',
        '@styles': '/src/styles',
        '@assets': '/src/assets',
        '@store': '/src/store',
        '@api': '/src/api',
        '@interfaces': '/src/interfaces',
        '@config': '/src/config',
      },
    },

    // CSS configuration
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@import "@styles/variables.scss";',
        },
      },
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isDevelopment
          ? '[name]__[local]___[hash:base64:5]'
          : '[hash:base64:8]',
      },
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@reduxjs/toolkit',
        'react-redux',
        '@emotion/react',
        '@emotion/styled',
      ],
      exclude: ['@fsouza/prettierd'],
      esbuildOptions: {
        target: 'es2015',
      },
    },

    // Preview server configuration
    preview: {
      port: 3000,
      strictPort: true,
      host: true,
      cors: true,
    },

    // Environment variables configuration
    envPrefix: 'REFACTOR_',
    envDir: './env',
  };
});