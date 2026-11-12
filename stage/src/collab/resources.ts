import { object, safePath } from './protocol'

/** Only rendering resources declared by the model, never arbitrary metadata strings. */
export function resourcePaths(raw: unknown): string[] {
  if (!object(raw) || !Array.isArray(raw.layers)) throw new Error('角色文件缺少图层')
  const paths = new Set<string>()
  for (const layer of raw.layers) {
    if (!object(layer)) throw new Error('角色图层有问题')
    for (const value of [layer.texture, layer.mask, layer.talk, layer.brow_tex, ...(Array.isArray(layer.frames) ? layer.frames : [])]) if (typeof value === 'string') paths.add(value)
  }
  if (typeof raw.keyforms === 'string') paths.add(raw.keyforms)
  if (object(raw.files)) for (const key of ['keyforms', 'avatar', 'cover']) if (typeof raw.files[key] === 'string') paths.add(raw.files[key] as string)
  if ([...paths].some((path) => !safePath(path))) throw new Error('角色包含无效文件路径')
  return [...paths]
}
export function resourceUrl(path: string, base: URL): URL {
  if (!safePath(path)) throw new Error('角色包含无效文件路径')
  const target = new URL(path, base)
  if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) throw new Error('角色资源超出模型目录')
  return target
}
