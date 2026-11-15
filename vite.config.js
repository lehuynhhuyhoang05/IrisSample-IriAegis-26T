import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Same-origin proxy also works through the Web tunnel on an iPhone.
  // The default target is the Flask address supplied in openapi.yml.
  const proxy = {
    '/api/v1': { target: env.API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
    '/liveness-api': { target: env.LIVENESS_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin: true, rewrite: path => path.replace(/^\/liveness-api/, '') || '/' },
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { allowedHosts: ['.trycloudflare.com'], proxy },
    preview: { allowedHosts: ['.trycloudflare.com'], proxy },
  }
})
