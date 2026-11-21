import type { StageCommand, StageResult } from '../../protocol/src/stageCommands'
import { ACTION_IDS } from '../../protocol/src/commands'
import { mixer } from './mixer'
import { actors, type Actor } from './actors'
import { formatOf } from './bodies'
import { conversation, talk } from './conversation'
import { getLocale } from './i18n'
import { cancel as cancelPtt, canHear, pttState, togglePtt } from './ptt'
import { store, type CharacterItem, type ExprMode } from './scene'

export function stageState() {
  const scene = store.get(), conv = conversation()
  return {
    apiVersion: 1, audio: mixer().settings,
    scene: { id: scene.id, name: scene.name, width: scene.width, height: scene.height },
    scenes: store.project().scenes.map((s) => ({ id: s.id, name: s.name })),
    selected: store.selected(), voiceInput: { phase: pttState().phase, automatic: pttState().automatic, error: pttState().error ? 'Voice input failed; check Stage' : null }, conversation: { running: conv.running, paused: conv.paused, turns: conv.turns },
    characters: scene.items.filter((i): i is CharacterItem => i.kind === 'character').map((c) => {
      const actor = actors.get(c.id)
      return { id: c.id, name: c.name, format: formatOf(c.model), remote: !!c.remote, hidden: !!c.hidden, muted: c.muted, volume: c.tuning.volume, driver: c.driver,
        parameters: actor?.status === 'ready' ? { ...actor.lastPose.params } : null, view: actor?.status === 'ready' ? { ...actor.lastPose.view } : null,
        status: c.hidden ? 'hidden' : actor?.status ?? 'loading', expression: actor?.expression ?? null, input: actor?.inputPhase ?? 'idle',
        expressions: actor && actor.format !== 'png' ? actor.player.expressions.map((e) => ({ id: e.id, name: e.labels?.[getLocale()] ?? e.labels?.en ?? e.label })) : [], actions: c.remote ? [] : [...ACTION_IDS] }
    }),
  }
}

/** the character 开播 (going live with your own face) put on the stage: the keys, hotkeys and commands that name no
 *  character play it while it is in sight (entry.ts sets it) */
let face: string | null = null
export const setFaceCharacter = (id: string | null) => { face = id }
export const faceCharacter = () => face

/** whom a command that names no character is for: the one 开播 put on the stage, else the selected one, else the
 *  first you play, in sight. The keys on the stage (characterKeys.ts) look only at your own characters and stop
 *  there; the hotkeys and the API then take any local one in sight, and a friend's one answers that a friend plays it */
export function commandTarget(cast: CharacterItem[], by: 'keys' | 'command'): CharacterItem | undefined {
  if (by === 'keys') {
    const own = cast.filter((c) => !c.hidden && !c.remote)
    return own.find((c) => c.id === face) ?? own.find((c) => c.id === store.selected()) ?? own.find((c) => c.lines === 'me')
  }
  const visible = cast.filter((c) => !c.hidden)
  return visible.find((c) => c.id === face && !c.remote) ?? visible.find((c) => c.id === store.selected()) ?? visible.find((c) => c.lines === 'me') ?? visible.find((c) => !c.remote)
}

/** what a key on the stage does to the character it plays (characterKeys.ts): an expression by its key's mode (down,
 *  up, or a press with no release to come), none (0), dozing off and back (B), a move (Q W E R T) */
export type KeyCommand = { do: 'key'; character: string; key: { is: 'expr'; id: string; how: 'down' | 'up' | 'press' } | { is: 'clear' } | { is: 'away' } | { is: 'move'; id: Exclude<(typeof ACTION_IDS)[number], 'away'> } }

/** how an expression's key shows it: on and off (toggle), while held (hold), for a few seconds (timed) */
export const modeOf = (c: CharacterItem, id: string): ExprMode => c.exprModes?.[id] ?? { mode: 'toggle' }

/** one expression's key: down and up (a key), or press (no release to come: a held one shows for 3 s) */
function trigger(a: Actor, id: string, how: 'down' | 'up' | 'press') {
  const m = modeOf(a.item, id)
  if (how === 'up') { if (m.mode === 'hold' && a.expression === id) a.setExpression(null); return }
  if (m.mode !== 'hold' && a.expression === id) { a.setExpression(null); return }  // pressed again: off
  if (m.mode === 'timed') a.pulseExpression(id, m.secs ?? 3)
  else if (m.mode === 'hold' && how === 'press') a.pulseExpression(id, 3)
  else a.setExpression(id)
}

/** a move; shy also shows the character's own shy face for as long, when it has one and no expression is showing */
function move(a: Actor, id: Exclude<(typeof ACTION_IDS)[number], 'away'>) {
  a.act(id)
  const shy = id === 'shy' && !a.expression && a.format !== 'png' && a.player.expressions.find((x) => x.id === 'shy' || [x.label, ...Object.values(x.labels ?? {})].some((l) => /害羞|shy|照れ/i.test(l)))
  if (shy) a.pulseExpression(shy.id, 2.4)
}

function performKey(cmd: KeyCommand): StageResult {
  const a = actors.get(cmd.character), k = cmd.key
  if (!a) return { ok: false, status: 404, error: 'Avatar not found' }
  if (k.is === 'expr') trigger(a, k.id, k.how)
  else if (k.is === 'clear') a.setExpression(null)
  else if (k.is === 'away') a.setAway(!a.away)
  else move(a, k.id)
  return { ok: true, character: cmd.character }
}

/** One command path for the keys on the stage, native shortcuts, audience actions and authenticated external clients. */
export function performStageCommand(cmd: StageCommand | KeyCommand): StageResult {
  if (cmd.do === 'key') return performKey(cmd)
  if (cmd.do === 'scene') {
    if (!store.project().scenes.some((s) => s.id === cmd.id)) return { ok: false, status: 404, error: 'Scene not found' }
    store.switchScene(cmd.id); return { ok: true, scene: cmd.id }
  }
  const scene = store.get(), cast = scene.items.filter((i): i is CharacterItem => i.kind === 'character')
  if (cmd.do === 'ai-stop') { cancelPtt(); talk.stop(); return { ok: true } }
  if (cmd.do === 'ai-pause') {
    const c = conversation()
    if (!c.running) return { ok: false, status: 409, error: 'No AI session is running' }
    const pause = cmd.on ?? !c.paused
    if (pause) talk.pause(); else talk.resume()
    return { ok: true }
  }
  if (cmd.do === 'ptt') {
    if (pttState().phase === 'idle' && !canHear()) return { ok: false, status: 409, error: 'Speech recognition is not connected' }
    void togglePtt()
    return { ok: true, ...(pttState().phase !== 'idle' ? { pending: 'voice-input' as const } : {}) }
  }
  if (cmd.do === 'mute' && !cmd.character) {
    const muted = cmd.on ?? !cast.every((c) => c.muted)
    for (const c of cast) store.patch(c.id, { muted })
    return { ok: true }
  }
  const target = cmd.character ? cast.find((c) => c.id === cmd.character) : commandTarget(cast, 'command')
  if (!target) return { ok: false, status: 404, error: 'Avatar not found' }
  if (cmd.do === 'mute') { store.patch(target.id, { muted: cmd.on ?? !target.muted }); return { ok: true, character: target.id } }
  if (target.remote) return { ok: false, status: 409, error: 'This avatar is controlled by a friend' }
  const actor = actors.get(target.id)
  if (!actor || actor.status !== 'ready') return { ok: false, status: 409, error: 'This avatar is not loaded' }
  if (cmd.do === 'expr') {
    if (actor.format === 'png') return { ok: false, status: 409, error: 'This PNG avatar has no expression images' }
    const id = /^\d+$/.test(cmd.id) ? actor.player.expressions[Number(cmd.id) - 1]?.id : cmd.id
    if (!id || !actor.player.expressions.some((e) => e.id === id)) return { ok: false, status: 404, error: 'Expression not found' }
    if (cmd.duration !== undefined) actor.pulseExpression(id, cmd.duration, cmd.weight)
    else if (cmd.on !== false || actor.expression === id) actor.setExpression(cmd.on === false ? null : id, cmd.weight)
  } else if (cmd.do === 'act') {
    if (cmd.id === 'away') actor.setAway(true); else actor.act(cmd.id)
  } else if (cmd.do === 'clear') { actor.setAway(false); actor.setExpression(null) }
  else if (cmd.do === 'calibrate') {
    if (!actor.canCalibrate) return { ok: false, status: 409, error: 'No tracking input is active' }
    actor.calibrate()
  } else if (cmd.do === 'mic') { store.patch(target.id, { driver: target.driver === 'mic' ? 'auto' : 'mic' }); return { ok: true, character: target.id, pending: 'microphone' } }
  return { ok: true, character: target.id }
}
