import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/naver-api': {
        target: 'https://openapi.naver.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/naver-api/, ''),
        headers: {
          'X-Naver-Client-Id': 'f5CnEQLzg4LYE_Y51Abm',
          'X-Naver-Client-Secret': 'ekdhtzvBCf'
        }
      }
    }
  }
})
