/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import path from 'path'
import { fileURLToPath } from 'url'

const getChunkGroup = (id: string): string | undefined => {
  if (!id.includes('node_modules')) {
    return undefined
  }

  const normalized = id.replaceAll('\\', '/')

  if (
    normalized.includes('/echarts/') ||
    normalized.includes('/zrender/') ||
    normalized.includes('/echarts-for-react/')
  ) {
    return 'vendor-echarts'
  }

  if (
    normalized.includes('/@uiw/') ||
    normalized.includes('/codemirror/') ||
    normalized.includes('/rehype') ||
    normalized.includes('/remark') ||
    normalized.includes('/unified/') ||
    normalized.includes('/micromark') ||
    normalized.includes('/mdast') ||
    normalized.includes('/hast') ||
    normalized.includes('/unist') ||
    normalized.includes('/vfile') ||
    normalized.includes('/parse5/') ||
    normalized.includes('/refractor/')
  ) {
    return 'vendor-md-editor'
  }

  if (
    normalized.includes('/antd/') ||
    normalized.includes('/@ant-design/') ||
    normalized.includes('/@rc-component/') ||
    normalized.includes('/rc-') ||
    normalized.includes('/@emotion/') ||
    normalized.includes('/dayjs/')
  ) {
    return 'vendor-antd'
  }

  if (
    normalized.includes('/react/') ||
    normalized.includes('/react-dom/') ||
    normalized.includes('/react-router/') ||
    normalized.includes('/react-router-dom/') ||
    normalized.includes('/scheduler/') ||
    normalized.includes('/zustand/')
  ) {
    return 'vendor-react-core'
  }

  if (normalized.includes('/axios/')) {
    return 'vendor-network'
  }

  return undefined
}

export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          return getChunkGroup(id)
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          if (name.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name)) {
            return 'assets/img/[name]-[hash][extname]'
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/test/**',
        'src/types/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
})
