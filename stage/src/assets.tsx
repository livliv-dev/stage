import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { getAsset, putAsset, type StoredAsset } from './vault'
import { uid, type ImageItem } from './scene'
import { tr } from './i18n'

const urls = new Map<string, Promise<string>>()
export const imageBackground = (url: string) => `center / cover no-repeat url("${url}")`
export const backgroundUrl = (background: string) => background.match(/url\(["']?([^"')]+)["']?\)/)?.[1]

export function cacheAsset(asset: StoredAsset): string {
  const url = URL.createObjectURL(asset.blob)
  urls.set(asset.key, Promise.resolve(url))
  return url
}
export function assetUrl(key: string): Promise<string> {
  let value = urls.get(key)
  if (!value) {
    value = getAsset(key).then((asset) => { if (!asset) throw new Error(tr('找不到这张图片，请重新选择')); return URL.createObjectURL(asset.blob) })
    urls.set(key, value)
    value.catch(() => { urls.delete(key) })
  }
  return value
}
export async function inspectPicture(blob: Blob) {
  if (blob.size > 64 * 2 ** 20) throw new Error(tr('图片过大，请选择小于 64 MB 的图片'))
  const url = URL.createObjectURL(blob)
  try {
    const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight })
      image.onerror = () => reject(new Error(tr('这张图片读不出来')))
      image.src = url
    })
    if (!size.w || !size.h || size.w > 16384 || size.h > 16384 || size.w * size.h > 64e6) throw new Error(tr('图片尺寸过大，请缩小后再导入'))
    return size
  } finally { URL.revokeObjectURL(url) }
}
export async function pictureFile(file: File) {
  const size = await inspectPicture(file), key = uid()
  await putAsset({ key, name: file.name, blob: file })
  const url = cacheAsset({ key, name: file.name, blob: file })
  return { key, url, ...size }
}
export function usePicture(key?: string, fallback = '') {
  const [state, set] = useState({ key: '', url: '', error: '' })
  useEffect(() => {
    if (!key) return
    let current = true
    assetUrl(key).then((url) => { if (current) set({ key, url, error: '' }) }, (error: Error) => { if (current) set({ key, url: '', error: error.message }) })
    return () => { current = false }
  }, [key])
  return !key ? { url: fallback, error: '' } : state.key === key ? state : { url: '', error: '' }
}
export function AssetImage({ item, edit }: { item: ImageItem; edit: boolean }) {
  const picture = usePicture(item.asset, item.url)
  return picture.url ? <img className="image-item" src={picture.url} alt={item.name} draggable={false} /> : edit && picture.error ? <span className="asset-error" title={picture.error}><ImageOff size={20} />{tr('图片不可用')}</span> : null
}
