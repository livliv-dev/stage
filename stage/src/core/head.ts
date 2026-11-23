// The page's <head> for each build: its title is the product's name where the build runs, and livliv.ai/stage's build
// (VITE_STAGE_HOST=livliv, scripts/build-site.mjs) adds its description and link preview, which keep the name LivLiv
// Stage. vite.config.ts applies it with the name from protocol/src/product.json; test/product.test.ts pins it. Imports
// nothing, so vite.config.ts can load it as it is.

/** index.html titled `name`, with livliv.ai's description and link preview when `site` */
export function pageHead(html: string, name: string, site: boolean): string {
  const titled = html.replace(/<title>[^<]*<\/title>/, `<title>${name}</title>`)
  if (!site) return titled
  const meta = `
    <meta name="description" content="${name}, your AI VTuber studio. Give a character a personality, and in minutes it's chatting with you or streaming live. Or play it yourself. In your browser, open source." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="LivLiv" />
    <meta property="og:title" content="${name}" />
    <meta property="og:description" content="Your AI VTuber Studio. Give a character a personality, and in minutes it's live." />
    <meta property="og:url" content="https://livliv.ai/stage/" />
    <meta property="og:image" content="https://livliv.ai/stage/og.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
  `
  return titled.replace('</head>', `${meta}</head>`)
}
