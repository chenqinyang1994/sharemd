import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        // 使用正则进行精确匹配，避免影响 highlight.js/styles/... 的引入
        find: /^highlight\.js$/,
        replacement: 'highlight.js/lib/common',
      },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库拆分
          'vendor-react': ['react', 'react-dom'],
          // 编辑器核心拆分
          'vendor-editor': [
            'codemirror',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/language',
            '@codemirror/commands',
            '@codemirror/search',
            '@codemirror/lang-markdown',
          ],
          // Markdown 工具链拆分
          'vendor-utils': ['react-markdown', 'rehype-highlight', 'remark-gfm'],
        },
      },
    },
  },
})
