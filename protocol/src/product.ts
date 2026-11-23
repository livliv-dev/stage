// The product's name and logo (product.json), in one place for the desktop shell and the editor page. livliv.ai/stage
// ('site') keeps the name it opened with, LivLiv Stage, and its wordmark; the open-source app everywhere else ('app':
// the desktop app, a copy hosted elsewhere) is VTuber Stage, by LivLiv. The icon (symbol.svg, favicon.svg) is the same
// everywhere. The editor page and stage/vite.config.ts read product.json itself, as a JSON module (stage/src/core/product.ts).
//   name       the same in every language
//   slug       the name in a file name (a recording of a stage with no name)
//   mark       the logo where room is short (the top bar, the phone intro, the other-tab notice), in stage/public/
//   full       the logo where there is room (About), in stage/public/, shown fullWidth CSS px wide
import products from './product.json'

export type Product = typeof products.app

/** for a host as stage/src/core/platform.ts names them: 'site' is livliv.ai/stage, any other the open-source app */
export function productOf(host: string): Product {
  return host === 'site' ? products.site : products.app
}
