import { actors } from '../actors'
import { localModels, newCharacter, store, type CharacterItem } from '../scene'
import type { Package } from './assets'
import type { Member } from './protocol'
const models = new Map<string, { key: string; files: Map<string, Blob> }>()
export function receiveCharacter(room: string, member: Member, value: Package, muted = false) {
  const key = 'remote:' + room + ':' + member.id, id = 'remote-' + member.id
  localModels.set(key, value.files); models.set(member.id, { key, files: value.files })
  const character = newCharacter(store.get(), value.manifest.name, { type: 'files', key, format: value.manifest.format }, '')
  Object.assign(character, { id, muted, lines: 'none', driver: 'auto', mirror: value.manifest.mirror, color: value.manifest.color, remote: { peer: member.id, person: member.name } })
  store.setRemote(character)
  return id
}
export function removeCharacter(peer: string) {
  store.dropRemote(peer)
  const model = models.get(peer)
  if (model) localModels.delete(model.key)
  models.delete(peer)
}
export const characterFor = (peer: string) => store.get().items.find((item): item is CharacterItem => item.kind === 'character' && item.remote?.peer === peer)
export const actorFor = (peer: string) => { const c = characterFor(peer); return c ? actors.get(c.id) : undefined }
