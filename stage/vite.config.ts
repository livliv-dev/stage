import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

const api = `http://127.0.0.1:${process.env.LM_API_PORT || 8000}`
// livliv.ai/stage's build (scripts/build-site.mjs): the page's description and link preview
const site = process.env.VITE_STAGE_HOST === 'livliv'
const META = `
    <meta name="description" content="LivLiv Stage, your AI VTuber studio. Give a character a personality, and in minutes it's chatting with you or streaming live. Or play it yourself. In your browser, open source." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="LivLiv" />
    <meta property="og:title" content="LivLiv Stage" />
    <meta property="og:description" content="Your AI VTuber Studio. Give a character a personality, and in minutes it's live." />
    <meta property="og:url" content="https://livliv.ai/stage/" />
    <meta property="og:image" content="https://livliv.ai/stage/og.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
  `

export default defineConfig({
  plugins: [react(), {
    name: 'airi-notices',
    generateBundle() {
      const directory = new URL('../vendor/airi-core/', import.meta.url)
      for (const name of ['LICENSE', 'DEPENDENCY-NOTICES.txt']) {
        this.emitFile({ type: 'asset', fileName: 'licenses/airi-' + name + (name.endsWith('.txt') ? '' : '.txt'), source: readFileSync(new URL(name, directory)) })
      }
    },
  }, ...(site ? [{ name: 'livliv-site-meta', transformIndexHtml: (html: string) => html.replace('</head>', `${META}</head>`) }] : [])],
  // the version the About section shows (keep it the same as electron-builder.stage.yml's extraMetadata.version)
  define: { __STAGE_VERSION__: JSON.stringify(pkg.version) },
  server: {
    host: '127.0.0.1', port: 5222, strictPort: true,
    proxy: { '/api': api, '/models': api },
  },
})
