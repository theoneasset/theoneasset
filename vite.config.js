import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/naver-api': {
          target: 'https://openapi.naver.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/naver-api/, ''),
          headers: {
            'X-Naver-Client-Id': env.VITE_NAVER_SEARCH_CLIENT_ID,
            'X-Naver-Client-Secret': env.VITE_NAVER_SEARCH_CLIENT_SECRET,
          },
        },
      },
    },
  }
})
