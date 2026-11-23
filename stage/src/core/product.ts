// The product's name and logo where this page runs, from protocol/src/product.json (the desktop shell reads it too, by
// protocol/src/product.ts): livliv.ai/stage keeps LivLiv Stage, the open-source app is VTuber Stage. Everything that
// shows the name reads PRODUCT.
import products from '../../../protocol/src/product.json' with { type: 'json' }
import { features } from './platform'

export type Product = typeof products.app

/** for a platform.ts Host: 'site' is livliv.ai/stage, any other the open-source app */
export function productOf(host: string): Product {
  return host === 'site' ? products.site : products.app
}

export const PRODUCT = productOf(features.host)
