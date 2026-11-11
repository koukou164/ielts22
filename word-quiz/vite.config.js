import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' 让 dist 可以直接放到任意静态子目录部署。
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) return 'echarts'
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue')) return 'vue'
        }
      }
    }
  }
})
