// Two scenes to play before setting up an AI API: Sena and Kai, or Nana hosting both.
// Lines include gaze targets and prerecorded sample voices
// (public/demo/<template>/NN.mp3). What Stage is with a real model and real voices, before you set either up. It plays
// when the stage has a script's cast (the samples by their folders), in the script's order, and ends with it.
import type { CharacterItem } from './scene'
import type { Line, Reply } from './brain'
import duo from './demo/duo.json'
import trio from './demo/trio.json'

type Script = { template: string; cast: string[]; topic: string; lines: { who: string; text: string; emotion: string; action: string; to: string | null; look: string | null; pauseAfter?: number }[] }
/** the bigger cast first: a stage with all three plays the three of them */
const SCRIPTS: Script[] = [trio, duo]

/** a sample character's id (its folder, characters/<id>/), else null */
const sampleOf = (c: CharacterItem) => c.model.type === 'files' ? c.model.sampleId ?? null : (c.model.type === 'url' ? /characters\/([^/]+)\/$/.exec(c.model.url)?.[1] ?? null : null)

/** the script this cast can play, and who on the stage plays each of its parts */
export function demoFor(cast: CharacterItem[]): { script: Script; who: Record<string, CharacterItem> } | null {
  for (const script of SCRIPTS) {
    const who: Record<string, CharacterItem> = {}
    for (const id of script.cast) {
      const c = cast.find((x) => sampleOf(x) === id && !Object.values(who).includes(x))
      if (c) who[id] = c
    }
    if (Object.keys(who).length === script.cast.length) return { script, who }
  }
  return null
}

/** how far the demo got: its lines said so far (lines carry their place in it) */
const said = (lines: Line[]) => lines.filter((l) => l.demo !== undefined).length

/** who says the demo's next line: a character; undefined when it has ended; null when no script fits the stage */
export function demoSpeaker(cast: CharacterItem[], lines: Line[]): CharacterItem | null | undefined {
  const d = demoFor(cast)
  if (!d) return null
  const next = d.script.lines[said(lines)]
  return next ? d.who[next.who] : undefined
}

/** the demo's next line as the brain's reply, if it is `cast[0]`'s to say */
export function demoReply(cast: CharacterItem[], lines: Line[]): Reply | null {
  const d = demoFor(cast)
  const n = said(lines), l = d?.script.lines[n]
  if (!d || !l || d.who[l.who]?.id !== cast[0].id) return null
  const name = (id: string | null) => (id ? d.who[id]?.name ?? null : null)
  return {
    text: l.text, emotion: l.emotion as Reply['emotion'], action: l.action as Reply['action'], to: name(l.to),
    look: l.look === 'camera' || l.look === 'away' ? l.look : name(l.look),
    audio: `${import.meta.env.BASE_URL}demo/${d.script.template}/${String(n + 1).padStart(2, '0')}.mp3`, demo: n,
  }
}

/** A character's first prepared line, for a preview that matches the current demo. */
export function demoVoice(character: CharacterItem, cast: CharacterItem[]): { text: string; audio: string } | null {
  const demo = demoFor(cast)
  if (!demo) return null
  const who = Object.keys(demo.who).find((key) => demo.who[key].id === character.id)
  const index = demo.script.lines.findIndex((line) => line.who === who)
  if (index < 0) return null
  return { text: demo.script.lines[index].text, audio: `${import.meta.env.BASE_URL}demo/${demo.script.template}/${String(index + 1).padStart(2, '0')}.mp3` }
}

/** The prepared beat after the last spoken demo line; ordinary conversations keep their own pacing. */
export function demoPause(cast: CharacterItem[], lines: Line[]): number | null {
  const last = lines.at(-1)
  if (last?.demo === undefined) return null
  return demoFor(cast)?.script.lines[last.demo]?.pauseAfter ?? null
}
