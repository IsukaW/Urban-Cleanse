import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { securityHeaders } from './securityHeaders'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // CSP needs to know where the API lives (V07)
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [react(), securityHeaders(env.VITE_API_URL)],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
