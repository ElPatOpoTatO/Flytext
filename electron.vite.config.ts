import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['robotjs'] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
    css: {
      postcss: './postcss.config.cjs',
    },
    build: {
      rollupOptions: {
        input: {
          index: 'src/renderer/index.html',
          marker: 'src/renderer/marker.html',
        },
      },
    },
  },
})
