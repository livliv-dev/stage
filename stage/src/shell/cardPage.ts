// Which page of the character card shows: 身体, 谁来演, 人设和声音. Others open the card on a page (the 准备清单's
// links into a character's voice or who plays it).
import { useSyncExternalStore } from 'react'

export type CardPage = 'body' | 'who' | 'persona'
let page: CardPage = 'who'
const listeners = new Set<() => void>()
export const useCardPage = () => useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f) } }, () => page)
export function showCardPage(next: CardPage) { page = next; listeners.forEach((f) => f()) }
