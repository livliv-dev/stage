import { busGain, onMixer } from '../mixer'
import { useSyncExternalStore } from 'react'
// Remote audio plays once, in the editor. Recording borrows these same streams.
export type RemoteSound = { id: string; stream: MediaStream; volume: number }
const sounds = new Map<string, RemoteSound & { audio: HTMLAudioElement; blocked: boolean; ownVolume: number }>(), listeners = new Set<() => void>()
export const remoteSounds = () => [...sounds.values()]
export const onRemoteSounds = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const emit = () => listeners.forEach((listener) => listener())
export const useAudioBlocked = () => useSyncExternalStore(onRemoteSounds, () => [...sounds.values()].some((sound) => sound.blocked))
async function play(sound: RemoteSound & { audio: HTMLAudioElement; blocked: boolean; ownVolume: number }) {
  try { await sound.audio.play(); sound.blocked = false }
  catch { sound.blocked = true }
  if (sounds.get(sound.id) === sound) emit()
}
export function attachSound(id: string, stream: MediaStream) {
  removeSound(id)
  const audio = new Audio(); audio.srcObject = stream; audio.autoplay = true
  const sound = { id, stream, audio, ownVolume: 1, volume: busGain('friends'), blocked: false }
  audio.volume = sound.volume
  sounds.set(id, sound); emit(); void play(sound)
}
function applyVolume(sound: RemoteSound & { ownVolume: number; audio: HTMLAudioElement }) {
  const volume = sound.ownVolume * busGain('friends')
  if (sound.volume === volume) return false
  sound.volume = volume; sound.audio.volume = volume; return true
}
export function volumeFor(id: string, value: number) {
  const sound = sounds.get(id)
  if (sound) { sound.ownVolume = value; if (applyVolume(sound)) emit() }
}
onMixer(() => { let changed = false; for (const sound of sounds.values()) if (applyVolume(sound)) changed = true; if (changed) emit() })
export function removeSound(id: string) { const sound = sounds.get(id); if (sound) { sound.audio.pause(); sound.audio.srcObject = null; sounds.delete(id); emit() } }
export function unlockSounds() { for (const sound of sounds.values()) if (sound.audio.paused || sound.blocked) void play(sound) }
document.addEventListener('pointerdown', unlockSounds)
