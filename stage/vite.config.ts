import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }
import { pageHead } from './src/core/head.ts'
import products from '../protocol/src/product.json' with { type: 'json' }

const api = `http://127.0.0.1:${process.env.LM_API_PORT || 8000}`
// livliv.ai/stage's build (scripts/build-site.mjs) or any other: the page's title, and livliv.ai's description and
// link preview (src/core/head.ts), with the name from protocol/src/product.json
const site = process.env.VITE_STAGE_HOST === 'livliv'

export default defineConfig({
  plugins: [react(), { name: 'page-head', transformIndexHtml: (html: string) => pageHead(html, (site ? products.site : products.app).name, site) }, {
    name: 'airi-notices',
    generateBundle() {
      const directory = new URL('../vendor/airi-core/', import.meta.url)
      for (const name of ['LICENSE', 'DEPENDENCY-NOTICES.txt']) {
        this.emitFile({ type: 'asset', fileName: 'licenses/airi-' + name + (name.endsWith('.txt') ? '' : '.txt'), source: readFileSync(new URL(name, directory)) })
      }
      // mesh-avatar (MIT), which draws .mavatar characters
      this.emitFile({ type: 'asset', fileName: 'licenses/mesh-avatar-LICENSE.txt', source: readFileSync(new URL('./node_modules/mesh-avatar/LICENSE', import.meta.url)) })
    },
  }],
  // the version the About section shows (keep it the same as electron-builder.stage.yml's extraMetadata.version)
  define: { __STAGE_VERSION__: JSON.stringify(pkg.version) },
  // mesh-avatar is reached only through the Player's own import() when a .mavatar loads: bundled ahead, so the dev
  // server does not find it then and reload the page
  optimizeDeps: { include: ['mesh-avatar'] },
  server: {
    host: '127.0.0.1', port: 5222, strictPort: true,
    proxy: { '/api': api, '/models': api },
  },
})
