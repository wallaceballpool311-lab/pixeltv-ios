import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// CSP só no build: o servidor de dev do Vite injeta estilos inline e HMR.
// Imagens vêm do CDN do TMDB; nada mais sai do próprio domínio.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://image.tmdb.org",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  'upgrade-insecure-requests',
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'hit-tv-csp',
    apply: 'build',
    transformIndexHtml: html =>
      html.replace('<!--csp-->', `<meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  }
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  server: {
    port: 5317,
    strictPort: true,
    // API e streaming vêm do servidor Node (npm run server)
    proxy: { '/api': { target: 'http://127.0.0.1:5318', ws: false } },
  },
  preview: {
    port: 4173,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: { target: 'es2022', sourcemap: false },
})
