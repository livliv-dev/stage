// LivLiv Stage. Edit mode: the top bar (name, edit / show, undo, templates, files, AI), the tools on the left (add
// things), the panel on the right (the selected item; with nothing selected, the stage and its layers), at the bottom
// the cast (who is in the conversation, and in what state) over the console (topic, run, your line). ⌘\ folds the
// right panel away. Show mode: only the stage; moving the mouse brings back a small control bar for a moment.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Bot, Captions, Check, ChevronDown, CircleHelp, CircleAlert, ExternalLink, FolderOpen, Image as ImageIcon, LayoutTemplate, LoaderCircle, Lock, MessagesSquare, Mic,
  FileBox, Plus, RefreshCw, SlidersHorizontal, Volume2, VolumeX,
  MonitorPlay, Pencil, Pause, Play, Redo2, RotateCcw, Save, Send, SkipForward, Square, StepForward, Settings, Sparkles, Type, Undo2, UserPlus, X,
} from 'lucide-react'
import { brainReady, listModels, playDemo, previousModelConfig, providerOf, PROVIDERS, PROVIDERS_HERE, saveBrainConfig, savedBrain, testModel, useBrainConfig, type ModelConfig } from './brain'
import { conversation, talk, useConversation } from './conversation'
import { Panel, PanelTab, TalkSettings } from './Inspector'
import { byId, fromFiles, fromKept, fromPngs, mine as accountCharacters, samples, type Pick } from './library'
import { PNG_SLOTS, type PngSlot } from './bodies/png'
import { forget, kept, type Kept } from './vault'
import { bubbleFor, captionBar, characters, hadSaved, participants, newCharacter, store, uid, useScene } from './scene'
import { Stage, type Insets, type MenuAt, type Zoom } from './Stage'
import { outputOpen } from './link'
import { OutputPanel } from './OutputPanel'
import { LivePanel } from './LivePanel'
import { HotkeysPanel } from './HotkeysPanel'
import { CollabPanel } from './CollabPanel'
import { useRoom } from './collab/session'
import { connectDesktop, desktop } from './desktop'
import { ROOM, useCrowded } from './contexts'
import { ageGate, checkConnect, connect, refresh, setAge, useAccount } from './livliv'
import { rec, takeLimit, useRecording } from './recording'
import { cancel as pttCancel, clearError as pttClear, holdKey, press as pttPress, release as pttRelease, usePtt } from './ptt'
import { asrReady, listVoices, saveSpeech, SPEECH_HERE, SPEECH_OFF, SPEECH_PROVIDERS, SPEECH_UNSET, speakApi, speechOfModel, speechProviderOf, speechReady, useActiveSpeech, transcribeApi, useSpeech, voiceRoute, type SpeechApi } from './voiceApi'
import { wav16k } from './audio'
import { buildTemplate, TEMPLATES, type TemplateId } from './templates'
import { demoFor } from './demo'
import { controlSettings } from './workflow'
import { actors, onActors } from './actors'
import { imageGeometry, moveImage } from './attachments'
import { propSource } from './propGeometry'
import { AccountPanel } from './AccountPanel'
import { AudiencePopover } from './AudiencePanel'
import { connectNetworkTracking } from './networkTracking'
import { connectAudienceActions } from './audienceControl'
import { pictureFile } from './assets'
import { downloadProject, openProject, projectFile } from './project'
import { MixerPanel } from './MixerPanel'
import { ScenesMenu } from './ScenesMenu'
import { GeneralPanel } from './GeneralPanel'
import { SidebarToggle } from './SidebarToggle'
import { tr, getLocale, useLocale } from './i18n'
import { onSite, small } from './host'
import { linkedAs, linkedId, openLinked } from './entry'
import { PhoneIntro, SiteWelcome } from './SiteIntro'
import { connectLiveKeys, liveCharacter } from './live'
import { connectOutputFeed } from './outputFeed'
import { GoLiveGuide } from './GoLive'

type SettingsTab = 'general' | 'ai' | 'hotkeys' | 'account'

type Pop = null | 'add' | 'settings' | 'templates' | 'help' | 'record' | 'model' | 'talk' | 'output' | 'live' | 'collab' | 'scenes' | 'mixer' | 'audience'

const COACHED = 'livliv-stage:coached', FOLDED = 'livliv-stage:panel-folded'
/** the source (the public repository's address: set when it is published) */
const coached = () => { try { return !!localStorage.getItem(COACHED) } catch { return true } }

/** the demo's three on the stage (as they stand in it), unless they already are */
let building: Promise<void> | null = null
function ensureTrio() {
  const current = characters(store.get()).filter((item) => !item.hidden)
  if (current.length === 3 && !current.some((item) => item.remote) && demoFor(current)?.script.template === 'trio') return Promise.resolve()
  return building ??= buildTemplate('trio').then((next) => {
    next.name = tr('三人对谈演示')
    pttCancel(); talk.clear(); store.replace(next); store.select(characters(next)[0]?.id ?? null)
  }).finally(() => { building = null })
}

async function beginDemo(done?: () => void) {
  await ensureTrio()
  const demo = demoFor(characters(store.get()))!
  const cast = new Set(Object.values(demo.who).map((item) => item.id))
  store.set({ topic: demo.script.topic, items: store.get().items.map((item) => item.kind === 'subtitle' ? { ...item, showName: true, typewriter: false, linger: .8, size: 32 } : item.kind === 'character' && cast.has(item.id) ? { ...item, ...controlSettings('ai'), muted: false } : item) }); store.select(null)
  pttCancel(); talk.clear(); playDemo(true); done?.(); talk.start()
}

export default function App() {
  useLocale()
  const { mode, scene } = useScene()
  const hasAI = participants(scene).some((c) => c.lines === 'ai')
  const [pop, setPop] = useState<Pop>(null)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  const [leftFolded, setLeftFolded] = useState(() => { try { const saved = localStorage.getItem('livliv-stage:left-folded'); return saved !== null ? saved === '1' : localStorage.getItem('livliv-stage:tools-folded') === '1' && localStorage.getItem('livliv-stage:cast-folded') === '1' } catch { return false } })
  const foldLeft = () => setLeftFolded((value) => { const next = !value; try { localStorage.setItem('livliv-stage:left-folded', next ? '1' : '') } catch { /* The preference still applies to this window. */ } return next })
  // the right panel folded to a tab (⌘\), remembered
  const [bare, setBareNow] = useState(() => { try { return localStorage.getItem(FOLDED) === '1' } catch { return false } })
  const setBare = (b: boolean | ((b: boolean) => boolean)) => setBareNow((x) => {
    const v = typeof b === 'function' ? b(x) : b
    try { localStorage.setItem(FOLDED, v ? '1' : '') } catch { /* private mode */ }
    return v
  })
  const [zoom, setZoom] = useState<Zoom>('fit')
  const [log, setLog] = useState(false)
  const [menu, setMenu] = useState<MenuAt | null>(null)
  const [note, setNote] = useState('')
  const [coach, setCoach] = useState(() => !coached())
  // livliv.ai/stage: a phone gets the demo to watch; a computer's first visit gets the demo's three on the stage and a
  // welcome with the ways in (none for a link to a character, which opens that one instead)
  const phone = onSite && small()
  const [welcome, setWelcome] = useState(() => onSite && !phone && !hadSaved && !linkedId())
  // the site's 开播 (?c=<id>&as=face): its card, where the first-visit checklist goes
  const [goLive, setGoLive] = useState<string | null>(null)
  const toggle = (p: Pop) => { if (p === 'settings') setSettingsTab('general'); setPop((x) => (x === p ? null : p)) }
  const openSettings = () => { setSettingsTab('general'); setPop('settings') }
  useEffect(() => { void refresh() }, [])  // the LivLiv account, if one is connected
  // LivLiv's points AI asks the site's age question once (livliv.ts stageLine): answered here
  const [ageAsk, setAgeAsk] = useState<((adult: boolean) => void) | null>(null)
  useEffect(() => { ageGate.ask = () => new Promise<boolean>((resolve) => setAgeAsk(() => resolve)); return () => { ageGate.ask = null } }, [])
  const answerAge = async (adult: boolean) => {
    try { await setAge(adult) } catch { /* the line that asked says what went wrong */ }
    ageAsk?.(adult); setAgeAsk(null)
  }
  useEffect(() => {
    if (onSite && (phone || (!hadSaved && !linkedId()))) void ensureTrio().then(() => { store.select(null); if (phone) store.setMode('show') }, () => {})
    const id = linkedId(), as = linkedAs()
    if (id && !phone) void openLinked(id, as).then(({ note, character }) => {
      if (note) say(note)
      if (character && as === 'face') { setGoLive(character); setLeftFolded(false) }
      if (character && as === 'ai') setPop('live')
    })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  // on the site, signing in or out happens on its own pages, maybe in another tab: asked again when this one is back
  useEffect(() => { if (!onSite) return; const again = () => void refresh(); addEventListener('focus', again); return () => removeEventListener('focus', again) }, [])
  useEffect(() => { if (phone && mode !== 'show') store.setMode('show') }, [phone, mode])
  useEffect(connectDesktop, [])
  useEffect(connectAudienceActions, [])
  useEffect(connectNetworkTracking, [])
  useEffect(() => holdKey(), [])  // push to talk: hold `
  useEffect(connectLiveKeys, [])  // 1-9 0 Q W E R T B (live.ts)
  useEffect(connectOutputFeed, [])
  // an AI turn came with no model set up: the model card opens over the console, its button starts the conversation
  const conv = useConversation()
  const [forStart, setForStart] = useState(false)
  useEffect(() => {
    if (!conv.needModel) return
    talk.modelAsked(); store.setMode('edit'); setForStart(true); setPop('model')
  }, [conv.needModel])
  const say = (s: string) => { setNote(s); window.setTimeout(() => setNote((n) => (n === s ? '' : n)), 3200) }
  useShortcuts({
    escape: () => { if (menu) setMenu(null); else if (pop) setPop(null); else if (welcome) setWelcome(false); else if (store.selected()) store.select(null); else if (store.mode() === 'show' && !phone) store.setMode('edit') },
    help: () => toggle('help'),
    zoom: setZoom,
    bare: () => setBare((b) => !b),
  })
  const show = mode === 'show'
  // the stage's room: the same whatever is open (only ⌘\ changes it)
  // a phone: the stage above the intro card at the bottom
  const insets: Insets = show ? (phone ? { top: 12, right: 8, bottom: 360, left: 8 } : { top: 0, right: 0, bottom: 0, left: 0 }) : { top: 56, right: bare ? 80 : 312, bottom: hasAI ? 124 : 76, left: leftFolded ? 80 : 220 }
  const template = async (id: TemplateId) => {
    setPop(null)
    // no question first: it can be undone, and the note says how
    try {
      const had = store.get().items.length > 0
      pttCancel(); talk.clear(); playDemo(false); store.replace(await buildTemplate(id)); store.select(characters(store.get())[0]?.id ?? null)  // a new scene starts a new conversation
      if (had) say(tr("已换成「{0}」，⌘Z 可以换回来", tr(TEMPLATES.find((t) => t.id === id)!.label)))
    } catch (e) { say((e as Error).message) }
  }
  return (
    <div className={`app ${mode}${bare ? ' panels-folded' : ''}${hasAI ? '' : ' solo-mode'}${leftFolded ? ' tools-folded' : ''}`} onPointerDown={() => setMenu(null)}>
      <Stage insets={insets} onMenu={setMenu} zoom={zoom} setZoom={setZoom} empty={<Empty onTemplate={template} onAdd={() => setPop('add')} />} />
      {show ? (phone ? <PhoneIntro onDemo={() => beginDemo()} /> : <ShowControls />) : <>
        <TopBar pop={pop} toggle={toggle} onTemplate={template} say={say} />
        <CrowdNotice insets={insets} />
        <Rail pop={pop} toggle={toggle} folded={leftFolded} onFold={foldLeft} />
        {bare ? <PanelTab onOpen={() => setBare(false)} /> : <Panel onFold={() => setBare(true)} />}
        {welcome && !pop && <SiteWelcome onClose={() => setWelcome(false)}
          onDemo={async () => { await beginDemo(); setWelcome(false) }}
          onCamera={() => { setWelcome(false); void template('solo') }}
          onModel={() => { setWelcome(false); setForStart(false); setPop('model') }}
          onCharacter={() => { setWelcome(false); setPop('add') }} />}
        {!leftFolded && <Cast guide={goLive ? <GoLiveGuide id={goLive} onClose={() => setGoLive(null)} /> : coach && !welcome && !pop && scene.items.length > 0 ? <Checklist
          done={() => { setCoach(false); try { localStorage.setItem(COACHED, '1') } catch { /* private mode */ } }}
          onModel={() => { setForStart(false); setPop('model') }} onVoice={() => { setSettingsTab('ai'); setPop('settings') }}
          onCharacter={() => { setBare(false); store.select(characters(store.get())[0]?.id ?? null) }} onOutput={() => setPop('output')} /> : null} />}
        <TalkBar log={log} setLog={setLog} model={pop === 'model'} toggleModel={() => { setForStart(false); toggle('model') }}
          rules={pop === 'talk'} toggleRules={() => toggle('talk')} onLive={() => toggle('live')} />
        {pop === 'audience' && <AudiencePopover onClose={() => setPop(null)} />}
        {pop === 'mixer' && <MixerPanel onClose={() => setPop(null)} onSettings={() => { setSettingsTab('ai'); setPop('settings') }} />}
        {pop === 'collab' && <CollabPanel onClose={() => setPop(null)} onSettings={openSettings} />}
        {pop === 'live' && <LivePanel onClose={() => setPop(null)} onSettings={openSettings} />}
        {pop === 'talk' && <TalkSettings onClose={() => setPop(null)} />}
        {pop === 'model' && <ModelCard forStart={forStart} onClose={() => setPop(null)} />}
        {log && <Transcript onClose={() => setLog(false)} right={bare ? 80 : 324} />}
        {pop === 'add' && <AddCharacter left={228} onClose={() => setPop(null)} onSignIn={() => { setSettingsTab('account'); setPop('settings') }} />}
        {pop === 'settings' && <><div className="scrim" onPointerDown={() => setPop(null)} /><SettingsCard initialTab={settingsTab} onAdd={() => setPop('add')} onClose={() => { setSettingsTab('general'); setPop(null) }} /></>}
        {pop === 'record' && <RecordCard onClose={() => setPop(null)} onVoices={() => { setSettingsTab('ai'); setPop('settings') }} />}
        <OutputPanel open={pop === 'output'} onClose={() => setPop(null)} />
        {pop === 'help' && <Help onClose={() => setPop(null)} />}
        {menu && <ContextMenu at={menu} close={() => setMenu(null)} />}

      </>}
      {ageAsk && <AgeDialog onAnswer={(adult) => void answerAge(adult)} />}
      {note && <div className="toast">{note}</div>}
    </div>
  )
}

type Keys = { escape: () => void; help: () => void; zoom: (z: Zoom | ((z: Zoom) => Zoom)) => void; bare: () => void }

/** keys while not typing: ⌘Z / ⇧⌘Z undo / redo, ⌘D copy, Delete, arrows move (⇧: by 10), ⇧1 fit, ⇧0 100%, ⌘\
 *  panels, Space start / pause, Esc, ? the list */
function useShortcuts(keys: Keys) {
  const k0 = useRef(keys)
  k0.current = keys
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      // any open card closes on Esc first, also while typing in it
      if (e.key === 'Escape') {
        const x = document.querySelector<HTMLButtonElement>('.popover button[data-close], .card.transcript button[data-close]')
        if (x) { x.click(); return }
      }
      if (t.closest('input, textarea, select, [contenteditable="true"]') || (e.key === ' ' && t.closest('button'))) return
      const K = k0.current, mod = e.metaKey || e.ctrlKey, id = store.selected(), k = e.key.toLowerCase()
      if (e.key === 'Escape') { K.escape(); return }
      if (e.key === '?') { K.help(); return }
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return }
      if (mod && k === 'y') { e.preventDefault(); store.redo(); return }
      if (mod && e.key === '\\') { e.preventDefault(); K.bare(); return }
      if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); K.zoom('fit'); return }
      if (e.shiftKey && e.code === 'Digit0') { e.preventDefault(); K.zoom(1); return }
      if (e.code === 'Space' && !t.closest('button')) {
        e.preventDefault()
        const c = conversation()
        if (!characters(store.get()).some((x) => x.lines === 'ai')) actors.forEach((a) => { if (a.item.lines === 'me') a.calibrate() }); else if (!c.running) talk.start(); else if (c.paused) talk.resume(); else talk.pause()
        return
      }
      if (!id || store.mode() !== 'edit') return
      if (mod && k === 'd') { e.preventDefault(); store.duplicate(id); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); store.remove(id); return }
      if (store.get().items.find((i) => i.id === id)?.locked) return
      const step = e.shiftKey ? 10 : 1
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
      const it = store.get().items.find((i) => i.id === id)
      if (d && it) { e.preventDefault(); store.patch(id, it.kind === 'image' ? moveImage(it, imageGeometry(it, store.get(), propSource), d[0], d[1]) : { x: it.x + d[0], y: it.y + d[1] }) }
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [])
}

// ---------------------------------------------------------------- top

function TopBar({ pop, toggle, onTemplate, say }: { pop: Pop; toggle: (p: Pop) => void; onTemplate: (id: TemplateId) => void; say: (s: string) => void }) {
  const { scene, canUndo, canRedo } = useScene()
  const collab = useRoom()
  const file = useRef<HTMLInputElement>(null)
  const [io, setIO] = useState<'save' | 'open' | null>(null), [progress, setProgress] = useState(0)
  const task = useRef<AbortController | null>(null)
  useEffect(() => () => task.current?.abort(), [])
  const save = async () => {
    if (task.current) return
    const ctrl = new AbortController(); task.current = ctrl; setIO('save'); setProgress(0)
    try { const blob = await projectFile(store.project(), ctrl.signal, setProgress); ctrl.signal.throwIfAborted(); downloadProject(blob, scene.name) }
    catch (error) { if (!ctrl.signal.aborted) say((error as Error).message) }
    finally { if (task.current === ctrl) { task.current = null; setIO(null) } }
  }
  const open = async (file?: File) => {
    if (!file || task.current) return
    const ctrl = new AbortController(); task.current = ctrl; setIO('open')
    try {
      const { project, missing, dropped } = await openProject(file, ctrl.signal)
      ctrl.signal.throwIfAborted(); pttCancel(); talk.clear(); playDemo(false); store.replaceProject(project)
      const notes = [missing ? tr("有 {0} 个从文件导入的角色这台电脑上没有，要重新导入", missing) : '', dropped ? tr("{0} 张图片的地址不受支持，已跳过", dropped) : '']
      if (missing || dropped) say(notes.filter(Boolean).join(' '))
    } catch (error) { if (!ctrl.signal.aborted) say((error as Error).message) }
    finally { if (task.current === ctrl) { task.current = null; setIO(null) } }
  }
  return (
    <header className="topbar" onPointerDown={(e) => e.stopPropagation()}>
      <div className="left">
        <img className="mark" src={`${import.meta.env.BASE_URL}wordmark.svg`} alt="LivLiv Stage" />
        <div className="menu-anchor scene-switcher"><input className="name" value={scene.name} aria-label={tr("舞台名字")} onChange={(e) => store.set({ name: e.target.value })} /><button className={pop === "scenes" ? "icon on" : "icon"} title={tr("切换镜头")} aria-expanded={pop === "scenes"} onClick={() => toggle("scenes")}><ChevronDown size={15} /></button>{pop === "scenes" && <ScenesMenu close={() => toggle(null)} />}</div>
      </div>
      <div className="seg mode">
        <button className="on" title={tr("编辑")} aria-label={tr("编辑")}><Pencil size={13} /><span className="mode-label">{tr("编辑")}</span></button>
        <button onClick={() => store.setMode('show')} title={tr("只留画面（Esc 回来）")} aria-label={tr("预览")}><Play size={13} /><span className="mode-label">{tr("预览")}</span></button>
      </div>
      <div className="right">
        <button className="icon" title={tr("撤销（⌘Z）")} disabled={!canUndo} onClick={store.undo}><Undo2 size={16} /></button>
        <button className="icon" title={tr("重做（⇧⌘Z）")} disabled={!canRedo} onClick={store.redo}><Redo2 size={16} /></button>
        <span className="sep" />
        <div className="menu-anchor">
          <button className={pop === 'templates' ? 'on' : ''} onClick={() => toggle('templates')}><LayoutTemplate size={15} />{tr("模板")}<ChevronDown size={13} /></button>
          {pop === 'templates' && (
            <div className="card dropdown">
              {TEMPLATES.map((t) => <button key={t.id} className="item" onClick={() => onTemplate(t.id)}><b>{tr(t.label ?? '')}</b><span>{tr(t.hint ?? '')}</span></button>)}
            </div>
          )}
        </div>
        {!onSite && <button className={pop === 'collab' ? 'on collab-button' : 'collab-button'} onClick={() => toggle('collab')}><UserPlus size={15} />{tr("联播")}{collab.phase === 'on' && <i className="live-dot on" />}{collab.pending.length > 0 && <span className="room-count">{collab.pending.length}</span>}</button>}
        <button className={pop === 'audience' ? 'icon on' : 'icon'} title={tr('观众弹幕')} onClick={() => toggle('audience')}><MessagesSquare size={16} /></button>
        <button className={pop === 'mixer' ? 'icon on' : 'icon'} title={tr('调音台')} onClick={() => toggle('mixer')}><Volume2 size={16} /></button>
        <RecordButton on={pop === 'record'} toggle={() => toggle('record')} />
        <button className="primary output-button" onClick={() => toggle('output')}><MonitorPlay size={15} />{tr("输出到 OBS")}</button>
        <span className="sep" />
        <button className="icon" title={tr("打开项目")} disabled={!!io} onClick={() => file.current?.click()}><FolderOpen size={16} /></button>
        <button className="icon" title={tr("保存项目")} disabled={!!io} onClick={() => void save()}><Save size={16} /></button>
        <input ref={file} type="file" accept=".livstage,.json,.zip" hidden onChange={(e) => { void open(e.target.files?.[0]); e.target.value = '' }} />
        <button className={`icon${pop === 'settings' ? ' on' : ''}`} title={tr("设置")} onClick={() => toggle('settings')}><Settings size={16} /></button>
        <button className={`icon${pop === 'help' ? ' on' : ''}`} title={tr("快捷键（?）")} onClick={() => toggle('help')}><CircleHelp size={16} /></button>
      </div>
      {io && createPortal(<div className="project-progress" role="dialog" aria-modal="true" onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); task.current?.abort() } if (event.key === 'Tab') { event.preventDefault(); event.currentTarget.querySelector('button')?.focus() } }} aria-label={tr(io === 'open' ? '正在打开项目…' : '正在保存项目…')}>
        <div className="card"><LoaderCircle className="spin" size={22} /><b>{tr(io === 'open' ? '正在打开项目…' : '正在保存项目…')}</b>{io === 'save' && <progress value={progress} max={1} />}<button autoFocus onClick={() => task.current?.abort()}>{tr('取消')}</button></div>
      </div>, document.body)}
    </header>
  )
}

// ---------------------------------------------------------------- left: add things

function Rail({ pop, toggle, folded, onFold }: { pop: Pop; toggle: (p: Pop) => void; folded: boolean; onFold: () => void }) {
  const picture = useRef<HTMLInputElement>(null), pictureScene = useRef<string | null>(null)
  const [pictureError, setPictureError] = useState('')
  const addText = () => store.add({ id: uid(), kind: 'text', text: tr("双击改文字"), size: 72, color: '#1f1d1a', bg: 'transparent', x: 120, y: 80, w: 720, h: 130 })
  const addPicture = async (f?: File) => {
    if (!f) return
    setPictureError('')
    const sceneId = pictureScene.current ?? store.get().id
    try {
      const picture = await pictureFile(f), scene = store.project().scenes.find((s) => s.id === sceneId)
      if (!scene) throw new Error(tr('镜头已删除，请重新添加图片'))
      const w = Math.min(picture.w, scene.width * .4), h = w * picture.h / picture.w
      store.addImage(sceneId, { id: uid(), kind: 'image', asset: picture.key, url: picture.url, name: f.name, x: Math.round((scene.width - w) / 2), y: Math.round((scene.height - h) / 2), w: Math.round(w), h: Math.round(h) })
    } catch (error) { setPictureError((error as Error).message) }
  }
  const tools = [
    { label: tr("角色"), icon: <UserPlus size={20} />, on: pop === 'add', act: () => toggle('add') },
    { label: tr("字幕"), icon: <Captions size={20} />, act: () => store.add(captionBar(store.get())) },
    { label: tr("文字"), icon: <Type size={20} />, act: addText },
    { label: tr("图片"), icon: <ImageIcon size={20} />, act: () => { pictureScene.current = store.get().id; picture.current?.click() } },
  ]
  return (
    <nav className="rail" onPointerDown={(e) => e.stopPropagation()} aria-label={tr("添加")}>
      {!folded && tools.map((t) => <button key={t.label} className={`tool${t.on ? ' on' : ''}`} onClick={t.act}>{t.icon}<span>{t.label}</span></button>)}
      <SidebarToggle side="left" folded={folded} label={tr('舞台内容')} onToggle={onFold} />
      {pictureError && <button className='rail-error' onClick={() => setPictureError('')}>{pictureError}<X size={12} /></button>}
      <input ref={picture} type="file" accept="image/*" hidden onChange={(e) => { addPicture(e.target.files?.[0]); e.target.value = '' }} />
    </nav>
  )
}

/** places a character, with its own speech bubble */
function place(p: Pick) {
  const c = newCharacter(store.get(), p.name, p.model, p.persona, undefined, p.card)
  store.add(c, bubbleFor(c))
}

function AddCharacter({ left, onClose, onSignIn }: { left: number; onClose: () => void; onSignIn: () => void }) {
  const list = samples()
  const account = useAccount(), signed = account.status === 'in', closed = account.closed  // a character by its id comes from LivLiv: an account's
  const [err, setErr] = useState('')
  const [id, setId] = useState('')
  const [mine, setMine] = useState<Kept[]>([])
  useEffect(() => { void checkConnect() }, [])
  const [png, setPng] = useState(false)
  const folder = useRef<HTMLInputElement>(null), file = useRef<HTMLInputElement>(null)
  useEffect(() => { void kept().then(setMine) }, [])
  // on livliv.ai/stage, signed in: the account's own characters, to pick instead of typing an id
  const [own, setOwn] = useState<Pick[] | null>(null)
  useEffect(() => { if (onSite && signed) void accountCharacters().then(setOwn, (e: Error) => setErr(e.message)) }, [signed])
  const take = (p: Pick) => { place(p); onClose() }
  const files = async (f: FileList | File[] | null) => {
    if (!f?.length) return
    try { take(await fromFiles(f)) } catch (e) { setErr((e as Error).message) }
  }
  // a model package's zip or a .vrm dropped on the card
  const drop = (e: React.DragEvent) => {
    const f = [...e.dataTransfer.files].filter((x) => /\.(livliv|zip|vrm)$/i.test(x.name))
    if (!f.length) return
    e.preventDefault()
    void files(f.slice(0, 1))
  }
  return (
    <div className="card popover add" style={{ left }} onPointerDown={(e) => e.stopPropagation()}
      onDragOver={(e) => { if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) e.preventDefault() }} onDrop={drop}>
      <header><span className="title">{tr("放一个角色")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <p className="label first">{tr("导入")}</p>
      <div className="row imports">
        <button title={tr("LivLiv 模型包（文件夹）")} onClick={() => folder.current?.click()}><FolderOpen size={15} />{tr("模型文件夹")}</button>
        <button title={tr("LivLiv 模型包（.livliv 或 zip），或 VRM（VRoid 等）")} onClick={() => file.current?.click()}><FileBox size={15} />.livliv / VRM</button>
        <button className={png ? 'on' : ''} aria-expanded={png} onClick={() => setPng((v) => !v)}><ImageIcon size={15} />{tr("PNG 立绘")}</button>
        <input ref={folder} type="file" hidden {...{ webkitdirectory: '' }} onChange={(e) => { void files(e.target.files); e.target.value = '' }} />
        <input ref={file} type="file" accept=".livliv,.zip,.vrm" hidden onChange={(e) => { void files(e.target.files); e.target.value = '' }} />
      </div>
      {png && <PngForm onDone={take} onError={setErr} />}
      <p className="label">{tr("精选角色")}</p>
      <div className="grid">
        {list.map((p) => (
          <button key={p.id} className="pick" title={p.card?.tagline ?? p.persona} onClick={() => take(p)}>
            {p.thumb && <img src={p.thumb} alt="" />}<span>{p.label ?? p.name}</span>
          </button>
        ))}
      </div>
      {mine.length > 0 && <>
        <p className="label">{tr("本机导入过的")}</p>
        <div className="kept">
          {mine.map((k) => (
            <div key={k.key} className="kept-row">
              <button className="link" onClick={() => take(fromKept(k))}>
                {k.name}{k.format && k.format !== 'livliv' && <i className="fmt">{k.format === 'vrm' ? 'VRM' : tr("立绘")}</i>}
              </button>
              <span>{new Date(k.at).toLocaleDateString(getLocale())}</span>
              <button className="icon" title={tr("从这台电脑上删掉（用到它的角色会显示要重新导入）")}
                onClick={() => { void forget(k.key).then(() => setMine((m) => m.filter((x) => x.key !== k.key))) }}><X size={13} /></button>
            </div>
          ))}
        </div>
      </>}
      {own && own.length > 0 && <>
        <p className="label">{tr("你在 livliv.ai 的角色")}</p>
        <div className="grid">
          {own.map((p) => <button key={p.id} className="pick" title={p.persona} onClick={() => take(p)}>{p.thumb && <img src={p.thumb} alt="" />}<span>{p.name}</span></button>)}
        </div>
      </>}
      <p className="label split">{tr("从 livliv.ai 增加")}{account.status === 'out' && (closed ? <span>{tr("帐号登录暂未开放")}</span> : <button className="link" onClick={onSignIn}>{tr("登录 livliv.ai")}</button>)}</p>
      <div className="row">
        <input value={id} disabled={!signed} placeholder={tr("角色 ID，网址里 /c/ 后面那段")} onChange={(e) => setId(e.target.value)} />
        <button disabled={!signed || !id.trim()} onClick={async () => { try { take(await byId(id.trim())) } catch (e) { setErr((e as Error).message) } }}>{tr("放上来")}</button>
      </div>
      {err && <p className="err">{tr(err)}</p>}
    </div>
  )
}

/** a PNGTuber from its pictures: one per slot (closed and open needed), picked or dropped on the slot */
function PngForm({ onDone, onError }: { onDone: (p: Pick) => void; onError: (m: string) => void }) {
  const [pics, setPics] = useState<Partial<Record<PngSlot, File>>>({})
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const urls = useRef(new Map<File, string>()), box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    return () => { for (const u of urls.current.values()) URL.revokeObjectURL(u) }
  }, [])
  const url = (f: File) => { let u = urls.current.get(f); if (!u) urls.current.set(f, (u = URL.createObjectURL(f))); return u }
  const put = (slot: PngSlot, f: File | undefined) => {
    if (!f || !f.type.startsWith('image/')) return
    setPics((p) => ({ ...p, [slot]: f }))
    if (!name && slot === 'closed') setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_ ]*(closed|idle|闭嘴)$/i, ''))
  }
  const ready = !!pics.closed && !!pics.open && !!name.trim()
  const go = async () => {
    setBusy(true)
    try { onDone(await fromPngs(pics, name.trim())) } catch (e) { onError((e as Error).message) } finally { setBusy(false) }
  }
  return <div className="png-form" ref={box}>
    <div className="slots">
      {PNG_SLOTS.map((s) => {
        const f = pics[s.id]
        return <label key={s.id} className={`slot${s.need ? ' need' : ''}${f ? ' set' : ''}`}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); put(s.id, e.dataTransfer.files[0]) }}>
          {f ? <img src={url(f)} alt="" /> : <Plus size={18} />}
          <span>{tr(s.label ?? '')}</span>
          <input type="file" accept="image/png,image/webp,image/gif" hidden onChange={(e) => { put(s.id, e.target.files?.[0]); e.target.value = '' }} />
          {f && !s.need && <button className="icon clear" aria-label={tr("去掉{0}", s.label)} onClick={(e) => { e.preventDefault(); setPics((p) => ({ ...p, [s.id]: undefined })) }}><X size={12} /></button>}
        </label>
      })}
    </div>
    <div className="row">
      <input value={name} placeholder={tr("名字")} onChange={(e) => setName(e.target.value)} />
      <button className="primary" disabled={!ready || busy} onClick={go}>{tr("放上来")}</button>
    </div>
  </div>
}

function Empty({ onTemplate, onAdd }: { onTemplate: (id: TemplateId) => void; onAdd: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const demo = async () => { setBusy(true); setError(''); try { await beginDemo() } catch (error) { setError((error as Error).message) } finally { setBusy(false) } }
  return <div className="empty-card">
    <p className="big">{tr('让角色第一次开口')}</p>
    <p className="hint">{tr('先看一段对谈，或选择你的上场方式。')}</p>
    <button className="welcome-demo" disabled={busy} onClick={() => void demo()}>
      <span className="welcome-cast" aria-hidden="true">{['d03ft', 'k01', 'v04'].map((id) => <img key={id} src={`${import.meta.env.BASE_URL}characters/${id}/avatar.webp`} alt="" />)}</span>
      <span className="welcome-demo-copy"><b>{tr('Nana、Sena 与 Kai 的三人对谈')}</b><span>{tr('角色声音、动作与字幕')}{getLocale().startsWith('zh') ? '' : ' · ' + tr('中文演示')}</span></span>
      <span className="welcome-play">{busy ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{tr('看演示')}</span>
    </button>
    <div className="row center">
      {TEMPLATES.filter((t) => ['solo', 'ai', 'cohost'].includes(t.id)).map((t) => <button key={t.id} className="workflow-tile" onClick={() => onTemplate(t.id)}><b>{tr(t.label)}</b><span>{tr(t.hint)}</span></button>)}
    </div>
    <button className="link" onClick={onAdd}>{tr('自己放角色')}</button>
    {error && <p className="hint error" role="alert">{error}</p>}
  </div>
}

/** said once over the stage while a character shows nothing because the page has no WebGL context left for it
 *  (contexts.ts); gone when there is room again: characters removed or hidden */
function CrowdNotice({ insets }: { insets: Insets }) {
  const crowded = useCrowded(), { scene } = useScene()
  if (!scene.items.some((i) => i.kind === 'character' && !i.hidden && crowded.has(i.id))) return null
  return (
    <div className="crowd-notice" role="status" style={{ left: insets.left + 16, right: insets.right + 16 }}>
      <p><CircleAlert size={15} />{desktop
        ? tr("舞台上的角色太多，显示不过来。桌面版大约 {0} 个能正常显示。请隐藏或移除一些角色。", ROOM)
        : tr("舞台上的角色太多，这个浏览器显示不过来。浏览器里大约 {0} 个能正常显示，桌面版可以更多。请隐藏或移除一些角色。", ROOM)}</p>
    </div>
  )
}

// ---------------------------------------------------------------- bottom: the cast and the console

/** who is in the conversation, in the order they'd speak, and what each is doing. A click: this one speaks next (or,
 *  one you play, the console speaks as it); a right click takes it off the stage or back */
function Cast({ guide }: { guide: ReactNode }) {
  const { scene, selected } = useScene(), conv = useConversation()
  const cast = scene.items.filter((i) => i.kind === 'character')
  return <aside className="cast card" onPointerDown={(e) => e.stopPropagation()} aria-label={tr("角色列表")}>
    <div className="cast-scroll">
      <header><span className="title">{tr('cast.title')}</span><span className="hint num">{cast.length}</span></header>
    <div id="stage-cast-list">
      {!cast.length && <p className="hint">{tr("添加角色后，在这里选择。")}</p>}
      {cast.map((c) => {
        const state = c.remote ? (c.hidden ? tr("已隐藏") : tr("朋友 · ") + c.remote.person) : conv.speaking?.who === c.id ? tr("正在说话") : conv.thinking === c.id ? tr("正在思考") : conv.waiting === c.id ? tr("轮到你") : c.hidden ? tr("已隐藏") : c.lines === 'ai' ? 'AI' : c.lines === 'me' ? tr("我来演") : tr("只展示")
        return <div className={'actor-row' + (selected === c.id ? ' selected' : '') + (c.hidden ? ' hidden' : '')} key={c.id}>
          <button className="actor-select" onClick={() => store.select(c.id)} onContextMenu={(e) => { e.preventDefault(); store.patch(c.id, { hidden: !c.hidden }) }}>
            <i style={{ background: c.color }} /><span><b>{c.name}</b><small>{state}</small></span>
          </button>
          <button className="icon" aria-label={c.name + (c.muted ? tr("取消静音") : tr("静音"))} title={tr("静音角色声音")} onClick={() => store.patch(c.id, { muted: !c.muted })}>{c.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
          {c.lines === 'ai' && <button className="icon" title={tr("让 {0} 接着说", c.name)} onClick={() => talk.nextUp(c.id)}><StepForward size={15} /></button>}
        </div>
      })}
    </div>
    </div>
    {guide && <div className="cast-guide">{guide}</div>}
  </aside>
}

/** three parts: what they talk about; running it; what you say */
/** the console: the conversation (topic, start / pause, the model, next, stop, how far, its rules, the transcript) and,
 *  apart, what you say (as whom, the line, push to talk, send) */
function TalkBar({ log, setLog, model, toggleModel, rules, toggleRules, onLive }: { log: boolean; setLog: (on: boolean) => void; model: boolean; toggleModel: () => void; rules: boolean; toggleRules: () => void; onLive: () => void }) {
  const { scene } = useScene()
  const conv = useConversation(), demo = useBrainConfig().kind === 'demo'
  const [mine, setMine] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const send = () => { talk.say(mine); setMine('') }
  // who you speak as: on your character's turn, that one; else the chosen one, the first you play, or the narrator
  const yours = participants(scene).filter((c) => c.lines === 'me')
  const as = conv.waiting ?? (yours.some((c) => c.id === conv.as) || conv.as === 'narrator' ? conv.as : yours[0]?.id ?? 'narrator')
  const name = yours.find((c) => c.id === as)?.name
  const ptt = usePtt(), account = useAccount(), speech = useActiveSpeech(), hear = asrReady(speech) || account.status === 'in'
  useEffect(() => { if (conv.waiting) input.current?.focus() }, [conv.waiting])
  const hint = ptt.phase === 'opening' ? tr("打开麦克风…") : ptt.phase === 'listening' ? ptt.toggle ? tr("正在听，再按一次热键结束") : tr("正在听，松开就说出去") : ptt.phase === 'recognizing' ? tr("正在识别…")
    : conv.waiting ? tr("轮到你了：以 {0} 说…", name ?? tr("旁白")) : name ? tr("以 {0} 说一句…", name) : tr("以旁白说一句…")
  if (!participants(scene).some((c) => c.lines === 'ai')) return <SoloStatus />
  return (
    <div className="console" onPointerDown={(e) => e.stopPropagation()}>
     <div className="talkbar run-bar">
      <div className="zone topic-zone">
        <input className="topic" value={scene.topic} placeholder={tr("话题，比如：周末去哪儿玩")} aria-label={tr("话题")} onChange={(e) => store.set({ topic: e.target.value })} />
      </div>
      <div className="zone run">
        {!conv.running && <><button className="primary" onClick={onLive}><Bot size={14} />{tr("AI 直播")}</button><button onClick={talk.start}><Play size={14} />{tr(demo ? '再看一次' : '对谈')}</button></>}
        {conv.running && !conv.paused && <button className="primary" onClick={talk.pause}><Pause size={14} />{tr("暂停")}</button>}
        {conv.running && conv.paused && <button className="primary" onClick={talk.resume}><Play size={14} />{tr("继续")}</button>}
        <ModelButton on={model} onClick={toggleModel} />
        <button className="icon" title={tr("下一句：跳过等待，或者让正在说的停下")} disabled={!conv.running} onClick={talk.next}><StepForward size={15} /></button>
        <button className="icon" title={tr("停止")} disabled={!conv.running} onClick={() => { pttCancel(); talk.stop() }}><Square size={14} /></button>
        {conv.mode === 'live' ? <button className="live-state" onClick={onLive}>{conv.running ? conv.paused ? tr("已暂停") : conv.waitingAudience ? tr("等待弹幕") : tr("回应中") : tr("会话已结束")} · {conv.generations}/{conv.generationLimit}</button> : <TurnCount turns={conv.turns} limit={conv.limit} />}
        <button className={`icon${rules ? ' on' : ''}`} title={tr("对话设置：谁先说、抢话、语言、节奏、弹幕")} onClick={toggleRules}><SlidersHorizontal size={15} /></button>
        <button className={`icon${log ? ' on' : ''}`} title={tr("对话记录")} onClick={() => setLog(!log)}>
          <MessagesSquare size={16} />{conv.lines.length > 0 && <em>{conv.lines.length}</em>}
        </button>
      </div>
     </div>
     <div className={`talkbar say-bar${conv.waiting ? ' waiting' : ''}`}>
      <div className="zone say">
        <select className="as" value={as} aria-label={tr("以谁的身份说")} title={tr("以谁的身份说")} disabled={!!conv.waiting} onChange={(e) => talk.setAs(e.target.value)}>
          {yours.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="narrator">{tr("旁白")}</option>
        </select>
        <input ref={input} value={mine} aria-label={tr("你说的话")} onChange={(e) => { setMine(e.target.value); pttClear() }} placeholder={tr(hint)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send() }} />
        <button className={`icon mic ${ptt.phase}`} title={ptt.phase === 'recognizing' ? tr("正在识别，Esc 取消") : hear ? tr("按住说话，松开说出去（也可以按住 ` 键）") : tr("按住说话：在设置里接上语音识别后可用")}
          aria-label={tr("按住说话")} disabled={ptt.phase === 'recognizing' || !hear} style={{ ['--level' as string]: ptt.level }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); void pttPress() }}
          onPointerUp={() => void pttRelease()} onPointerCancel={pttCancel} onContextMenu={(e) => e.preventDefault()}>
          {ptt.phase === 'recognizing' ? <LoaderCircle size={16} className="spin" /> : <Mic size={16} />}
        </button>
        {conv.waiting && <button className="icon" title={tr("这次不说，跳过")} onClick={talk.skip}><SkipForward size={15} /></button>}
        <button className="icon" title={tr("说")} disabled={!mine.trim()} onClick={send}><Send size={15} /></button>
      </div>
     </div>
      {(conv.error || ptt.error) && <p className="talk-err">{conv.error || ptt.error}</p>}
    </div>
  )
}

function SoloStatus() {
  const { scene } = useScene(), ptt = usePtt(), [, redraw] = useState(0)
  useEffect(() => { const off = onActors(() => redraw((n) => n + 1)), timer = setInterval(() => redraw((n) => n + 1), 500); return () => { off(); clearInterval(timer) } }, [])
  const cast = participants(scene)
  if (!cast.length) return null
  // the one 开播 put on the stage, else the first you play (in sight first)
  const human = cast.find((c) => c.id === liveCharacter() && !c.hidden) ?? cast.find((c) => c.lines === 'me' && !c.hidden) ?? cast.find((c) => c.lines === 'me')
  const actor = human && actors.get(human.id), track = actor?.tracking
  const label = actor?.inputPhase === 'error' ? actor.error : actor?.away ? tr("暂离中，按 B 回来") : actor?.inputPhase === 'opening' ? tr("正在连接摄像头…")
    : track ? track.face ? tr("面捕已连接") : tr("未识别到面部") : tr("画面实时更新")
  return <div className="solo-status"><span><i className={'live-dot' + (ptt.phase !== 'idle' ? ' recording' : actor?.away || (track && !track.face) ? ' waiting' : '')} />{ptt.phase === 'listening' ? tr("正在听…") : ptt.phase === 'opening' ? tr("正在打开麦克风…") : ptt.phase === 'recognizing' ? tr("正在识别…") : label}</span>
    {ptt.phase !== 'idle' ? <button onClick={ptt.phase === 'listening' ? () => void pttRelease() : pttCancel}>{ptt.phase === 'listening' ? tr("结束语音输入") : tr("取消")}</button> : track?.face && <button onClick={() => actor?.calibrate()}>{tr("校准正面")}</button>}
    {ptt.error && <span className="error">{tr(ptt.error ?? '')}</span>}</div>
}

function Transcript({ onClose, right }: { onClose: () => void; right: number }) {
  const conv = useConversation()
  const { scene } = useScene()
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [conv.lines.length])
  const color = (who: string) => (scene.items.find((i) => i.id === who) as { color?: string } | undefined)?.color ?? '#7a746b'
  return (
    <div className="card transcript" style={{ right }} onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title">{tr("对话记录")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <div className="lines">
        {!conv.lines.length && <p className="muted">{tr("还没有人说话")}</p>}
        {conv.lines.map((l) => (
          <div key={l.id} className={`line${conv.speaking?.id === l.id ? ' now' : ''}${l.audience ? ' audience' : ''}`}>
            <b style={{ color: color(l.who) }}>{l.name}</b><span>{l.text}{l.cut && '——'}</span>
            <span className="acts">
              <button className="icon" title={tr("从这里重来：删掉这句和后面的")} disabled={conv.running} onClick={() => talk.rewind(l.id)}><RotateCcw size={13} /></button>
              <button className="icon" title={tr("只删这一句（AI 不会再记得）")} onClick={() => talk.forget(l.id)}><X size={13} /></button>
            </span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <footer>
        <button disabled={conv.running || !conv.lines.length} onClick={talk.redo}><RotateCcw size={14} />{tr("最后一句重说")}</button>
        <button className="danger" disabled={!conv.lines.length} onClick={talk.clear}>{tr("清空")}</button>
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------- show mode, menus, AI

function ShowControls() {
  const conv = useConversation(), r = useRecording(), { scene } = useScene(), demo = useBrainConfig().kind === 'demo'
  const hasAI = participants(scene).some((c) => c.lines === 'ai')
  const [on, setOn] = useState(true)
  useEffect(() => {
    let t = window.setTimeout(() => setOn(false), 2500)
    const wake = () => { setOn(true); clearTimeout(t); t = window.setTimeout(() => setOn(false), 2500) }
    addEventListener('pointermove', wake)
    return () => { removeEventListener('pointermove', wake); clearTimeout(t) }
  }, [])
  return (
    <div className={`show-controls${on ? ' on' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
      {hasAI && !conv.running && <button className="primary" onClick={talk.start}><Play size={14} />{tr(demo ? '再看一次' : '开始对谈')}</button>}
      {conv.running && !conv.paused && <button onClick={talk.pause}><Pause size={14} />{tr("暂停")}</button>}
      {conv.running && conv.paused && <button onClick={talk.resume}><Play size={14} />{tr("继续")}</button>}
      <button className="icon" title={tr("停止")} disabled={!conv.running} onClick={() => { pttCancel(); talk.stop() }}><Square size={14} /></button>
      {r.phase === 'recording' && <><span className="sep" /><button className="rec live" title={tr("停止录制，做成视频")} onClick={() => void rec.stop()}><i className="rec-dot" /><Clock from={r.started} />{tr("停止录制")}</button></>}
      <span className="sep" />
      <button onClick={() => store.setMode('edit')}>{tr("回到编辑")}<kbd>Esc</kbd></button>
    </div>
  )
}

const KEYS: [string, string][] = [
  ['空格', '开始 / 暂停 AI；没有 AI 角色时校准正面'], ['1–9 / 0', '表情 / 恢复'], ['Q W E R T', '点头、摇头、歪头、跳一下、害羞'], ['B', '暂离 / 回来'], ['⌘Z / ⇧⌘Z', '撤销 / 重做'], ['⌘D', '复制选中的'], ['Delete', '删除选中的'],
  ['方向键', '移动 1 像素（按住 ⇧ 移动 10）'], ['拖动时按住 Alt', '不吸附'], ['⇧1 / ⇧0', '适应窗口 / 100%'], ['⌘\\', '收起 / 展开右边的面板'],
  ['按住 `', '按住说话，松开说出去'], ['双击文字', '直接改字'], ['右键', '更多操作'], ['Esc', '取消选中 / 回到编辑'], ['?', '这张表'],
]

function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="card popover help" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title">{tr("快捷键")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <dl>{KEYS.map(([k, v]) => <div key={k}><dt><kbd>{tr(k)}</kbd></dt><dd>{tr(v)}</dd></div>)}</dl>
    </div>
  )
}

/** the first time: three steps that tick themselves as they are done */
function Checklist({ done, onModel, onVoice, onCharacter, onOutput }: { done: () => void; onModel: () => void; onVoice: () => void; onCharacter: () => void; onOutput: () => void }) {
  const { scene } = useScene(), conv = useConversation(), brain = useBrainConfig(), speech = useActiveSpeech()
  useAccount()
  const cs = characters(scene).filter((c) => !c.remote), ai = cs.some((c) => c.lines === 'ai')
  const [, redraw] = useState(0), [open, setOpen] = useState(false)
  useEffect(() => { const timer = setInterval(() => redraw((n) => n + 1), 500); return () => clearInterval(timer) }, [])
  const model = brainReady(brain), sound = brain.kind === 'demo' || cs.filter((c) => c.lines === 'ai').every((c) => voiceRoute(c, speech) !== 'none')
  const human = cs.find((c) => c.lines === 'me'), actor = human && actors.get(human.id)
  const steps = ai ? [
    { ok: cs.length > 0 && cs.every((c) => actors.get(c.id)?.status === 'ready'), title: tr('选择角色'), how: tr('点选角色，查看它的设置'), run: onCharacter },
    { ok: model && sound, title: tr('连接模型与声音'), how: model ? tr('先听听角色的声音') : tr('填一份密钥，开始真实对话'), run: model ? onVoice : onModel },
    { ok: conv.lines.length > 0, title: tr('开始对话'), how: tr('让角色先聊几句'), run: talk.start },
  ] : [
    { ok: cs.length > 0 && cs.every((c) => actors.get(c.id)?.status === 'ready'), title: tr('选择角色'), how: tr('点选角色，查看它的设置'), run: onCharacter },
    { ok: !!actor?.canCalibrate && actor.calibratedAt > 0, title: tr('校准正面'), how: tr('看向镜头，保持自然表情'), run: () => { if (actor?.canCalibrate) actor.calibrate(); else onCharacter() } },
    { ok: outputOpen(), title: tr('输出到 OBS'), how: tr('把准备好的画面送去直播'), run: onOutput },
  ]
  const all = steps.every((step) => step.ok), next = steps.find((step) => !step.ok), count = steps.filter((step) => step.ok).length
  useEffect(() => { if (all) { const timer = setTimeout(done, 2500); return () => clearTimeout(timer) } }, [all, done])
  return <div className={'coach' + (!open && next ? ' mini' : '')}>
    <header><span>{all ? tr('准备好了') : tr('三步上手')} <small className="num">{count}/3</small></span><span><button className="icon" aria-label={tr('查看上手步骤')} onClick={() => setOpen((v) => !v)}><ChevronDown size={13} /></button><button className="icon" aria-label={tr('关闭上手引导')} onClick={done}><X size={13} /></button></span></header>
    {!open && next ? <button className="coach-next" onClick={next.run}><b>{next.title}</b><span>{next.how}</span></button> : <ol>{steps.map((step) => <li key={step.title} className={step.ok ? 'ok' : ''}><i>{step.ok && <Check size={12} />}</i><button className="coach-next" onClick={step.run}><b>{step.title}</b><span>{step.how}</span></button></li>)}</ol>}
  </div>
}

function ContextMenu({ at, close }: { at: MenuAt; close: () => void }) {
  const it = store.get().items.find((i) => i.id === at.id)
  if (!it) return null
  const run = (f: () => void) => () => { f(); close() }
  const items: [string, () => void, string?][] = [
    ...(!(it.kind === 'character' && it.remote) ? [[tr("复制"), () => store.duplicate(it.id), '⌘D']] as [string, () => void, string][] : []),
    [tr("往前一层"), () => store.restack(it.id, 1)], [tr("往后一层"), () => store.restack(it.id, -1)],
    [tr("放到最前"), () => store.restack(it.id, 'front')], [tr("放到最后"), () => store.restack(it.id, 'back')],
    [tr("隐藏"), () => store.patch(it.id, { hidden: true })],
  ]
  return (
    <div className="card ctx" style={{ left: Math.min(at.x, innerWidth - 200), top: Math.min(at.y, innerHeight - 280) }} onPointerDown={(e) => e.stopPropagation()}>
      {items.map(([l, f, k]) => <button key={l} className="item" onClick={run(f)}>{l}{k && <kbd>{k}</kbd>}</button>)}
      <span className="sep" />
      <button className="item danger" onClick={run(() => store.remove(it.id))}>{it.kind === 'character' && it.remote ? tr("隐藏") : tr("删除")}<kbd>Delete</kbd></button>
    </div>
  )
}

/** minutes and seconds since `from` (performance.now), ticking */
function Clock({ from }: { from: number }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(t) }, [])
  const s = Math.max(0, Math.floor((performance.now() - from) / 1000))
  return <span className="num">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>
}

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`

/** 录制: idle it opens the card; while recording it shows the time and stops; then how far the video is */
function RecordButton({ on, toggle }: { on: boolean; toggle: () => void }) {
  const r = useRecording()
  if (r.phase === 'recording') {
    return <><button className="rec live" title={tr("停止录制，做成视频")} onClick={() => { void rec.stop(); if (!on) toggle() }}><i className="rec-dot" /><Clock from={r.started} />{tr("停止")}</button>{r.error && <button className="icon danger" aria-label={tr("检查录音声音")} title={r.error} onClick={toggle}><CircleAlert size={16} /></button>}</>
  }
  return (
    <button className={`rec${on ? ' on' : ''}`} title={tr("把整张舞台录成视频")} onClick={toggle}>
      <i className="rec-dot" />
      {r.phase === 'making' ? <span className="num">{tr("做视频")} {Math.round(r.progress * 100)}%</span> : r.phase === 'done' ? tr("视频好了") : tr("录制")}
    </button>
  )
}

/** how far this round is; the demo's script has its own length */
function TurnCount({ turns, limit }: { turns: number; limit: number }) {
  const brain = useBrainConfig(), { scene } = useScene()
  const d = brain.kind === 'demo' ? demoFor(participants(scene)) : null
  return <span className="count" title={tr("这一轮 AI 说了几句 / 最多几句")}>{turns} / {d ? d.script.lines.length : limit} {tr("句")}</span>
}

/** the finished video, to watch before saving it */
function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u) }, [file])
  return url ? <video className="made-video" src={url} controls playsInline /> : null
}

/** what to record, then the video being made, then saving it */
function RecordCard({ onClose, onVoices }: { onClose: () => void; onVoices: () => void }) {
  const r = useRecording(), { scene } = useScene(), conv = useConversation(), speech = useActiveSpeech(), brain = useBrainConfig()
  useAccount()  // what can be heard changes with the account (and, on livliv.ai, how long a take may run)
  const most = takeLimit()
  const [mic, setMic] = useState(false), [withTalk, setWithTalk] = useState(true)
  const voiced = participants(scene).filter((c) => c.lines === 'ai' || (c.lines === 'me' && c.readAloud))
  // the demo's lines are recordings, whatever the voice settings say
  const demo = brain.kind === 'demo' && !!demoFor(participants(scene))
  const heard = (c: (typeof voiced)[number]) => { const v = voiceRoute(c, speech); return demo || v === 'api' || v === 'livliv' }
  // no character's voice can be recorded (system speech can't): the button says so, the chips lead to the voices
  const silent = voiced.length > 0 && !voiced.some(heard)
  return (
    <div className="card popover record" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title">{tr("录制")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      {(r.phase === 'recording' || r.phase === 'making' || r.phase === 'done') && r.error && <p className="error" role="alert">{r.error}</p>}
      {(r.phase === 'idle' || r.phase === 'starting') && <>
        <div className="chips">
          <span className="chip num">{scene.width} × {scene.height}</span><span className="chip">30 fps</span><span className="chip">MP4</span>
          {scene.background === 'transparent' && <span className="chip warn" title={tr("视频没有透明通道：透明背景录成绿幕")}>{tr("绿幕")}</span>}
          {onSite && <span className="chip num">{most.seconds < 60 ? tr("最长 {0} 秒", most.seconds) : tr("最长 {0} 分钟", Math.round(most.seconds / 60))}</span>}
          {onSite && most.mark && <span className="chip">{tr("LivLiv 标记")}</span>}
        </div>
        {onSite && most.mark && <p className="hint"><a href="/pricing" target="_blank" rel="noopener">{tr("会员录 5 分钟，没有标记")}<ExternalLink size={11} /></a></p>}
        {voiced.length > 0 && <div className="chips voices">
          {voiced.map((c) => heard(c)
            ? <span key={c.id} className="chip"><Volume2 size={12} />{c.name}</span>
            : <button key={c.id} className="chip off" title={voiceRoute(c, speech) === 'none' ? tr("没有声音，只出字幕：设置里接上语音") : tr("系统朗读录不进声音：设置里接上语音")} onClick={onVoices}><VolumeX size={12} />{c.name}</button>)}
        </div>}
        {voiced.some((c) => c.lines === 'ai') && <label className="switch"><span>{tr("同时开始对话")}</span><input type="checkbox" checked={withTalk && !conv.running} disabled={conv.running} onChange={(e) => setWithTalk(e.target.checked)} /><i /></label>}
        <label className="switch" title={tr("建议戴耳机，不然角色的声音会被录两遍")}><span>{tr("录进麦克风")}</span><input type="checkbox" checked={mic} onChange={(e) => setMic(e.target.checked)} /><i /></label>
        <div className="row end">
          <button className="primary" disabled={r.phase === 'starting'} onClick={() => { void rec.start({ mic, talk: withTalk && !conv.running && voiced.some((c) => c.lines === 'ai') }); onClose() }}><i className="rec-dot" />{silent ? tr("录无声视频") : tr("开始录制")}</button>
        </div>
      </>}
      {r.phase === 'recording' && <div className="row end recording">
        <span className="big-clock"><i className="rec-dot" /><Clock from={r.started} /></span>
        <button className="rec live" onClick={() => void rec.stop()}>{tr("停止")}</button>
      </div>}
      {r.phase === 'making' && <>
        <div className="progress"><i style={{ width: `${Math.round(r.progress * 100)}%` }} /></div>
        <div className="row end"><span className="hint num">{tr("做视频")} {Math.round(r.progress * 100)}%</span><button onClick={rec.cancel}>{tr("取消")}</button></div>
      </>}
      {r.phase === 'done' && r.made && <>
        <Preview file={r.made.file} />
        <p className="made"><b>{r.made.file.name}</b><span className="num">{Math.floor(r.made.seconds / 60)}:{String(Math.round(r.made.seconds % 60)).padStart(2, '0')} · {mb(r.made.file.size)}</span></p>
        {(r.made.missing.sounds > 0 || r.made.missing.pictures > 0) && <div className="chips">
          {r.made.missing.sounds > 0 && <span className="chip warn">{tr("缺了 {0} 段声音", r.made.missing.sounds)}</span>}
          {r.made.missing.pictures > 0 && <span className="chip warn">{tr("缺了 {0} 张图片", r.made.missing.pictures)}</span>}
        </div>}
        <div className="row end">
          <button onClick={rec.reset}>{tr("再录一段")}</button>
          <button className="primary" onClick={rec.save}>{tr("存到电脑")}</button>
        </div>
      </>}
      {r.phase === 'error' && <>
        <p className="hint error">{tr(r.error ?? '')}</p>
        <div className="row end"><button onClick={rec.reset}>{tr("知道了")}</button>{r.retry && <button className="primary" onClick={() => void rec.retry()}>{tr("重新做视频")}</button>}</div>
      </>}
    </div>
  )
}

/** the site's age question, asked once before LivLiv's points AI speaks (chat's rule: 18 and over) */
function AgeDialog({ onAnswer }: { onAnswer: (adult: boolean) => void }) {
  return <>
    <div className="scrim" />
    <div className="card popover settings age-check" role="dialog" aria-modal="true" aria-labelledby="age-title" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title" id="age-title">{tr("确认年龄")}</span></header>
      <p className="hint">{tr("用 AI 让角色说话前，请确认你已年满 18 岁。")}</p>
      <div className="row end"><button onClick={() => onAnswer(false)}>{tr("未满 18 岁")}</button><button className="primary" autoFocus onClick={() => onAnswer(true)}>{tr("已满 18 岁")}</button></div>
    </div>
  </>
}

/** the model in the console: which one the AI characters think with; not set up yet, an invitation */
function ModelButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  const c = useBrainConfig(), ready = brainReady(c)
  const label = c.kind === 'demo' ? tr("演示") : c.kind === 'livliv' ? 'LivLiv' : ready ? c.model : tr("接入模型")
  return (
    <button className={`model-btn${on ? ' on' : ''}${ready ? '' : ' need'}`} aria-label={tr("AI 模型")} title={c.kind === 'openai' && ready ? `${tr(providerOf(c).label)} · ${c.model}` : tr("AI 角色用什么模型想台词")} onClick={onClick}>
      <Bot size={14} /><span>{tr(label)}</span><ChevronDown size={12} />
    </button>
  )
}

/** where the AI characters' lines come from: your own model (a preset, or any OpenAI-compatible API), or the demo */
function ModelForm({ forStart, done, demoDone }: { forStart?: boolean; done?: () => void; demoDone?: () => void }) {
  const cur = useBrainConfig(), { scene } = useScene()
  const demoAvailable = demoFor(participants(scene))?.script.template === 'trio'
  const [demo, setDemo] = useState(cur.kind === 'demo')
  // livliv.ai/stage: LivLiv's points instead of a key of one's own (the site writes and voices the lines)
  const [points, setPoints] = useState(onSite && (cur.kind === 'livliv' || (cur.kind === 'demo' && savedBrain().kind === 'livliv')))
  const account = useAccount()
  const [d, setD] = useState<ModelConfig>(() => (previousModelConfig().provider ? previousModelConfig() : { kind: 'openai', provider: PROVIDERS_HERE[0].id, base: PROVIDERS_HERE[0].base, key: '', model: '' }))
  const [models, setModels] = useState<string[]>([])
  const [st, setSt] = useState<{ busy?: 'list' | 'test' | 'demo'; ok?: number; err?: string }>({})
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
    try { const seconds = await testModel(d, controller.signal); if (!controller.signal.aborted && request.current === controller) setSt({ ok: seconds }) }
    catch (error) { if (!controller.signal.aborted && request.current === controller) setSt({ err: (error as Error).message }) }
  }
  const save = async (playDemo = demo) => {
    request.current?.abort(); request.current = null
    try {
      if (playDemo) { setSt({ busy: 'demo' }); await beginDemo(demoDone ?? done) }
      else { if (cur.kind === 'demo') talk.stop(); saveBrainConfig(points ? { kind: 'livliv' } : d); done?.(); if (forStart) talk.start() }
      setSt({})
    } catch (error) { setSt({ err: (error as Error).message }) }
  }
  return <div className="model-form">
    <div className="demo-launch"><div><b>{tr('三人对谈演示')}</b><span>{tr('无需密钥')}</span></div><button disabled={st.busy === 'demo'} onClick={() => void save(true)}>{st.busy === 'demo' ? <LoaderCircle size={14} className="spin" /> : <Play size={14} />}{tr(demoAvailable ? '看演示' : '打开演示舞台')}</button></div>
    <div className="providers">
      {onSite && <button className={!demo && points ? 'on' : ''} disabled={st.busy === 'demo'} onClick={() => { request.current?.abort(); setDemo(false); setPoints(true); setSt({}) }}>LivLiv</button>}
      {PROVIDERS_HERE.map((q) => <button key={q.id} className={!demo && !points && d.provider === q.id ? 'on' : ''} disabled={st.busy === 'demo'} onClick={() => choose(q.id)}>{tr(q.label ?? '')}</button>)}
    </div>
    {points && !demo ? <>
      <p className="hint">{tr("不用密钥：用 livliv.ai 的积分让角色说话，含角色自己的声音，按实际用量扣，长台词和系统声音会多一些。只能用于 LivLiv 的角色。")}</p>
      {account.status === 'out' && <button onClick={() => void connect()}><ExternalLink size={14} />{tr("登录 livliv.ai")}</button>}
    </> : onSite && <p className="hint">{tr("网页版只列出能在浏览器里直接调用的服务。本机的 Ollama 和其他接口，请用桌面版。")}</p>}
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
    </>}
    {st.err && <p className="hint error" role="alert">{st.err}</p>}
    {!demo && <div className="row end">
      {!demo && !points && <button disabled={!brainReady(d) || st.busy === 'test'} onClick={() => void test()}>
        {st.busy === 'test' ? <LoaderCircle size={14} className="spin" /> : st.ok !== undefined ? <Check size={14} /> : null}
        {st.ok !== undefined ? tr("{0} 秒", st.ok.toFixed(1)) : tr("测试")}
      </button>}
      <button className="primary" disabled={!demo && (points ? account.status !== 'in' : !brainReady(d))} onClick={() => void save()}>{forStart || demo ? <><Play size={14} />{demo ? tr("看演示") : tr("开始")}</> : tr("保存")}</button>
    </div>}
  </div>
}

/** your speech API: the characters' voices (OpenAI-compatible /audio/speech) and push to talk (/audio/transcriptions);
 *  测试 says a line and, with a recognition model, hears it back */
function SpeechForm() {
  const cur = useSpeech(), chat = useBrainConfig()
  const first = (id: string): SpeechApi => { const q = SPEECH_PROVIDERS.find((x) => x.id === id)!; return { ...SPEECH_UNSET, provider: id, base: q.base, model: q.model, asr: q.asr, voice: '' } }
  // none chosen: it follows the model's key where that speaks too
  const ofModel = speechOfModel(chat)
  const [mode, setMode] = useState<'follow' | 'off' | 'own'>(!cur.provider ? (ofModel ? 'follow' : 'off') : cur.provider === 'off' ? 'off' : 'own')
  const modeEdited = useRef(false)
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
      <button className="primary" disabled={!off && !speechReady(d)} onClick={() => saveSpeech(mode === 'follow' ? SPEECH_UNSET : mode === 'off' ? SPEECH_OFF : d)}>{tr("保存")}</button>
    </div>
  </div>
}

/** the model card over the console */
function ModelCard({ forStart, onClose }: { forStart: boolean; onClose: () => void }) {
  return (
    <div className="card popover model" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title">{tr("AI 模型")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <ModelForm forStart={forStart} done={onClose} />
    </div>
  )
}

/** Settings for general preferences, models, voice, shortcuts and the optional livliv.ai account. */
function SettingsCard({ onClose, onAdd, initialTab }: { onClose: () => void; onAdd: () => void; initialTab: SettingsTab }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  useEffect(() => { if (tab === 'account') void checkConnect() }, [tab])
  return (
    <div className="card popover settings" onPointerDown={(e) => e.stopPropagation()}>
      <div className="settings-head"><header><span className="title">{tr("设置")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <div className="settings-tabs seg">{([{ id: 'general', label: tr("通用") }, { id: 'ai', label: tr("模型与声音") }, { id: 'hotkeys', label: tr("全局热键") }, { id: 'account', label: tr("livliv.ai 帐号") }] as const).map((t) => <button className={`${tab === t.id ? 'on ' : ''}${t.id === 'account' ? 'account-tab' : ''}`} key={t.id} onClick={() => setTab(t.id)}>{t.id === 'account' && <Sparkles size={13} />}{t.label}</button>)}</div>
      </div><div className="settings-body">
      {tab === 'general' && <GeneralPanel />}
      {tab === 'hotkeys' && <HotkeysPanel />}
      {tab === 'ai' && <><section>
        <h3>{tr("AI 模型")}</h3>
        <ModelForm demoDone={onClose} />
      </section>
      <section>
        <h3>{tr("语音")}</h3>
        <SpeechForm />
      </section>
      </>}
      {tab === 'account' && <AccountPanel onAdd={onAdd} />}
      </div>
    </div>
  )
}
