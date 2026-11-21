// The forms for the services Stage talks to: the text model (a model of one's own, LivLiv's points on the site and in the
// desktop app, or the demo) and the speech API (voices and recognition). Settings → 连接 shows them; so does the model
// card the console opens.
import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, LoaderCircle, Lock, Play, RefreshCw } from 'lucide-react'
import { tr } from '../i18n'
import { brainReady, listModels, previousModelConfig, providerOf, PROVIDERS, PROVIDERS_HERE, saveBrainConfig, savedBrain, testModel, useBrainConfig, type ModelConfig } from '../brain'
import { talk } from '../conversation'
import { testAiriModel } from '../airiEngine'
import { chooseEngine } from '../brains/select'
import { features } from '../core/platform'
import { demoFor } from '../demo'
import { cancelConnect, openConnect, useAccount } from '../livliv'
import { participants, store, useScene } from '../scene'
import { activeSpeech, asrReady, listVoices, saveSpeech, SPEECH_HERE, SPEECH_OFF, SPEECH_PROVIDERS, SPEECH_UNSET, speakApi, speechOfModel, speechProviderOf, speechReady, transcribeApi, useSpeech, type SpeechApi } from '../voiceApi'
import { wav16k } from '../audio'
import { beginDemo } from './demoStart'

/** where the AI characters' lines come from: your own model (a preset, or any OpenAI-compatible API), LivLiv's points
 *  on livliv.ai, or the demo (one more option in the row). onPick: what is chosen now, saved or not. own: opened to
 *  leave the demo, so the demo isn't the one chosen */
export function ModelForm({ forStart, own, done, demoDone, onPick, onAccount, onContinue, noDemo }: { forStart?: boolean; own?: boolean; done?: () => void; demoDone?: () => void; onPick?: (kind: 'demo' | 'livliv' | 'openai') => void; onAccount: () => void; onContinue?: () => void; noDemo?: boolean }) {
  const cur = useBrainConfig(), { scene } = useScene()
  const demoAvailable = demoFor(participants(scene))?.script.template === 'trio'
  const [demo, setDemo] = useState(!own && cur.kind === 'demo')
  // livliv.ai/stage: LivLiv's points instead of a key of one's own (the site writes and voices the lines)
  // LivLiv's points (the site writes and voices the lines): on livliv.ai/stage and in the desktop app
  const [points, setPoints] = useState(features.points && (cur.kind === 'livliv' || !previousModelConfig().provider || (cur.kind === 'demo' && savedBrain().kind === 'livliv')))
  const account = useAccount()
  useEffect(() => { onPick?.(demo ? 'demo' : points ? 'livliv' : 'openai') }, [demo, points])  // eslint-disable-line react-hooks/exhaustive-deps
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
    setDemo(false); setPoints(false); setModels([]); setSt({})
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
      else { if (cur.kind === 'demo') talk.stop(); saveBrainConfig(points ? { kind: 'livliv' } : d); done?.(); if (forStart) onContinue?.() }
      setSt({})
    } catch (error) { setSt({ err: (error as Error).message }) }
  }
  return <div className="model-form">
    {!noDemo && <div className="demo-launch"><div><b>{tr('三人对谈演示')}</b><span>{tr('无需密钥')}</span></div><button title={demoAvailable ? undefined : tr('打开演示舞台')} disabled={st.busy === 'demo'} onClick={() => void save(true)}>{st.busy === 'demo' ? <LoaderCircle size={14} className="spin" /> : <Play size={14} />}{tr('看演示')}</button></div>}
    <div className="providers">
      {features.points && <button className={!demo && points ? 'on' : ''} disabled={st.busy === 'demo'} onClick={() => { request.current?.abort(); setDemo(false); setPoints(true); setSt({}); if (account.status !== 'in') onAccount() }}>livliv.ai</button>}
      {PROVIDERS_HERE.map((q) => <button key={q.id} className={!demo && !points && d.provider === q.id ? 'on' : ''} disabled={st.busy === 'demo'} onClick={() => choose(q.id)}>{tr(q.label ?? '')}</button>)}
      {/* the three's prepared conversation in their recorded voices: no key, no model */}
      {!noDemo && <button className={`demo${demo ? ' on' : ''}`} disabled={st.busy === 'demo'} onClick={() => { request.current?.abort(); setDemo(true); setSt({}) }}>{tr("演示")}</button>}
    </div>
    {demo ? null : points ? <>
      <p className="hint">{tr("无需密钥。消耗 livliv.ai 积分，每句台词 {0} 积分，只能用于 LivLiv 的角色。", account.linePoints)}</p>
      {/* signing in: the site's page on livliv.ai, a connect code in the desktop app (shown here while it waits) */}
      {account.connect ? <div className="connect-wait">
        <p className="hint"><LoaderCircle className="spin" size={12} /> {tr("在浏览器完成登录")} · <strong className="num">{account.connect.code}</strong></p>
        <div className="row"><button onClick={openConnect}><ExternalLink size={14} />{tr("再打开网页")}</button><button onClick={cancelConnect}>{tr("取消")}</button></div>
      </div> : account.status === 'out' && <button disabled={account.closed} onClick={onAccount}><ExternalLink size={14} />{tr("登录 livliv.ai")}</button>}
      {account.status === 'out' && account.error && !account.closed && <p className="hint error" role="alert">{tr(account.error ?? '')}</p>}
    </> : features.host === 'site' && <p className="hint">{tr("网页版只列出能在浏览器里直接调用的服务。本机的 Ollama 和其他接口，请用桌面版。")}</p>}
    {!demo && !points && <>
      {(p.id === 'custom' || p.id === 'ollama') && <label className="field"><span>{tr("接口地址")}</span>
        <input value={d.base} placeholder="https://…/v1" onChange={(e) => change({ base: e.target.value, model: '' })} onBlur={() => void fetchModels()} /></label>}
      {!p.noKey && <label className="field"><span>{tr("密钥")}<span className="lock" title={tr("只存在这台电脑上")}><Lock size={11} /></span>{p.keyUrl && <a className="get" href={p.keyUrl} target="_blank" rel="noreferrer">{tr("获取")}<ExternalLink size={11} /></a>}</span>
        <input type="password" value={d.key} placeholder="sk-…" autoComplete="off" onChange={(e) => change({ key: e.target.value })} onBlur={() => void fetchModels()} /></label>}
      <label className="field"><span>{tr("模型")}</span>
        <div className="row model-pick">
          <input list="model-list" value={d.model} placeholder={st.busy === 'list' ? tr("正在拿模型列表…") : tr("模型名")} onChange={(e) => change({ model: e.target.value })} />
          <button className="icon" title={tr("从接口拿模型列表")} disabled={!d.base} onClick={() => void fetchModels()}>{st.busy === 'list' ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}</button>
        </div>
        <datalist id="model-list">{models.map((m) => <option key={m} value={m} />)}</datalist>
      </label>
      {features.airi && <label className="switch"><span>{tr('单角色会话优先使用 AIRI')}</span><input type="checkbox" checked={d.airi !== false} onChange={(e) => change({ airi: e.target.checked })} /><i /></label>}
    </>}
    {st.err && <p className="hint error" role="alert">{st.err}</p>}
    {st.batch && <p className="hint" role="status">{tr('可以聊天，连接游戏或发送画面需要流式输出。')}</p>}
    <div className="row end">
      {!demo && !points && <button disabled={!brainReady(d) || st.busy === 'test'} onClick={() => void test()}>
        {st.busy === 'test' ? <LoaderCircle size={14} className="spin" /> : st.ok !== undefined ? <Check size={14} /> : null}
        {st.ok !== undefined ? tr("{0} 秒", st.ok.toFixed(1)) : tr("测试")}
      </button>}
      <button className="primary" disabled={st.busy === 'demo' || (!demo && (points ? account.status !== 'in' : !brainReady(d)))} onClick={() => void save()}>
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
  const [mode, setMode] = useState<'follow' | 'off' | 'own'>(forCharacter ? 'own' : !cur.provider ? (ofModel ? 'follow' : 'off') : cur.provider === 'off' ? 'off' : 'own')
  const modeEdited = useRef(!!forCharacter)
  useEffect(() => { if (!modeEdited.current && !cur.provider) setMode(ofModel ? 'follow' : 'off'); else if (mode === 'follow' && !ofModel) setMode('off') }, [cur.provider, ofModel?.provider, ofModel?.base, ofModel?.key, mode])
  const off = mode !== 'own'
  const [d, setD] = useState<SpeechApi>(() => (cur.provider && cur.provider !== 'off' ? cur : first('qwen')))
  const [voices, setVoices] = useState<string[]>([])
  const [st, setSt] = useState<{ busy?: boolean; ok?: string; err?: string }>({})
  const p = speechProviderOf(d)
  // the voices it offers, once the address and key have stopped changing
  useEffect(() => {
    if (off || !/^https?:\/\/[^/]+/.test(d.base) || (!d.key && !p.noKey)) return
    const t = setTimeout(() => void listVoices(d).then(setVoices), 600)
    return () => clearTimeout(t)
  }, [off, d.provider, d.base, d.key])  // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (id: string) => { modeEdited.current = true; setMode('own'); setSt({}); setD((x) => ({ ...first(id), key: x.provider === id ? x.key : '', base: id === 'custom' && x.provider === 'custom' ? x.base : first(id).base })) }
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
      const blob = await speakApi(d, tr("你好，这是 LivLiv Stage 的声音测试。"), d.voice, 'happy', 1)
      const url = URL.createObjectURL(blob)
      await new Audio(url).play().finally(() => setTimeout(() => URL.revokeObjectURL(url), 30_000))
      if (!asrReady(d)) { setSt({ ok: tr("能说") }); return }
      const buf = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(await blob.arrayBuffer())
      setSt({ ok: tr("听到：{0}", await transcribeApi(d, await wav16k(buf.getChannelData(0), buf.sampleRate))) })
    } catch (e) { setSt({ err: (e as Error).message }) }
  }
  return <div className="model-form">
    <div className="providers">
      {ofModel && <button className={mode === 'follow' ? 'on' : ''} title={tr("用 AI 模型的密钥，不用再填")} onClick={() => { modeEdited.current = true; setMode('follow'); setSt({}) }}>{tr("跟模型一样")}</button>}
      {SPEECH_HERE.map((q) => <button key={q.id} className={!off && d.provider === q.id ? 'on' : ''} onClick={() => choose(q.id)}>{tr(q.label ?? '')}</button>)}
      <button className={`demo${mode === 'off' ? ' on' : ''}`} title={tr("没有语音接口：角色用 LivLiv 的声音，没有就只出字幕")} onClick={() => { modeEdited.current = true; setMode('off'); setSt({}) }}>{tr("不用")}</button>
    </div>
    {forCharacter && mode !== 'off' && <p className="hint">{tr('保存后，此角色会使用你的语音接口。')}</p>}
    {!off && <>
      {(p.id === 'custom' || p.id === 'kokoro') && <label className="field"><span>{tr("接口地址")}</span>
        <input value={d.base} placeholder="https://…/v1" onChange={(e) => setD({ ...d, base: e.target.value })} /></label>}
      {!p.noKey && <label className="field"><span>{tr("密钥")}<span className="lock" title={tr("只存在这台电脑上")}><Lock size={11} /></span>
        {sameKey && <button type="button" className="link get" onClick={() => setD({ ...d, key: (chat as ModelConfig).key })}>{tr("用 AI 模型的密钥")}</button>}
        {!sameKey && p.keyUrl && <a className="get" href={p.keyUrl} target="_blank" rel="noreferrer">{tr("获取")}<ExternalLink size={11} /></a>}</span>
        <input type="password" value={d.key} placeholder="sk-…" autoComplete="off" onChange={(e) => setD({ ...d, key: e.target.value })} /></label>}
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

