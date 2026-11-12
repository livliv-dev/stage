import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, Headphones, LoaderCircle, Mic, Play, Settings, Square, Volume2, VolumeX, X } from 'lucide-react'
import { actors, onActors, type Actor } from './actors'
import { conversation as conversationState, onConv, useConversation } from './conversation'
import { refreshDevices, setInput, useInputs } from './devices'
import { useAccount } from './livliv'
import { busGain, setBus, useMixer, type AudioBus } from './mixer'
import { MicrophoneCheck } from './microphone'
import { remoteSounds } from './collab/streams'
import { participants, store, useScene, type CharacterItem } from './scene'
import { tr } from './i18n'
import { demoVoice } from './demo'
import { useBrainConfig } from './brain'
import { useActiveSpeech, voiceRoute } from './voiceApi'

function Fader({ label, volume, muted, maximum = 1, set, mute, level = 0, meter = true }: { label: string; volume: number; muted: boolean; maximum?: number; set: (value: number) => void; mute: () => void; level?: number; meter?: boolean }) {
  return <div className={'bus-fader' + (muted ? ' muted' : '')}>
    <button className="icon" aria-label={tr(muted ? '取消静音 {0}' : '静音 {0}', label)} onClick={mute}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
    <div className="fader-control"><div><b>{label}</b><span className="num">{Math.round(volume * 100)}%</span></div>
      <input aria-label={tr('{0}音量', label)} type="range" min={0} max={maximum} step={.01} value={volume} style={{ '--p': volume / maximum * 100 + '%' } as CSSProperties} onChange={(event) => set(Number(event.target.value))} />
      {meter ? <meter aria-label={tr('{0}电平', label)} min={0} max={1} value={Math.max(0, Math.min(1, (20 * Math.log10(Math.max(1e-5, level)) + 60) / 60))} /> : <span className='system-output'>{tr('本机朗读')}</span>}
    </div>
  </div>
}

function soundMeter(onError: (error: Error) => void) {
  const context = new AudioContext(), nodes = new Map<string, { stream: MediaStream; source: MediaStreamAudioSourceNode; analyser: AnalyserNode; values: Float32Array<ArrayBuffer> }>()
  let closed = false
  void context.resume().catch((error: Error) => { if (!closed) onError(error) })
  return {
    read() {
      const inputs = [...participants(store.get()).filter((c) => !c.remote).flatMap((c) => { const stream = actors.get(c.id)?.audio; return stream ? [{ id: c.id, stream, volume: 1, bus: 'characters' as const }] : [] }), ...remoteSounds().map((s) => ({ ...s, bus: 'friends' as const }))]
      for (const [id, value] of nodes) if (!inputs.some((i) => i.id === id && i.stream === value.stream)) { value.source.disconnect(); value.analyser.disconnect(); nodes.delete(id) }
      const levels = { characters: 0, friends: 0 }
      for (const input of inputs) {
        if (!input.stream.getAudioTracks().some((t) => t.readyState === 'live')) continue
        let node = nodes.get(input.id)
        if (!node) {
          const source = context.createMediaStreamSource(input.stream), analyser = context.createAnalyser()
          analyser.fftSize = 1024; source.connect(analyser); node = { stream: input.stream, source, analyser, values: new Float32Array(analyser.fftSize) }; nodes.set(input.id, node)
        }
        node.analyser.getFloatTimeDomainData(node.values)
        let peak = 0
        for (const value of node.values) peak = Math.max(peak, Math.abs(value))
        levels[input.bus] = Math.max(levels[input.bus], peak * input.volume)
      }
      return levels
    },
    close() { if (closed) return; closed = true; for (const value of nodes.values()) { value.source.disconnect(); value.analyser.disconnect() }; nodes.clear(); void context.close() },
  }
}

export function MixerPanel({ onClose, onSettings }: { onClose: () => void; onSettings: () => void }) {
  const { scene } = useScene(), state = useMixer(), { settings, devices } = useInputs(), conversation = useConversation()
  const brain = useBrainConfig()
  useAccount(); useActiveSpeech()
  const [, redraw] = useState(0), [levels, setLevels] = useState({ characters: 0, friends: 0 })
  const [testing, setTesting] = useState(''), [error, setError] = useState('')
  const check = useRef<MicrophoneCheck | null>(null), test = useRef<AbortController | null>(null), target = useRef<{ id: string; model: string; actor: Actor } | null>(null)
  useEffect(() => {
    let active = true
    const preview = new MicrophoneCheck(), meters = soundMeter((error) => { if (active) setError(error.message) })
    check.current = preview; preview.changed = () => { if (active) redraw((v) => v + 1) }; redraw((v) => v + 1)
    const validateTest = () => {
      const value = target.current
      if (!value) return
      const character = store.get().items.find((c) => c.kind === 'character' && c.id === value.id)
      if (!character || character.kind !== 'character' || actors.get(value.id) !== value.actor || value.actor.status !== 'ready' || JSON.stringify(character.model) !== value.model) test.current?.abort()
    }
    const off = onActors(() => { validateTest(); redraw((v) => v + 1) }), offScene = store.subscribe(validateTest)
    const offConv = onConv(() => { const state = conversationState(); if (state.running || state.speaking) test.current?.abort() })
    const timer = setInterval(() => setLevels(meters.read()), 150)
    void refreshDevices()
    return () => { active = false; check.current = null; off(); offScene(); offConv(); clearInterval(timer); preview.dispose(); meters.close(); test.current?.abort() }
  }, [])
  const preview = check.current, phase = preview?.phase ?? 'off', open = phase !== 'off', busy = phase !== 'on'
  const cast = participants(scene).filter((c) => !c.remote), friends = participants(scene).filter((c) => c.remote)
  const audition = async (character: CharacterItem) => {
    const actor = actors.get(character.id)
    if (!actor || test.current) return
    const controller = new AbortController(); test.current = controller; target.current = { id: character.id, model: JSON.stringify(character.model), actor }; setTesting(character.id); setError('')
    try {
      const demo = brain.kind === 'demo' ? demoVoice(character, cast) : null
      const prepared = await actor.prepare(demo?.text ?? tr('你好，我是{0}。', character.name), 'neutral', true, controller.signal, demo?.audio)
      controller.signal.throwIfAborted()
      await actor.perform(prepared, 'neutral', 'none', controller.signal)
      if (!controller.signal.aborted && actor.voiceError) setError(actor.voiceError)
    } catch (error) { if (!controller.signal.aborted) setError((error as Error).message) }
    finally { if (test.current === controller) { test.current = null; target.current = null; setTesting('') } }
  }
  const demoSound = brain.kind === 'demo' && cast.some((c) => !!demoVoice(c, cast))
  const systemOnly = !demoSound && cast.length > 0 && cast.every((c) => ['system', 'none'].includes(voiceRoute(c)))
  const group = (bus: AudioBus, label: string, level = 0) => <Fader meter={bus !== 'characters' || !systemOnly} label={label} {...state.settings[bus]} maximum={bus === 'microphone' ? 2 : 1} level={level} set={(volume) => setBus(bus, { volume })} mute={() => setBus(bus, { muted: !state.settings[bus].muted })} />
  const individual = (character: CharacterItem) => {
    const actor = actors.get(character.id), route = voiceRoute(character), hasDemo = brain.kind === 'demo' && !!demoVoice(character, cast)
    return <div className="mixer-person" key={character.id}>
      <i style={{ background: character.color }} />
      <div><Fader label={character.name} volume={character.tuning.volume} muted={character.muted} set={(volume) => store.patch(character.id, { tuning: { ...character.tuning, volume } })} mute={() => store.patch(character.id, { muted: !character.muted })} />
        {!character.remote && <small>{hasDemo ? tr('演示声音') : route === 'system' ? tr('系统朗读 · 下句生效') : route === 'none' ? tr('未设置声音') : tr('角色语音')}</small>}</div>
      {!character.remote && <button className="icon" title={testing === character.id ? tr('停止试听') : tr('试听 {0}', character.name)} disabled={testing ? testing !== character.id : conversation.running || actor?.status !== 'ready' || character.muted || !busGain('characters') || (route === 'none' && !hasDemo)} onClick={() => testing === character.id ? test.current?.abort() : void audition(character)}>{testing === character.id ? <Square size={13} /> : <Play size={13} />}</button>}
    </div>
  }
  return <div className="card popover mixer-panel" onPointerDown={(event) => event.stopPropagation()}>
    <header><span className="title">{tr('调音台')}</span><button className="icon" data-close="true" aria-label={tr('关闭')} onClick={onClose}><X size={16} /></button></header>
    <div className="mixer-body">
    <section className="mix-bus">
      {group('microphone', tr('我的麦克风'), (preview?.level.peak ?? 0) * busGain('microphone'))}
      <details className="microphone-check" onToggle={(event) => { if (!event.currentTarget.open) check.current?.close() }}>
        <summary><Mic size={13} />{tr('麦克风测试')}</summary>
        <label className="field"><span>{tr('输入设备')}</span><select aria-label={tr('输入设备')} value={settings.microphone} onChange={(event) => setInput({ microphone: event.target.value })}><option value="">{tr('系统默认')}</option>{devices.filter((d) => d.kind === 'audioinput' && d.deviceId !== 'default').map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || tr('麦克风') + ' ' + (i + 1)}</option>)}</select></label>
        <div className="row"><button onClick={() => open ? check.current?.close() : void check.current?.open()}>{phase === 'opening' ? <LoaderCircle className="spin" size={13} /> : open ? <Square size={13} /> : <Mic size={13} />}{tr(open ? '停止测试' : '测试麦克风')}</button>{open && <button disabled={busy} onClick={() => check.current?.calibrate()}>{tr('校准麦克风')}</button>}</div>
        {open && phase !== 'opening' && <>
          <div className="mic-calibration" aria-live="polite">{phase === 'quiet' ? <>{tr('保持安静')}<span className="num">{preview?.remaining || 2}s</span></> : phase === 'speaking' ? <>{tr('用平常的声音说一句话')}<span className="num">{preview?.remaining || 4}s</span></> : preview?.calibrated ? <><Check size={13} />{tr('已校准')}</> : (preview?.level.peak ?? 0) * busGain('microphone') > .98 ? <span className="error">{tr('音量过高，请调低一些')}</span> : tr('对着麦克风说句话')}</div>
          <label className="switch"><span><Headphones size={14} />{tr('耳机监听')}</span><input type="checkbox" checked={preview?.monitoring ?? false} onChange={(event) => check.current?.listen(event.target.checked)} /><i /></label>
          <div className="row"><button disabled={busy} onClick={() => check.current?.record()}>{phase === 'recording' ? tr('录音中 · {0}s', preview?.remaining || 3) : tr('录三秒')}</button><button disabled={busy || !preview?.clip} onClick={() => void check.current?.play()}><Play size={13} />{tr('回放')}</button></div>
        </>}
        {preview?.error && <p className="error" role="alert">{preview.error}</p>}
      </details>
    </section>
    <section className="mix-bus">
      {group('characters', tr('角色声音'), levels.characters)}
      <details className="individual-mix"><summary>{tr('分别调整角色')}<span className="num">{cast.length}</span></summary>{cast.map(individual)}{!cast.length && <p className="hint">{tr('添加角色后，在这里选择。')}</p>}</details>
    </section>
    <section className="mix-bus">
      {group('friends', tr('朋友声音'), levels.friends)}
      {friends.length > 0 ? <details className="individual-mix"><summary>{tr('分别调整朋友')}<span className="num">{friends.length}</span></summary>{friends.map(individual)}</details> : <span className="hint mixer-empty">{tr('联播后在这里调整朋友的声音')}</span>}
    </section>
    </div>
    {(state.error || error) && <p className="error" role="alert">{state.error || error}</p>}
    <button className="link mixer-settings" onClick={onSettings}><Settings size={13} />{tr(systemOnly ? '接入直播声音' : '设置角色声音')}</button>
  </div>
}
