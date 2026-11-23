// The product's name and logo, by where Stage runs (platform.ts `features.host`), in one place (product.json).
// livliv.ai/stage ('site') keeps the name it opened with, LivLiv Stage, and its wordmark; the open-source app everywhere
// else ('app': the desktop app, a copy hosted elsewhere) is VTuber Stage, by LivLiv. Everything that shows the name
// reads PRODUCT, and vite.config.ts takes the page title from product.json. The icon (symbol.svg, favicon.svg) is the
// same everywhere.
//   name       the same in every language
//   slug       the name in a file name (a recording of a stage with no name)
//   mark       the logo where room is short (the top bar, the phone intro, the other-tab notice), in public/
//   full       the logo where there is room (About), in public/, shown fullWidth CSS px wide
import table from './product.json' with { type: 'json' }
import { features } from './platform'

export type Product = typeof table.app

/** for a platform.ts Host: 'site' is livliv.ai/stage, any other the open-source app */
export function productOf(host: string): Product {
  return host === 'site' ? table.site : table.app
}

export const PRODUCT = productOf(features.host)
