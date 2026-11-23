// The product's name and logo, by where Stage runs (platform.ts `features.host`), in one place. livliv.ai/stage keeps the
// name it opened with, LivLiv Stage, and its wordmark; the open-source app everywhere else (the desktop app, a copy
// hosted elsewhere) is VTuber Stage, by LivLiv. Everything that shows the name reads platform.ts PRODUCT, this table
// for the host the page runs on; vite.config.ts sets the page title from it too, so this file imports nothing.
// The icon (symbol.svg, favicon.svg) is the same everywhere.

export type Product = {
  /** the name, the same in every language */
  name: string
  /** the name in a file name (a recording of a stage with no name) */
  slug: string
  /** the logo where room is short (the top bar, the phone intro, the other-tab notice), in public/ */
  mark: string
  /** the logo where there is room (About), in public/, and how wide it is shown there, in CSS px */
  full: string
  fullWidth: number
}

/** for a platform.ts Host: 'site' is livliv.ai/stage, any other the open-source app */
export function productOf(host: string): Product {
  return host === 'site'
    ? { name: 'LivLiv Stage', slug: 'LivLiv-Stage', mark: 'wordmark.svg', full: 'wordmark.svg', fullWidth: 160 }
    : { name: 'VTuber Stage', slug: 'VTuber-Stage', mark: 'vtuber-stage-name.svg', full: 'vtuber-stage-wordmark.svg', fullWidth: 190 }
}

