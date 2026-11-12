import { pixelRatio } from '../quality'
import { getLocale, tr } from '../i18n'
import { Player, type PlayerOptions } from '@livliv-dev/player'
import { BodyPlayer } from '@livliv-dev/player/body'
import { PngBody } from '@livliv-dev/player/png'
import { VrmBody } from '@livliv-dev/player/vrm'
import { localModels, type ModelRef } from '../scene'
import { files as keptFiles } from '../vault'
export type Format = 'livliv' | 'vrm' | 'png'
export const formatOf = (ref: ModelRef): Format => ref.type === 'files' ? ref.format ?? 'livliv' : 'livliv'
export type StagePlayer = Player | BodyPlayer
export function makePlayer(canvas: HTMLCanvasElement, format: Format, options: PlayerOptions = {}): StagePlayer {
  const o = { followPointer: false as const, maxPixelRatio: pixelRatio(), lang: getLocale(), ...options }
  return format === 'livliv' ? new Player(canvas, o) : new BodyPlayer(canvas, format === 'png' ? new PngBody() : new VrmBody(), o)
}
export async function sourceOf(ref: ModelRef): Promise<string | Map<string, Blob>> {
  if (ref.type === 'url') return ref.url
  const files = localModels.get(ref.key) ?? await keptFiles(ref.key)
  if (!files) throw new Error(tr("这台电脑上没有这个导入的角色，请重新导入"))
  localModels.set(ref.key, files)
  return files
}

export function setPixelated(player: StagePlayer, value: boolean) {
  if (player instanceof BodyPlayer && player.body instanceof PngBody) player.body.pixelated = value
}
