// The forms for your own services Stage talks to: the text model (a model of one's own, or the demo) and the speech API
// (voices and recognition). Settings → 连接 shows them, below livliv.ai's switch (Connections.tsx).
import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, LoaderCircle, Lock, Play, RefreshCw } from 'lucide-react'
import { tr } from '../i18n'
import { brainReady, clearBrainKey, listModels, previousModelConfig, providerOf, PROVIDERS, PROVIDERS_HERE, saveOwnModel, testModel, useBrainConfig, type ModelConfig } from '../brain'
import { talk } from '../conversation'
import { testAiriModel } from '../airiEngine'
import { chooseEngine } from '../brains/select'
import { features } from '../core/platform'
import { demoFor } from '../demo'
import { participants, store, useScene } from '../scene'
import { activeSpeech, asrReady, clearSpeechKey, listVoices, saveSpeech, SPEECH_HERE, SPEECH_OFF, SPEECH_PROVIDERS, SPEECH_UNSET, speakApi, speechOfModel, speechProviderOf, speechReady, transcribeApi, useSpeech, VOICEBOX_SPEECH, type SpeechApi } from '../voiceApi'
import { detectVoicebox, OPEN_ENGINES, useVoicebox, VOICEBOX_SITE, voiceboxError, voiceboxHere, voiceboxReady } from '../voicebox'
import { wav16k } from '../audio'
import { lostKey } from '../core/secrets'
import { beginDemo } from './demoStart'

/** your own model for the AI characters' lines (a preset, or any OpenAI-compatible API), or the demo (one more option
 *  in the row). onPick: what is chosen now, saved or not. own: opened to leave the demo, so the demo isn't the one
 *  chosen. Saved while livliv.ai gives the text, it is kept for when that is off */
export function ModelForm({ forStart, own, done, demoDone, onPick, onContinue, noDemo }: { forStart?: boolean; own?: boolean; done?: () => void; demoDone?: () => void; onPick?: (kind: 'demo' | 'openai') => void; onAccount: () => void; onContinue?: () => void; noDemo?: boolean }) {
  const cur = useBrainConfig(), { scene } = useScene()
  const demoAvailable = demoFor(participants(scene))?.script.template === 'trio'
  const [demo, setDemo] = useState(!own && cur.kind === 'demo')
  useEffect(() => { onPick?.(demo ? 'demo' : 'openai') }, [demo])  // eslint-disable-line react-hooks/exhaustive-deps
  const [d, setD] = useState<ModelConfig>(() => (previousModelConfig().provider ? previousModelConfig() : { kind: 'openai', provider: PROVIDERS_HERE[0].id, base: PROVIDERS_HERE[0].base, key: '', model: '' }))
  const [models, setModels] = useState<string[]>([])
  const [st, setSt] = useState<{ busy?: 'list' | 'test' | 'demo'; ok?: number; batch?: boolean; err?: string }>({})
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort() }, [])
  const change = (patch: Partial<ModelConfig>) => { request.current?.abort(); request.current = null; setSt({}); setModels([]); setD((value) => ({ ...value, ...patch })) }
  const p = providerOf(d)
  const choose = (id: string) => {
    request.current?.abort(); request.current = null
    const q = PROVIDERS.find((x) => x.id === id)!
    setDemo(false); setModels([]); setSt({})
    setD((x) => ({ ...x, provider: id, base: q.base || (x.provider === 'custom' ? x.base : ''), key: x.provider === id ? x.key : '', model: x.provider === id ? x.model : '' }))
  }
  const fetchModels = async (c = d) => {
    if (!c.base || (!c.key && !providerOf(c).noKey)) return
    request.current?.abort(); const controller = new AbortController(); request.current = controller
    setSt({ busy: 'list' })
    try {
      const list = await listModels(c, controller.signal)
      if (controller.signal.aborted || request.current !== controller) return
      setModels(list); setSt({})
      if (list[0]) setD((value) => value.model ? value : { ...value, model: list[0] })
    } catch (error) { if (!controller.signal.aborted && request.current === controller) setSt({ err: (error as Error).message }) }
  }
  const test = async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller
    setSt({ busy: 'test' })
    try {
      const airi = chooseEngine(d, participants(scene).filter((character) => character.lines === 'ai'), { kind: 'test' }, features).engine === 'airi'
      const result = airi ? await testAiriModel(d, controller.signal) : { seconds: await testModel(d, controller.signal), batch: false }
      if (!controller.signal.aborted && request.current === controller) setSt({ ok: result.seconds, batch: result.batch })
    }
    catch (error) { if (!controller.signal.aborted && request.current === controller) setSt({ err: (error as Error).message }) }
  }
  const save = async (playDemo = demo) => {
    request.current?.abort(); request.current = null
    try {
      if (playDemo) { setSt({ busy: 'demo' }); await beginDemo(demoDone ?? done) }
      else { if (cur.kind === 'demo') talk.stop(); saveOwnModel(d); done?.(); if (forStart) onContinue?.() }
      setSt({})
    } catch (error) { setSt({ err: (error as Error).message }) }
  }
  return <div className="model-form">
    {!noDemo && <div className="demo-launch"><div><b>{tr('三人聊天演示')}</b><span>{tr('无需密钥')}</span></div><button title={demoAvailable ? undefined : tr('打开演示舞台')} disabled={st.busy === 'demo'} onClick={() => void save(true)}>{st.busy === 'demo' ? <LoaderCircle size={14} className="spin" /> : <Play size={14} />}{tr('看演示')}</button></div>}
    <div className="providers">
      {PROVIDERS_HERE.map((q) => <button key={q.id} className={!demo && d.provider === q.id ? 'on' : ''} disabled={st.busy === 'demo'} onClick={() => choose(q.id)}>{tr(q.label ?? '')}</button>)}
      {/* the three's prepared conversation in their recorded voices: no key, no model */}
      {!noDemo && <button className={`demo${demo ? ' on' : ''}`} disabled={st.busy === 'demo'} onClick={() => { request.current?.abort(); setDemo(true); setSt({}) }}>{tr("演示")}</button>}
    </div>
    {!demo && features.host === 'site' && <p className="hint">{tr("Ollama 等本机服务请用桌面版")}</p>}
    {!demo && <>
      {(p.id === 'custom' || p.id === 'ollama') && <label className="field"><span>{tr("接口地址")}</span>
        <input value={d.base} placeholder="https://…/v1" onChange={(e) => change({ base: e.target.value, model: '' })} onBlur={() => void fetchModels()} /></label>}
      {!p.noKey && <label className="field"><span>{tr("密钥")}<span className="lock" title={tr("只存在这台电脑上")}><Lock size={11} /></span>
        {/* the key saved for this service: 清除 takes it off this computer (the model stays chosen) */}
        {previousModelConfig().key && previousModelConfig().provider === d.provider && <button type="button" className="link get clear-key" title={tr("从这台电脑上删掉保存的密钥")} onClick={() => { clearBrainKey(); change({ key: '' }) }}>{tr("清除")}</button>}
        {p.keyUrl && <a className="get" href={p.keyUrl} target="_blank" rel="noreferrer">{tr("获取")}<ExternalLink size={11} /></a>}</span>
        <input type="password" value={d.key} placeholder="sk-…" autoComplete="off" onChange={(e) => change({ key: e.target.value })} onBlur={() => void fetchModels()} /></label>}
      {!p.noKey && !d.key && (lostKey('livliv-stage:brain') || lostKey('livliv-stage:brain-api')) && <p className="hint error">{tr('这台电脑上保存的密钥读不出来了，请重新填写')}</p>}
      <label className="field"><span>{tr("模型")}</span>
        <div className="row model-pick">
          <input list="model-list" value={d.model} placeholder={st.busy === 'list' ? tr("正在拿模型列表…") : tr("模型名")} onChange={(e) => change({ model: e.target.value })} />
          <button className="icon" title={tr("从接口拿模型列表")} disabled={!d.base} onClick={() => void fetchModels()}>{st.busy === 'list' ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}</button>
        </div>
        <datalist id="model-list">{models.map((m) => <option key={m} value={m} />)}</datalist>
      </label>
      {/* AIRI runs in the desktop app and on any web page (持续聊天 there); an older desktop app without window capture shows the switch off, marked 桌面版 */}
      <label className="switch"><span>{tr('单角色会话优先使用 AIRI')}{!features.airi && <span className="desk-tag">{tr('桌面版')}</span>}</span><input type="checkbox" disabled={!features.airi} checked={features.airi && d.airi !== false} onChange={(e) => change({ airi: e.target.checked })} /><i /></label>
    </>}
    {st.err && <p className="hint error" role="alert">{st.err}</p>}
    {st.batch && <p className="hint" role="status">{tr('可以聊天，连接游戏或发送画面需要流式输出。')}</p>}
    <div className="row end">
      {!demo && <button disabled={!brainReady(d) || st.busy === 'test'} onClick={() => void test()}>
        {st.busy === 'test' ? <LoaderCircle size={14} className="spin" /> : st.ok !== undefined ? <Check size={14} /> : null}
        {st.ok !== undefined ? tr("{0} 秒", st.ok.toFixed(1)) : tr("测试")}
      </button>}
      <button className="primary" disabled={st.busy === 'demo' || (!demo && !brainReady(d))} onClick={() => void save()}>
        {forStart || demo ? <>{st.busy === 'demo' ? <LoaderCircle size={14} className="spin" /> : <Play size={14} />}{demo ? tr("看演示") : tr("开始")}</> : tr("保存")}</button>
    </div>
  </div>
}

/** your speech API: the characters' voices (OpenAI-compatible /audio/speech) and push to talk (/audio/transcriptions);
 *  测试 says a line and, with a recognition model, hears it back */
export function SpeechForm({ forCharacter, onDone }: { forCharacter?: string; onDone: () => void }) {
  const cur = useSpeech(), chat = useBrainConfig()
  const first = (id: string): SpeechApi => { const q = SPEECH_PROVIDERS.find((x) => x.id === id)!; return { ...SPEECH_UNSET, provider: id, base: q.base, model: q.model, asr: q.asr, voice: '' } }
  // none chosen: it follows the model's key where that speaks too
  const ofModel = speechOfModel(chat)
  // none set and Voicebox running on this computer: that is the voice in use, shown as chosen
  const voicebox = useVoicebox(), voiceboxInUse = !cur.provider && !ofModel && voiceboxReady()
  useEffect(() => { if (voiceboxHere()) void detectVoicebox() }, [])
  const [mode, setMode] = useState<'follow' | 'off' | 'own'>(forCharacter ? 'own' : !cur.provider ? (ofModel ? 'follow' : voiceboxInUse ? 'own' : 'off') : cur.provider === 'off' ? 'off' : 'own')
  const modeEdited = useRef(!!forCharacter)
  const [d, setD] = useState<SpeechApi>(() => (cur.provider && cur.provider !== 'off' ? cur : voiceboxInUse ? VOICEBOX_SPEECH : first('qwen')))
  useEffect(() => {
    if (!modeEdited.current && !cur.provider) {
      if (ofModel) setMode('follow')
      else if (voiceboxInUse) { setMode('own'); setD(VOICEBOX_SPEECH) }
      else setMode('off')
    } else if (mode === 'follow' && !ofModel) setMode('off')
  }, [cur.provider, ofModel?.provider, ofModel?.base, ofModel?.key, mode, voiceboxInUse])
  const off = mode !== 'own'
  const [voices, setVoices] = useState<string[]>([])
  const [st, setSt] = useState<{ busy?: boolean; ok?: string; err?: string }>({})
  const p = speechProviderOf(d)
  // the voices it offers, once the address and key have stopped changing
  useEffect(() => {
    if (off || d.provider === 'voicebox' || !/^https?:\/\/[^/]+/.test(d.base) || (!d.key && !p.noKey)) return
    const t = setTimeout(() => void listVoices(d).then(setVoices), 600)
    return () => clearTimeout(t)
  }, [off, d.provider, d.base, d.key])  // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (id: string) => { modeEdited.current = true; setMode('own'); setSt({}); if (id === 'voicebox') void detectVoicebox(); setD((x) => ({ ...first(id), key: x.provider === id ? x.key : '', base: id === 'custom' && x.provider === 'custom' ? x.base : first(id).base })) }
  // the AI model's key, where it is the same service
  const sameKey = !!ofModel && ofModel.provider === d.provider && ofModel.base.replace(/\/+$/, '') === d.base.replace(/\/+$/, '') && d.key !== ofModel.key
  const save = () => {
    saveSpeech(mode === 'follow' ? SPEECH_UNSET : mode === 'off' ? SPEECH_OFF : d)
    if (forCharacter) {
      const character = store.get().items.find((item) => item.id === forCharacter)
      if (character?.kind === 'character' && !character.remote && speechReady(activeSpeech())) store.patch(character.id, { voice: { ...character.voice, source: 'api' } })
      onDone()
    }
  }
  const test = async () => {
    setSt({ busy: true })
    try {
      const blob = await speakApi(d, tr("你好，这是 VTuber Stage 的声音测试。"), d.voice, 'happy', 1)
      const url = URL.createObjectURL(blob)
      await new Audio(url).play().finally(() => setTimeout(() => URL.revokeObjectURL(url), 30_000))
      if (!asrReady(d)) { setSt({ ok: tr("能说") }); return }
      const buf = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(await blob.arrayBuffer())
      setSt({ ok: tr("听到：{0}", await transcribeApi(d, await wav16k(buf.getChannelData(0), buf.sampleRate))) })
    } catch (e) { setSt({ err: (e as Error).message }) }
  }
  return <div className="model-form">
    <div className="providers">
      {ofModel && <button className={mode === 'follow' ? 'on' : ''} title={tr("用文字模型的密钥")} onClick={() => { modeEdited.current = true; setMode('follow'); setSt({}) }}>{tr("跟模型一样")}</button>}
      {SPEECH_HERE.map((q) => <button key={q.id} className={!off && d.provider === q.id ? 'on' : ''} onClick={() => choose(q.id)}>{tr(q.label ?? '')}</button>)}
      <button className={`demo${mode === 'off' ? ' on' : ''}`} title={tr("只出字幕")} onClick={() => { modeEdited.current = true; setMode('off'); setSt({}) }}>{tr("不用")}</button>
    </div>
    {!off && p.id === 'voicebox' && <>
      <p className={`hint${voicebox.error ? ' error' : ''}`}>
        {voicebox.checking ? tr('正在查找本机的 Voicebox…') : voicebox.status === 'on' ? <>{tr('Voicebox 在运行：{0} 个声音', voicebox.profiles.length)}<span className="chip">{tr('免费，在本机')}</span></>
          : voiceboxError(voicebox.error ?? 'not-running', voicebox.detail)}
        {voicebox.status !== 'on' && !voicebox.checking && <> <a href={VOICEBOX_SITE} target="_blank" rel="noreferrer">{tr('下载 Voicebox')}<ExternalLink size={11} /></a></>}
      </p>
      <label className="field"><span>{tr("默认声音")}</span>
        <select value={d.voice} onChange={(e) => setD({ ...d, voice: e.target.value })}>
          <option value="">{tr('按角色分配')}</option>
          {voicebox.profiles.map((v) => <option key={v.id} value={v.id}>{v.name}{OPEN_ENGINES.has(v.engine) ? '' : ` · ${v.engine}`}</option>)}
        </select></label>
      <label className="switch"><span>{tr('也用它听你说话')}<span className="chip">{tr('Whisper，免费，在本机')}</span></span><input type="checkbox" checked={!!d.asr} onChange={(e) => setD({ ...d, asr: e.target.checked ? 'whisper' : '' })} /><i /></label>
      {st.err && <p className="hint error">{st.err}</p>}
    </>}
    {!off && p.id !== 'voicebox' && <>
      {(p.id === 'custom' || p.id === 'kokoro') && <label className="field"><span>{tr("接口地址")}</span>
        <input value={d.base} placeholder="https://…/v1" onChange={(e) => setD({ ...d, base: e.target.value })} /></label>}
      {!p.noKey && <label className="field"><span>{tr("密钥")}<span className="lock" title={tr("只存在这台电脑上")}><Lock size={11} /></span>
        {cur.key && cur.provider === d.provider && <button type="button" className="link get clear-key" title={tr("从这台电脑上删掉保存的密钥")} onClick={() => { clearSpeechKey(); setD({ ...d, key: '' }) }}>{tr("清除")}</button>}
        {sameKey && <button type="button" className="link get" onClick={() => setD({ ...d, key: (chat as ModelConfig).key })}>{tr("用 AI 模型的密钥")}</button>}
        {!sameKey && p.keyUrl && <a className="get" href={p.keyUrl} target="_blank" rel="noreferrer">{tr("获取")}<ExternalLink size={11} /></a>}</span>
        <input type="password" value={d.key} placeholder="sk-…" autoComplete="off" onChange={(e) => setD({ ...d, key: e.target.value })} /></label>}
      {!d.key && lostKey('livliv-stage:speech') && <p className="hint error">{tr('这台电脑上保存的密钥读不出来了，请重新填写')}</p>}
      <div className="row two">
        <label className="field"><span>{tr("语音模型")}</span><input value={d.model} onChange={(e) => setD({ ...d, model: e.target.value })} /></label>
        <label className="field"><span>{tr("默认音色")}</span><input list="speech-voices" value={d.voice} placeholder={tr('按角色自动分配')} onChange={(e) => setD({ ...d, voice: e.target.value })} /></label>
      </div>
      <datalist id="speech-voices">{voices.map((v) => <option key={v} value={v} />)}</datalist>
      <label className="field"><span>{tr("识别模型")}</span><input value={d.asr} placeholder={tr("按住说话用")} onChange={(e) => setD({ ...d, asr: e.target.value })} /></label>
      {st.err && <p className="hint error">{st.err}</p>}
    </>}
    <div className="row end">
      {!off && <button disabled={!speechReady(d) || st.busy} onClick={() => void test()} title={st.ok}>
        {st.busy ? <LoaderCircle size={14} className="spin" /> : st.ok ? <Check size={14} /> : null}
        <span className="ellipsis">{st.ok ?? tr("测试")}</span>
      </button>}
      <button className="primary" disabled={!off && !speechReady(d)} onClick={save}>{tr("保存")}</button>
    </div>
  </div>
}

