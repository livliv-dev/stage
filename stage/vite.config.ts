import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

const api = `http://127.0.0.1:${process.env.LM_API_PORT || 8000}`

export default defineConfig({
  plugins: [react()],
  // the version the About section shows (keep it the same as electron-builder.stage.yml's extraMetadata.version)
  define: { __STAGE_VERSION__: JSON.stringify(pkg.version) },
  server: {
    host: '127.0.0.1', port: 5222, strictPort: true,
    proxy: { '/api': api, '/models': api },
  },
})
