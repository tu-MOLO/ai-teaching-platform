import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import path from 'path'

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
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return getChunkGroup(id)
        },
      },
    },
  },
})
