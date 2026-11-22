// Private or public. While any output is on (the OBS output window, a recording, a co-stream (好友联播), Twitch chat
// connected, AI 直播 running), every session is public: no private memory is read or written, by any path, and the
// conversation goes to the public record. With all of them off, the scope chosen in the console applies.
import type { MemoryScope } from '../memory'

export type Outputs = { window: boolean; recording: boolean; room: boolean; twitch: boolean; live: boolean }
/** any output is on */
export const outputsOn = (outputs: Outputs) => outputs.window || outputs.recording || outputs.room || outputs.twitch || outputs.live

/** the scope a session started now gets: the one chosen, unless an output is on */
export const scopeFor = (chosen: MemoryScope, outputOn: boolean): MemoryScope => outputOn ? 'public' : chosen

/** what an output coming on does to the conversation:
 *  - none: it is public already, a switch is under way, it is the demo (which reads and writes no memory), or nothing
 *    runs it
 *  - record: nothing running, the public record takes the private one's place (what a recording or the window shows)
 *  - end-call: a realtime call keeps its private context at the provider, so it ends
 *  - session: the running session goes on in the public record; the turn in hand (made with private memories) is
 *    cut, and what was made ahead or typed but not yet said is dropped */
export type PublicSwitch = 'none' | 'record' | 'end-call' | 'session'
export function publicSwitch(now: { scope: MemoryScope; switching: boolean; demo: boolean; running: boolean; call: boolean; session: boolean }): PublicSwitch {
  if (now.scope === 'public' || now.switching || now.demo) return 'none'
  if (!now.running) return 'record'
  if (now.call) return 'end-call'
  return now.session ? 'session' : 'none'
}
