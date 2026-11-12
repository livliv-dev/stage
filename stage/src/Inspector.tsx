import { imageBackground, pictureFile, usePicture } from './assets'
import { getLocale, tr } from './i18n'
import { onSite } from './host'
// The right panel. With something selected, its settings: a character's look, who gives it its lines (and its voice),
// what moves it, how it moves and looks; a subtitle's speaker and style; a text's words. With nothing selected, the
// stage's: shape, background, and the talk rules (order, cutting in, language, length).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Captions, Copy, X, Crosshair, Eye, EyeOff, Image as ImageIcon, ImagePlus, LayoutGrid, Lock, LockOpen, Trash, Type, UserRound, Volume2 } from 'lucide-react'
import { actors, onActors } from './actors'
import { talk, useConversation } from './conversation'
import {
  bubbleFor, characters, participants, COLORS, DRIVERS, GAZES, LENGTHS, MOTIONS, ORDERS, arrange, reshape, store, SUB_STYLES, useScene,
  type CharacterItem, type Item, type SubtitleItem, type TextItem,
} from './scene'
import { onVoices, voices } from './speech'
import { modelId, useAccount, voicesOf, type Voices } from './livliv'
import { demoVoice } from './demo'
import { useBrainConfig } from './brain'
import { apiVoice, listVoices, speechProviderOf, speechReady, useActiveSpeech, voiceRoute } from './voiceApi'
import { AudiencePanel } from './AudiencePanel'
import { DevicePanel } from './DevicePanel'
import { TrackingPanel } from './TrackingPanel'
import { NetworkPanel } from './NetworkPanel'
import { motionSupported } from './networkTracking'
import { GamepadPanel } from './GamepadPanel'
import { PropPanel } from './PropPanel'
import { AvatarView } from './AvatarView'
import { SidebarToggle } from './SidebarToggle'
import { CONTROLS, controlOf, controlSettings } from './workflow'
import { keysOf, modeOf, MOVE_KEYS } from './live'

const settingsLabel = (item?: Item) => tr(item ? ({ character: '角色设置', subtitle: '字幕设置', text: '文字设置', image: '图片设置' })[item.kind] : '舞台设置')

export function Panel({ onFold }: { onFold: () => void }) {
  const { scene, selected } = useScene()
  const item = scene.items.find((i) => i.id === selected)
  const patch = (p: Partial<Item>) => { if (item) store.patch(item.id, p) }
  return <>
    <SidebarToggle side="right" folded={false} label={settingsLabel(item)} onToggle={onFold} />
    <aside className="panel" onPointerDown={(e) => e.stopPropagation()}>
      {item ? <>
        <header className="panel-head">
          <span className="panel-identity"><b>{item.kind === 'character' ? item.name : settingsLabel(item)}</b>{item.kind === 'character' && <small>{settingsLabel(item)}</small>}</span>
          <span className="tools">
            <button disabled={item.kind === 'character' && !!item.remote} className="icon" title={tr("复制（⌘D）")} onClick={() => store.duplicate(item.id)}><Copy size={15} /></button>
            <button className="icon" title={tr("往前一层")} onClick={() => store.restack(item.id, 1)}><ArrowUp size={15} /></button>
            <button className="icon" title={tr("往后一层")} onClick={() => store.restack(item.id, -1)}><ArrowDown size={15} /></button>
            <button className="icon danger" title={item.kind === 'character' && item.remote ? tr("隐藏朋友角色") : tr("删除（Delete）")} onClick={() => store.remove(item.id)}>{item.kind === 'character' && item.remote ? <EyeOff size={15} /> : <Trash size={15} />}</button>
          </span>
        </header>
        {item.kind === 'character' && <CharacterPanel c={item} patch={patch} />}
        {item.kind === 'subtitle' && <SubtitlePanel s={item} patch={patch} />}
        {item.kind === 'text' && <TextPanel t={item} patch={patch} />}
        {item.kind === 'image' && <PropPanel item={item} />}
      </> : <SceneSettings />}
    </aside>
  </>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="section"><h3>{tr(title)}</h3>{children}</section>
}

function Seg<T extends string | number>({ value, options, set }: { value: T; options: readonly { id: T; label: string; title?: string; hint?: string; disabled?: boolean }[]; set: (v: T) => void }) {
  return <div className="seg">{options.map((o) => <button key={String(o.id)} className={o.id === value ? 'on' : ''} title={tr(o.title ?? o.hint ?? '')} disabled={o.disabled} onClick={() => set(o.id)}>{tr(o.label ?? '')}</button>)}</div>
}

function Switch({ label, on, set, hint }: { label: string; on: boolean; set: (on: boolean) => void; hint?: string }) {
  return (
    <label className="switch" title={hint ? tr(hint) : undefined}>
      <span>{tr(label)}</span>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} /><i />
    </label>
  )
}

function Slider({ label, value, min, max, step, show, set, commit = false }: { label: string; value: number; min: number; max: number; step?: number; show: string | ((value: number) => string); set: (v: number) => void; commit?: boolean }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const release = () => { if (commit && draft !== value) set(draft) }
  const current = commit ? draft : value
  return (
    <label className="field"><span>{tr(label)} <b>{typeof show === 'function' ? show(current) : show}</b></span>
      <input type="range" min={min} max={max} step={step ?? 1} value={current} onChange={(e) => { const next = +e.target.value; setDraft(next); if (!commit) set(next) }} onPointerUp={release} onKeyUp={release} onBlur={release}
        style={{ ['--p' as string]: `${((current - min) / (max - min)) * 100}%` }} />
    </label>
  )
}


/** its voice: its LivLiv one (a LivLiv character, signed in), or the system's */
function VoiceSection({ c, patch }: { c: CharacterItem; patch: (p: Partial<CharacterItem>) => void }) {
  const brain = useBrainConfig(), conversation = useConversation()
  const demo = brain.kind === 'demo' ? demoVoice(c, participants(store.get())) : null
  const [testing, setTesting] = useState(false), preview = useRef<AbortController | null>(null)
  useEffect(() => { setTesting(false); return () => { preview.current?.abort(); preview.current = null } }, [c.id])
  useEffect(() => { if (conversation.running) preview.current?.abort() }, [conversation.running])
  const account = useAccount(), mid = modelId(c), a = actors.get(c.id)
  const [list, setList] = useState<Voices | null>(null)
  useEffect(() => {
    setList(null)
    if (mid) voicesOf(mid).then(setList, () => setList(null))
  }, [mid])
  // what it speaks in now (voiceRoute); a source that can't be had is there, greyed: LivLiv's needs the account, yours
  // the speech API (settings)
  const speech = useActiveSpeech(), can = !!mid && account.status === 'in', api = speechReady(speech), v = c.voice
  const route = voiceRoute(c, speech), livliv = route === 'livliv'
  const [apiVoices, setApiVoices] = useState<string[]>([])
  useEffect(() => { if (route === 'api') void listVoices(speech).then(setApiVoices) }, [route, speech])
  const own = list?.own
  const fallback = !list ? '' : list.voice === own?.id ? tr("它自己的声音") : list.voices.find((x) => x.id === list.voice)?.name ?? ''
  const test = async () => {
    if (preview.current) { preview.current.abort(); return }
    if (!a || a.status !== 'ready' || conversation.running) return
    const controller = new AbortController(); preview.current = controller; setTesting(true)
    try {
      const take = await a.prepare(demo?.text ?? tr("你好，我是{0}。", c.name), 'happy', true, controller.signal, demo?.audio)
      controller.signal.throwIfAborted(); await a.perform(take, 'happy', 'nod', controller.signal)
    } catch (error) { if (!controller.signal.aborted) { a.voiceError = (error as Error).message; setTesting(false) } }
    finally { if (preview.current === controller) { preview.current = null; setTesting(false) } }
  }
  const audition = <button disabled={a?.status !== 'ready' || conversation.running} onClick={() => void test()}>{tr(testing ? '停止试听' : '试听')}</button>
  if (demo) return <Section title={tr('声音')}><p className="voice-demo"><Volume2 size={14} />{tr('演示声音')}</p>{audition}{a?.voiceError && <p className="hint error" role="alert">{tr(a.voiceError)}</p>}</Section>
  return (
    <Section title={tr("声音")}>
      <Seg value={route as 'livliv' | 'api' | 'system'} set={(source) => patch({ voice: { ...v, source } })} options={[
        ...(mid ? [{ id: 'livliv' as const, label: tr("角色声音"), disabled: !can, title: can ? tr("角色在 livliv.ai 上的声音") : account.closed ? tr("帐号登录暂未开放") : account.status === 'unknown' ? '' : onSite ? tr("登录 livliv.ai 后可用") : tr("在设置里连上 livliv.ai 帐号后可用") }] : []),
        { id: 'api' as const, label: tr("我的接口"), disabled: !api, title: api ? `${tr(speechProviderOf(speech).label)} · ${speech.model}` : tr("在设置里接上语音接口后可用") },
        { id: 'system' as const, label: tr("系统朗读") },
      ]} />
      {livliv ? <>
        <label className="field spaced"><span>{tr("用哪个声音")}</span>
          <select value={v.livliv} onChange={(e) => patch({ voice: { ...v, livliv: e.target.value } })}>
            <option value="">{fallback ? tr("默认（{0}）", fallback) : tr("默认")}</option>
            {own && <option value={own.id}>{tr("它自己的声音")}{own.name ? `（${own.name}）` : ''}</option>}
            {list?.voices.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.desc}</option>)}
          </select>
        </label>
      </> : route === 'api' ? <>
        <label className="field spaced"><span>{tr("音色")}</span>
          <input list={`api-voices-${c.id}`} value={v.api} placeholder={tr("默认（{0}）", apiVoice(c, speech, participants(store.get())).split(':').at(-1) || tr("接口的"))} onChange={(e) => patch({ voice: { ...v, api: e.target.value } })} />
          <datalist id={`api-voices-${c.id}`}>{apiVoices.map((x) => <option key={x} value={x} />)}</datalist>
        </label>
        <Slider label={tr("语速")} value={v.rate} min={0.6} max={1.6} step={0.05} show={v.rate.toFixed(2)} set={(rate) => patch({ voice: { ...v, rate } })} />
      </> : route === 'system' ? <>
        <select value={v.name} onChange={(e) => patch({ voice: { ...v, name: e.target.value } })}>
          <option value="">{tr("按台词的语言自动选")}</option>
          {voices().map((x) => <option key={x.name} value={x.name}>{x.name}（{x.lang}）</option>)}
        </select>
        <div className="row two">
          <Slider label={tr("音调")} value={v.pitch} min={0.5} max={1.6} step={0.05} show={v.pitch.toFixed(2)} set={(pitch) => patch({ voice: { ...v, pitch } })} />
          <Slider label={tr("语速")} value={v.rate} min={0.6} max={1.6} step={0.05} show={v.rate.toFixed(2)} set={(rate) => patch({ voice: { ...v, rate } })} />
        </div>
      </> : <p className="hint">{tr("当前只显示字幕。选择系统朗读，或在设置里接入语音接口后出声。")}</p>}
      {a?.voiceError && route !== 'system' && route !== 'none' && <p className="hint error">{tr("上一句没有出声：")}{tr(a.voiceError ?? '')}</p>}
      {(route === 'api' || route === 'livliv') && <Slider label={tr("角色语音音量")} value={c.tuning.volume} min={0} max={1} step={0.05} show={`${Math.round(c.tuning.volume * 100)}%`} set={(volume) => patch({ tuning: { ...c.tuning, volume } })} />}
      {route !== 'none' && audition}
    </Section>
  )
}

/** an expression's name in the page's language */
const nameOf = (x: { label: string; labels?: Record<string, string> }) => x.labels?.[getLocale()] ?? x.labels?.[getLocale().split('-')[0]] ?? x.labels?.en ?? x.label
const moveKey = (m: string) => Object.entries(MOVE_KEYS).find(([, id]) => id === m)?.[0].toUpperCase() ?? ''

function CharacterPanel({ c, patch }: { c: CharacterItem; patch: (p: Partial<CharacterItem>) => void }) {
  const { scene } = useScene()
  const [, redraw] = useState(0)
  useEffect(() => onActors(() => redraw((n) => n + 1)), [])
  useEffect(() => onVoices(() => redraw((n) => n + 1)), [])
  const a = actors.get(c.id), keys = new Map(a ? keysOf(a).map((k) => [k.id, k.key]) : [])
  const hasBubble = scene.items.some((i) => i.kind === 'subtitle' && i.of === c.id)
  const voiced = c.lines === 'ai' || (c.lines === 'me' && c.readAloud)
  const tracked = c.driver === 'face' || c.driver === 'replay'
  const speech = useActiveSpeech(), route = voiceRoute(c, speech)
  const talkMotion = voiced && !tracked && (route === 'api' || route === 'livliv')
  if (c.remote) return <Section title={tr("联播角色")}>
    <p className="hint">{tr("由 {0} 控制", c.remote.person)}</p>
    <label className="field"><span>{tr("角色名称")}</span><input value={c.name} onChange={(event) => patch({ name: event.target.value })} /></label>
    <Switch label={tr("显示在舞台上")} on={!c.hidden} set={(visible) => patch({ hidden: !visible })} />
    <Switch label={tr("静音朋友声音")} on={c.muted} set={(muted) => patch({ muted })} />
    <Switch label={tr("左右翻转")} on={c.mirror} set={(mirror) => patch({ mirror })} />
    <Switch label={tr("投影")} on={c.shadow} set={(shadow) => patch({ shadow })} />
  </Section>
  return <>
    <Section title={tr("谁来控制")}>
      <Seg value={controlOf(c)} options={CONTROLS} set={(control) => { patch(controlSettings(control)); if (control === 'human') talk.setAs(c.id) }} />
      <p className="hint">{tr(CONTROLS.find((x) => x.id === controlOf(c))?.hint ?? '')}</p>
      <Switch label={tr("静音角色声音")} on={c.muted} set={(muted) => patch({ muted })} />
    </Section>
    {c.lines === 'me' && <DevicePanel character={c} />}
    {voiced && <VoiceSection c={c} patch={patch} />}
    <details className="advanced"><summary>{tr("外观")}</summary>
    <Section title={tr("外观")}>
      <label className="field"><span>{tr("名字")}</span><input value={c.name} onChange={(e) => patch({ name: e.target.value })} /></label>
      <div className="field"><span>{tr("字幕颜色")}</span>
        <div className="row">
          {COLORS.map((col) => <button key={col} className={`swatch${c.color === col ? ' on' : ''}`} style={{ background: col }} aria-label={col} onClick={() => patch({ color: col })} />)}
        </div>
      </div>
      <Switch label={tr("左右翻转")} on={c.mirror} set={(mirror) => patch({ mirror })} />
      <Switch label={tr("投影")} on={c.shadow} set={(shadow) => patch({ shadow })} hint={tr("身后一层柔和的影子，浅色背景上更立体")} />
      <AvatarView c={c} patch={patch} />
      {!hasBubble && <button className="link" onClick={() => store.add(bubbleFor(c))}>{tr("给它加一个字幕气泡")}</button>}
    </Section></details>
    {c.lines === 'ai' && <details className="advanced persona-settings" key={c.id}><summary>{tr('人设与风格')}</summary>
      <Section title={tr('人设与风格')}>
        <label className="field spaced"><span>{tr("人设")}</span>
          {/* its example lines go with the card as written */}
          <textarea rows={3} value={c.persona} placeholder={tr("她是谁、怎么说话，一两句就够")} onChange={(e) => patch({ persona: e.target.value, examples: undefined })} />
        </label>
        {c.style !== undefined && <label className="field"><span>{tr("说话风格")}</span>
          <textarea rows={3} value={c.style} onChange={(e) => patch({ style: e.target.value, examples: undefined })} />
        </label>}
        <div className="field"><span>{tr("每句多长")}</span><Seg value={c.length} options={LENGTHS} set={(length) => patch({ length })} /></div>
        <Slider label={tr("发言频率")} value={c.chatty} min={0.3} max={2} step={0.1} show={c.chatty < 0.8 ? tr("少") : c.chatty > 1.3 ? tr("多") : tr("一般")} set={(chatty) => patch({ chatty })} />
      </Section>
    </details>}
    {c.lines === 'me' && <Section title={tr('台词')}>
      <Switch label={tr("用角色的声音念出来")} on={c.readAloud} set={(readAloud) => patch({ readAloud })} hint={tr("关掉：你自己对着麦克风说，控制台打的字只当字幕")} />
    </Section>}
    <TrackingPanel c={c} patch={patch} />
    <details className="advanced"><summary>{tr("动作与更多设置")}</summary>
    <Section title={tr("动作由什么驱动")}>
      <div className="driver-choices"><Seg value={c.driver} options={DRIVERS.map((d) => ({ id: d.kind, label: d.label, hint: d.hint, disabled: d.kind === 'network' && !motionSupported() }))} set={(driver) => patch({ driver })} /></div>
      {tracked && <>
        <Slider commit label={tr("面捕平滑")} value={c.smooth} min={0} max={1} step={0.05} show={(value) => value < 0.35 ? tr("灵敏") : value > 0.65 ? tr("稳") : tr("适中")} set={(smooth) => patch({ smooth })} />
        <Slider commit label={tr("随身体移动")} value={c.tuning.faceFollow} min={0} max={2} step={0.1} show={(value) => `${Math.round(value * 100)}%`} set={(faceFollow) => patch({ tuning: { ...c.tuning, faceFollow } })} />
        <label className="field"><span>{tr("面捕帧率")}</span><select value={c.tuning.faceFps} onChange={(event) => patch({ tuning: { ...c.tuning, faceFps: event.target.value === 'auto' ? 'auto' : +event.target.value as 15 | 30 } })}><option value="auto">{tr("自动")}</option><option value={15}>15 fps</option><option value={30}>30 fps</option></select></label>
        <button onClick={() => a?.calibrate()}><Crosshair size={14} />{tr("把现在的姿势设为正面")}</button>
      </>}
      {c.driver === 'network' && <>
        {c.lines !== 'me' && <NetworkPanel character={c} />}
      </>}
      {c.driver === 'gamepad' && <>
        {c.lines !== 'me' && <GamepadPanel character={c} />}
      </>}
      {c.driver === 'mic' && <Slider label={tr("麦克风灵敏度")} value={c.micGain} min={0.3} max={3} step={0.1} show={`${c.micGain.toFixed(1)}×`} set={(micGain) => patch({ micGain })} />}
    </Section>
    <Section title={tr("动作")}>
      {c.driver !== 'pointer' && <Switch label={tr("待机动作")} on={c.tuning.idle} set={(idle) => patch({ tuning: { ...c.tuning, idle } })} />}
      {talkMotion && <Switch label={tr("说话时轻跳")} on={c.tuning.bounce} set={(bounce) => patch({ tuning: { ...c.tuning, bounce } })} />}
      {!tracked && (c.driver === 'pointer' || c.tuning.idle) && <div className="field"><span>{tr("动作幅度")}</span><Seg value={c.motion} options={MOTIONS} set={(motion) => patch({ motion })} /></div>}
      {talkMotion && <Slider label={tr("说话时的动作")} value={c.talk} min={0} max={1.5} step={0.05} show={`${Math.round(c.talk * 100)}%`} set={(t) => patch({ talk: t })} />}
      {!tracked && c.driver !== 'pointer' && c.tuning.idle && <div className="field"><span>{tr("眼神")}</span><Seg value={c.gaze} options={GAZES} set={(gaze) => patch({ gaze })} /></div>}
    </Section>
    </details>
    {a?.status === 'ready' && <Section title={a.format === 'png' ? tr("动作") : tr("表情与动作")}>
      {a.format !== 'png' && <Slider label={tr("表情强度")} value={c.tuning.expressionStrength} min={0} max={1} step={.05} show={`${Math.round(c.tuning.expressionStrength * 100)}%`} set={(expressionStrength) => patch({ tuning: { ...c.tuning, expressionStrength } })} />}
      {a.format !== 'png' && <div className="chips">
        {a.player.expressions.map((x) => <button key={x.id} className={a.expression === x.id ? 'on' : ''} onClick={() => a.setExpression(x.id)}>{nameOf(x)}{keys.get(x.id) && <kbd>{keys.get(x.id)}</kbd>}</button>)}
        <button onClick={() => a.setExpression(null)}>{tr("恢复")}<kbd>0</kbd></button>
      </div>}
      <div className="chips">
        {([['nod', tr("点头")], ['shake', tr("摇头")], ['tilt', tr("歪头")], ['hop', tr("跳一下")], ['shy', tr("害羞")]] as const).map(([m, l]) =>
          <button key={m} onClick={() => a.player.act(m)}>{l}<kbd>{moveKey(m)}</kbd></button>)}
        <button className={a.away ? 'on' : ''} onClick={() => a.setAway(!a.away)}>{tr("暂离")}<kbd>B</kbd></button>
      </div>
      {keys.size > 0 && <details className="key-modes"><summary>{tr("数字键的触发方式")}</summary>
        {a.player.expressions.filter((x) => keys.has(x.id)).map((x) => {
          const m = modeOf(c, x.id), value = m.mode === 'timed' ? `timed:${m.secs ?? 3}` : m.mode
          return <label key={x.id} className="key-mode"><kbd>{keys.get(x.id)}</kbd><span>{nameOf(x)}</span>
            <select value={value} aria-label={tr("{0} 的触发方式", nameOf(x))} onChange={(e) => {
              const v = e.target.value, next = v.startsWith('timed') ? { mode: 'timed' as const, secs: Number(v.split(':')[1]) } : { mode: v as 'toggle' | 'hold' }
              patch({ exprModes: { ...c.exprModes, [x.id]: next } })
            }}>
              <option value="toggle">{tr("按一下开关")}</option><option value="hold">{tr("按住时显示")}</option><option value="timed:3">{tr("显示 {0} 秒", 3)}</option>
              {m.mode === 'timed' && m.secs !== 3 && <option value={value}>{tr("显示 {0} 秒", m.secs ?? 3)}</option>}
            </select>
          </label>
        })}
      </details>}
    </Section>}
  </>
}

function SubtitlePanel({ s, patch }: { s: SubtitleItem; patch: (p: Partial<SubtitleItem>) => void }) {
  const { scene } = useScene()
  const cs = scene.items.filter((i): i is CharacterItem => i.kind === 'character')
  return <Section title={tr("字幕")}>
    <label className="field"><span>{tr("谁说的话")}</span>
      <select value={s.of} onChange={(e) => patch({ of: e.target.value })}>
        <option value="all">{tr("所有人")}</option>
        {cs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
    <div className="field"><span>{tr("样式")}</span><Seg value={s.style} options={SUB_STYLES} set={(style) => patch({ style })} /></div>
    <Slider label={tr("字号")} value={s.size} min={18} max={96} show={String(s.size)} set={(size) => patch({ size })} />
    <Switch label={tr("显示名字")} on={s.showName} set={(showName) => patch({ showName })} />
    <Switch label={tr("逐字出现")} on={s.typewriter} set={(typewriter) => patch({ typewriter })} hint={tr("跟着说话的速度一个字一个字出来")} />
    <Slider label={tr("说完后停留")} value={s.linger} min={0.5} max={8} step={0.5} show={tr("{0} 秒", s.linger)} set={(linger) => patch({ linger })} />
  </Section>
}

function TextPanel({ t, patch }: { t: TextItem; patch: (p: Partial<TextItem>) => void }) {
  return <Section title={tr("文字")}>
    <label className="field"><span>{tr("内容（也可以在舞台上双击改）")}</span><textarea rows={2} value={t.text} onChange={(e) => patch({ text: e.target.value })} /></label>
    <Slider label={tr("字号")} value={t.size} min={16} max={160} show={String(t.size)} set={(size) => patch({ size })} />
    <div className="field"><span>{tr("颜色")}</span>
      <div className="row">
        {['#1f1d1a', '#ffffff', ...COLORS].map((col) => <button key={col} className={`swatch${t.color === col ? ' on' : ''}`} style={{ background: col }} aria-label={col} onClick={() => patch({ color: col })} />)}
      </div>
    </div>
    <div className="field"><span>{tr("底色")}</span>
      <div className="row">
        {['transparent', '#ffffff', '#1f1d1a', ...COLORS].map((col) => <button key={col} className={`swatch${t.bg === col ? ' on' : ''}${col === 'transparent' ? ' clear' : ''}`}
          style={col === 'transparent' ? {} : { background: col }} aria-label={col} onClick={() => patch({ bg: col })} />)}
      </div>
    </div>
  </Section>
}

const RATIOS = [
  { id: '16:9', label: '16:9', w: 1920, h: 1080 }, { id: '9:16', label: '9:16', w: 1080, h: 1920 },
  { id: '1:1', label: '1:1', w: 1440, h: 1440 }, { id: '4:3', label: '4:3', w: 1600, h: 1200 },
]
export const BACKGROUNDS: { c: string; t: string }[] = [
  { c: '#f7f4ef', t: '米白' }, { c: '#ffffff', t: '白' }, { c: '#e9f0f7', t: '浅蓝' }, { c: '#f6e9ee', t: '浅粉' },
  { c: 'linear-gradient(165deg, #fdf3f7 0%, #eef2fb 100%)', t: '粉蓝渐变' }, { c: 'linear-gradient(170deg, #fff8ea 0%, #fbeaf0 100%)', t: '暖橙渐变' },
  { c: 'linear-gradient(180deg, #e7f1ff 0%, #fbfdff 70%)', t: '晴空' }, { c: 'radial-gradient(circle at 50% 25%, #3a3157 0%, #15131c 70%)', t: '夜晚' },
  { c: '#1b1b20', t: '深色' }, { c: '#00b140', t: '绿幕' }, { c: 'transparent', t: '透明（给 OBS）' },
]

/** the panel folded: a small tab at the right edge, like the tools on the left, saying what the panel holds */
export function PanelTab({ onOpen }: { onOpen: () => void }) {
  const { scene, selected } = useScene(), item = scene.items.find((i) => i.id === selected)
  return <nav className="rail right" onPointerDown={(e) => e.stopPropagation()} aria-label={settingsLabel(item)}>
    <SidebarToggle side="right" folded label={settingsLabel(item)} onToggle={onOpen} />
  </nav>
}

function SceneSettings() {
  const { scene } = useScene()
  const pic = useRef<HTMLInputElement>(null), pictureScene = useRef<string | null>(null)
  const ratio = RATIOS.find((r) => r.w === scene.width && r.h === scene.height)?.id ?? '16:9'
  const [pictureError, setPictureError] = useState(''), background = usePicture(scene.backgroundAsset)
  const picture = async (f?: File) => {
    if (!f) return
    const id = pictureScene.current ?? scene.id
    try { const p = await pictureFile(f); store.setBackground(id, imageBackground(p.url), p.key); setPictureError('') }
    catch (error) { setPictureError((error as Error).message) }
  }

  return <>
    <header className="panel-head"><span>{tr("舞台设置")}</span></header>
    <Section title={tr("画面")}>
      <Seg value={ratio} options={RATIOS} set={(id) => {
        // everything scaled into the new shape, then the characters spread out for it (one undo step)
        const r = RATIOS.find((x) => x.id === id)!, items = reshape(scene.items, scene.width, scene.height, r.w, r.h)
        store.set({ width: r.w, height: r.h, items: arrange({ ...scene, width: r.w, height: r.h, items }) }, 'shape')
      }} />
      <div className="field spaced"><span>{tr("背景")}</span>
        <div className="row">
          {BACKGROUNDS.map((b) => <button key={b.c} className={`swatch${scene.background === b.c ? ' on' : ''}${b.c === 'transparent' ? ' clear' : ''}`}
            style={b.c === 'transparent' ? {} : { background: b.c }} title={b.t} aria-label={b.t} onClick={() => { store.set({ background: b.c, backgroundAsset: undefined }); setPictureError('') }} />)}
          <button className="swatch add" title={tr("用一张图片")} aria-label={tr("用一张图片")} onClick={() => { pictureScene.current = scene.id; pic.current?.click() }}><ImagePlus size={13} /></button>
          <input ref={pic} type="file" accept="image/*" hidden onChange={(e) => { picture(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </div>
      {(pictureError || background.error) && <p className="error" role="alert">{pictureError || background.error}</p>}
      <button className="wide" disabled={!characters(scene).length} onClick={() => store.set({ items: arrange(scene) }, 'arrange')}><LayoutGrid size={14} />{tr("自动排好角色")}</button>
      <Switch label={tr("安全区参考线")} on={scene.guides} set={(guides) => store.set({ guides })} hint={tr("标题安全区（90%）和动作安全区（93%）：字幕和角色别放到外面")} />
      {scene.height > scene.width
        ? <Switch label={tr("抖音 / TikTok 界面遮罩")} on={scene.mask} set={(mask) => store.set({ mask })} hint={tr("竖屏发到短视频平台时，顶栏、评论区和右侧按钮会盖住的地方")} />
        : <Switch label={tr("9:16 裁切框")} on={scene.crop} set={(crop) => store.set({ crop })} hint={tr("同一场再剪竖屏时，中间这一块会留下")} />}
    </Section>
    <Layers />
  </>
}

/** 对话设置, from the console: who speaks when, interrupting, the language, the pace, viewers' messages (the stage panel
 *  keeps the picture and the layers) */
export function TalkSettings({ onClose }: { onClose: () => void }) {
  const { scene } = useScene()
  const conv = useConversation()
  const t = scene.talk
  const cs = participants(scene).filter((c) => c.lines !== 'none')
  return (
    <div className="card popover talk-settings" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title">{tr("对话设置")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
    <Section title={tr("谁先说、谁接话")}>
      <Seg value={t.order} options={ORDERS} set={(o) => store.setTalk({ order: o, host: o === 'host' ? t.host ?? cs[0]?.id ?? null : t.host })} />
      {t.order === 'host' && <label className="field spaced"><span>{tr("主持人")}</span>
        <select value={t.host ?? ''} onChange={(e) => store.setTalk({ host: e.target.value || null })}>
          {cs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>}
      <div className="field spaced"><span>{tr("AI 抢话")}</span>
        <Seg value={t.interrupt} options={[{ id: 0, label: tr("不抢") }, { id: 1, label: tr("偶尔") }, { id: 2, label: tr("经常") }] as const} set={(interrupt) => store.setTalk({ interrupt })} />
      </div>
      <div className="field"><span>{tr("你在控制台说话时")}</span>
        <Seg value={t.cutIn ? 'cut' : 'wait'} options={[{ id: 'wait', label: tr("等这句说完") }, { id: 'cut', label: tr("立刻打断") }] as const} set={(v) => store.setTalk({ cutIn: v === 'cut' })} />
      </div>
      <label className="field"><span>{tr("说什么语言")}</span>
        <select value={t.language} onChange={(e) => store.setTalk({ language: e.target.value as typeof t.language })}>
          <option value="auto">{tr("跟话题一样")}</option><option value="zh">{tr("中文")}</option><option value="en">English</option><option value="ja">{tr("日本語")}</option>
        </select>
      </label>
    </Section>
    <Section title={tr("节奏")}>
      <Slider label={tr("一轮最多几句（AI）")} value={conv.limit} min={2} max={60} show={String(conv.limit)} set={talk.setLimit} />
      <Slider label={tr("句子之间停多久")} value={conv.gap} min={0} max={3} step={0.1} show={tr("{0} 秒", conv.gap.toFixed(1))} set={talk.setGap} />
    </Section>
    <AudiencePanel preferences />
    </div>
  )
}

const KIND_ICON = { character: UserRound, subtitle: Captions, text: Type, image: ImageIcon }

const itemName = (i: Item, all: Item[]) =>
  i.kind === 'character' ? i.name : i.kind === 'text' ? i.text.slice(0, 16) : i.kind === 'image' ? i.name
    : i.of === 'all' ? tr("所有人的字幕") : tr("{0} 的字幕", (all.find((c) => c.id === i.of) as CharacterItem | undefined)?.name ?? '')

/** everything on the stage, the front first: click to select; show / hide and lock on each row */
function Layers() {
  const { scene, selected } = useScene()
  const items = [...scene.items].reverse()
  return <Section title={tr("图层（{0}）", items.length)}>
    {!items.length && <p className="muted">{tr("还没有东西")}</p>}
    <div className="layers">
      {items.map((i) => {
        const Icon = KIND_ICON[i.kind]
        return (
          <div key={i.id} className={`layer${selected === i.id ? ' on' : ''}${i.hidden ? ' off' : ''}`} onClick={() => store.select(i.id)}>
            {i.kind === 'character' ? <i className="dot" style={{ background: i.color }} /> : <Icon size={15} />}
            <span className="nm">{itemName(i, scene.items)}</span>
            <button className={`icon${i.locked ? ' keep' : ''}`} title={i.locked ? tr("解锁") : tr("锁定")} onClick={(e) => { e.stopPropagation(); store.patch(i.id, { locked: !i.locked }) }}>
              {i.locked ? <Lock size={14} /> : <LockOpen size={14} />}
            </button>
            <button className={`icon${i.hidden ? ' keep' : ''}`} title={i.hidden ? tr("显示") : tr("隐藏")} onClick={(e) => { e.stopPropagation(); store.patch(i.id, { hidden: !i.hidden }) }}>
              {i.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )
      })}
    </div>
  </Section>
}
