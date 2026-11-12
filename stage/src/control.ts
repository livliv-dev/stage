import type { StageCommand, StageResult } from '../../desktop/src/stageCommands'
import { ACTION_IDS } from '../../desktop/src/commands'
import { mixer } from './mixer'
import { actors } from './actors'
import { formatOf } from './bodies'
import { conversation, talk } from './conversation'
import { getLocale } from './i18n'
import { cancel as cancelPtt, canHear, pttState, togglePtt } from './ptt'
import { store, type CharacterItem } from './scene'
import { liveCharacter } from './live'

export function stageState() {
  const scene = store.get(), conv = conversation()
  return {
    apiVersion: 1, audio: mixer().settings,
    scene: { id: scene.id, name: scene.name, width: scene.width, height: scene.height },
    scenes: store.project().scenes.map((s) => ({ id: s.id, name: s.name })),
    selected: store.selected(), voiceInput: { phase: pttState().phase, error: pttState().error ? 'Voice input failed; check Stage' : null }, conversation: { running: conv.running, paused: conv.paused, turns: conv.turns },
    characters: scene.items.filter((i): i is CharacterItem => i.kind === 'character').map((c) => {
      const actor = actors.get(c.id)
      return { id: c.id, name: c.name, format: formatOf(c.model), remote: !!c.remote, hidden: !!c.hidden, muted: c.muted, volume: c.tuning.volume, driver: c.driver,
        parameters: actor?.status === 'ready' ? { ...actor.lastPose.params } : null, view: actor?.status === 'ready' ? { ...actor.lastPose.view } : null,
        status: c.hidden ? 'hidden' : actor?.status ?? 'loading', expression: actor?.expression ?? null, input: actor?.inputPhase ?? 'idle',
        expressions: actor && actor.format !== 'png' ? actor.player.expressions.map((e) => ({ id: e.id, name: e.labels?.[getLocale()] ?? e.labels?.en ?? e.label })) : [], actions: c.remote ? [] : [...ACTION_IDS] }
    }),
  }
}

/** One command path for native shortcuts, audience actions and authenticated external clients. */
export function performStageCommand(cmd: StageCommand): StageResult {
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
  const visible = cast.filter((c) => !c.hidden)
  // as the live keys (live.ts): the one 开播 put on the stage first
  const target = cmd.character ? cast.find((c) => c.id === cmd.character) : visible.find((c) => c.id === liveCharacter() && !c.remote) ?? visible.find((c) => c.id === store.selected()) ?? visible.find((c) => c.lines === 'me') ?? visible.find((c) => !c.remote)
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
    if (cmd.id === 'away') actor.setAway(true); else actor.player.act(cmd.id)
  } else if (cmd.do === 'clear') { actor.setAway(false); actor.setExpression(null) }
  else if (cmd.do === 'calibrate') {
    if (!actor.canCalibrate) return { ok: false, status: 409, error: 'No tracking input is active' }
    actor.calibrate()
  } else if (cmd.do === 'mic') { store.patch(target.id, { driver: target.driver === 'mic' ? 'auto' : 'mic' }); return { ok: true, character: target.id, pending: 'microphone' } }
  return { ok: true, character: target.id }
}
