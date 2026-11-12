// The sample characters that come with LivLiv Stage: LivLiv's featured characters, kept in public/characters/<id>/
// (the maintainers update them) and listed in characters.json, so they work with no account and no connection. Scenes
// saved earlier point at the LivLiv API's copy (/models/<id>/); a sample's is read from here instead.
import list from './characters.json'

/** refined: the refined (精修) version of a character (Nana has both); onSite: livliv.ai has it, so it can speak in its
 *  LivLiv voice; persona, style, lines: who it is and how it talks, as its card on livliv.ai says */
export type Sample = { id: string; name: string; tagline: string; tags: string[]; refined: boolean; onSite: boolean; persona: string; style: string; lines: string[] }
export const SAMPLES: Sample[] = list

/** what a character takes from a card: the prompt's parts (brain.ts prompt), and its gender for picking a voice */
export type Card = { persona: string; style: string; examples: string[]; tagline: string; cardName: string; gender?: 'f' | 'm' }
export const cardOf = (s: Sample): Card => ({
  persona: s.persona, style: s.style, examples: s.lines, tagline: s.tagline, cardName: s.name,
  gender: s.tags.includes('少女') ? 'f' : s.tags.includes('少年') ? 'm' : undefined,
})
/** the sample a model address is, if it is one */
export const sampleAt = (url: string) => SAMPLES.find((s) => s.id === url.match(/characters\/([^/]+)\/$/)?.[1])

export const sampleUrl = (id: string) => `${import.meta.env.BASE_URL}characters/${id}/`

/** a model address, the LivLiv API's copy of a sample turned into the one here */
export function local(url: string) {
  const id = url.match(/^\/models\/([^/]+)\/$/)?.[1]
  return id && SAMPLES.some((s) => s.id === id) ? sampleUrl(id) : url
}
