import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /delta-proxy/* → https://cdn.india.deltaex.org  (production CDN)
      '/delta-proxy': {
        target: 'https://cdn.india.deltaex.org',
        changeOrigin: true,
        secure: true,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        rewrite: (path) => path.replace(/^\/delta-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('cookie');
          });
        },
      },
      // /delta-test-proxy/* → https://cdn-ind.testnet.deltaex.org  (testnet)
      '/delta-test-proxy': {
        target: 'https://cdn-ind.testnet.deltaex.org',
        changeOrigin: true,
        secure: true,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        rewrite: (path) => path.replace(/^\/delta-test-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('cookie');
          });
        },
      },
    },
  },
})
