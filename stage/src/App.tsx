// LivLiv Stage. Edit mode: the top bar (name, edit / show, undo, templates, files, AI), the tools on the left (add
// things), the panel on the right (the selected item; with nothing selected, the stage and its layers), at the bottom
// the cast (who is in the conversation, and in what state) over the console (topic, run, your line). ⌘\ folds the
// right panel away. Show mode: only the stage; moving the mouse brings back a small control bar for a moment.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Captions, ChevronDown, CircleHelp, CircleAlert, ExternalLink, FolderOpen, Image as ImageIcon, LayoutTemplate, LoaderCircle,
  FileBox, Plus, Users, Volume2, VolumeX,
  MonitorPlay, Pencil, Pause, Play, Redo2, RotateCcw, Save, Square, StepForward, Settings, Sparkles, Type, Undo2, UserPlus, X,
} from 'lucide-react'
import { loadBrainConfig, playDemo, useBrainConfig } from './brain'
import { conversation, talk, useConversation } from './conversation'
import { Panel, PanelTab } from './Inspector'
import { byId, fromFiles, fromKept, fromPngs, mine as accountCharacters, samples, type Pick } from './library'
import { PNG_SLOTS, type PngSlot } from './bodies/png'
import { forget, kept, type Kept } from './vault'
import { bubbleFor, captionBar, characters, hadSaved, participants, newCharacter, store, uid, useScene } from './scene'
import { Stage, type Insets, type MenuAt, type Zoom } from './Stage'
import { OutputPanel } from './OutputPanel'
import { LivePanel } from './LivePanel'
import { RealtimePanel } from './RealtimePanel'
import { HotkeysPanel } from './HotkeysPanel'
import { CollabPanel } from './CollabPanel'
import { connectDesktop } from './desktop'
import { ROOM, useCrowded } from './contexts'
import { ageGate, checkConnect, refresh, setAge, useAccount } from './livliv'
import { rec, takeLimit, useRecording } from './recording'
import { cancel as pttCancel, holdKey, release as pttRelease, usePtt } from './ptt'
import { useActiveSpeech, voiceRoute } from './voiceApi'
import { buildTemplate, TEMPLATES, type TemplateId } from './templates'
import { demoFor } from './demo'
import { actors, onActors } from './actors'
import { imageGeometry, moveImage } from './attachments'
import { propSource } from './propGeometry'
import { AccountPanel } from './AccountPanel'
import { connectNetworkTracking } from './networkTracking'
import { connectAudienceActions } from './audienceControl'
import { pictureFile } from './assets'
import { downloadProject, openProject, projectFile } from './project'
import { MixerPanel } from './MixerPanel'
import { ScenesMenu } from './ScenesMenu'
import { GeneralPanel } from './GeneralPanel'
import { SidebarToggle } from './SidebarToggle'
import { tr, getLocale, useLocale } from './i18n'
import { small } from './host'
import { features } from './core/platform'
import { linkedAs, linkedId, openLinked } from './entry'
import { PhoneIntro } from './SiteIntro'
import { beginDemo, ensureTrio } from './shell/demoStart'
import { StartPage } from './shell/StartPage'
import { Checklist, type Fix } from './shell/Checklist'
import { StartOptionsCard } from './shell/StartBar'
import { Console } from './shell/Console'
import { Connections, SETTINGS_INDEX, type ConnectSection } from './shell/Connections'
import { useChecks } from './shell/useChecks'
import { GOAL_TEMPLATE, GOALS, goalOptions, optionsOf, startLabel } from './shell/goals'
import { startGoal, startGoesOut } from './shell/start'
import { showCardPage } from './shell/cardPage'
import type { Goal } from './scene'
import { connectCharacterKeys } from './characterKeys'
import { faceCharacter } from './control'
import { connectOutputFeed } from './outputFeed'
import { GoLiveGuide } from './GoLive'
import { MemoryPanel } from './MemoryPanel'
import { memory, type StoredSession } from './memory'
import { connectNeuro } from './neuroBridge'
import './chat.css'
import './shell/shell.css'

type SettingsTab = 'general' | 'ai' | 'hotkeys' | 'account'
type ModelTab = 'chat' | 'speech' | 'realtime'

type Pop = null | 'add' | 'settings' | 'templates' | 'help' | 'record' | 'output' | 'live' | 'realtime' | 'collab' | 'scenes' | 'mixer' | 'checklist' | 'start-options' | 'start'

const FOLDED = 'livliv-stage:panel-folded'

export default function App() {
  useLocale()
  const { mode, scene } = useScene()
  const hasAI = participants(scene).some((c) => c.lines === 'ai')
  const [pop, setPop] = useState<Pop>(null)
  const [voiceSetup, setVoiceSetup] = useState<string>()
  useEffect(() => { if (pop !== 'settings') setVoiceSetup(undefined) }, [pop])
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  const [settingsModel, setSettingsModel] = useState<ModelTab>('chat')
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
  const resetLayout = () => {
    for (const key of [FOLDED, 'livliv-stage:left-folded', 'livliv-stage:tools-folded', 'livliv-stage:cast-folded']) localStorage.removeItem(key)
    setBareNow(false); setLeftFolded(false); setZoom('fit')
  }
  const [log, setLog] = useState(false)
  const [logView, setLogView] = useState<'history' | 'memory'>('history')
  const [menu, setMenu] = useState<MenuAt | null>(null)
  const [note, setNote] = useState('')
  // livliv.ai/stage: a phone gets the demo to watch; a computer's first visit gets the demo's three on the stage and the
  // start page over them (none for a link to a character, which opens that one instead)
  const phone = features.host === 'site' && small()
  const firstVisit = features.host === 'site' && !phone && !hadSaved && !linkedId()
  // the site's 开播 (?c=<id>&as=face): its card, where the first-visit checklist goes
  const [goLive, setGoLive] = useState<string | null>(null)
  const toggle = (p: Pop) => { if (p === 'settings') { setForStart(false); setSettingsTab('general') } setPop((x) => (x === p ? null : p)) }
  // a model, voice or recognition form opened from a panel or card: saving or closing it goes back there. AI 直播,
  // 联播, the mixer and 录制 wait behind it as they were (kept, hidden); 实时语音 and the model card open afresh (their
  // settings may just have changed)
  const [back, setBack] = useState<Pop>(null)
  useEffect(() => { if (pop !== 'settings') setBack(null) }, [pop])
  const openModels = (model: ModelTab, start = false, from: Pop = null) => { setVoiceSetup(undefined); setForStart(start); setBack(start ? null : from); setSettingsModel(model); setSettingsTab('ai'); setPop('settings') }
  const kept = (p: Pop) => pop === p || (pop === 'settings' && back === p)
  const openAccount = () => { setVoiceSetup(undefined); setSettingsTab('account'); setPop('settings') }
  useEffect(() => { void refresh() }, [])  // the LivLiv account, if one is connected
  // LivLiv's points AI asks the site's age question once (livliv.ts stageLine): answered here
  // (one question at a time: a second line asking while it is open waits for the same answer)
  const [ageAsk, setAgeAsk] = useState<((adult: boolean) => void) | null>(null)
  const agePending = useRef<Promise<boolean> | null>(null)
  useEffect(() => {
    ageGate.ask = () => agePending.current ??= new Promise<boolean>((resolve) => setAgeAsk(() => (adult: boolean) => { agePending.current = null; resolve(adult) }))
    return () => { ageGate.ask = null }
  }, [])
  const answerAge = async (adult: boolean) => {
    try { await setAge(adult) } catch { /* the line that asked says what went wrong */ }
    ageAsk?.(adult); setAgeAsk(null)
  }
  useEffect(() => {
    if (features.host === 'site' && (phone || (!hadSaved && !linkedId()))) void ensureTrio().then(() => { store.select(null); if (phone) store.setMode('show') }, () => {})
    const id = linkedId(), as = linkedAs()
    if (id && !phone) void openLinked(id, as).then(({ note, character }) => {
      if (note) say(note)
      if (character && as === 'face') { setGoLive(character); setLeftFolded(false) }
      if (character && as === 'ai') { store.setTalk({ goal: 'live', ...goalOptions('live', false) }); setPop('checklist') }
    })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  // on the site, signing in or out happens on its own pages, maybe in another tab: asked again when this one is back
  useEffect(() => { if (!(features.host === 'site')) return; const again = () => void refresh(); addEventListener('focus', again); return () => removeEventListener('focus', again) }, [])
  useEffect(() => { if (phone && mode !== 'show') store.setMode('show') }, [phone, mode])
  useEffect(() => { if (firstVisit) setPop('start') }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(connectDesktop, [])
  useEffect(() => connectNeuro({ event: talk.externalEvent, dialogue: talk.externalDialogue, decide: talk.decideExternalAction, subscribeSpeech: talk.onSpeech }), [])
  const profilesKey = participants(scene).filter((character) => character.lines === 'ai' && !character.remote).map((character) => character.profileId ?? character.id).sort().join(',')
  useEffect(() => { const controller = new AbortController(); void talk.restore(controller.signal); return () => controller.abort() }, [profilesKey])
  useEffect(connectAudienceActions, [])
  useEffect(connectNetworkTracking, [])
  useEffect(() => holdKey(), [])  // push to talk: hold `
  useEffect(connectCharacterKeys, [])  // 1-9 0 Q W E R T B (characterKeys.ts)
  useEffect(connectOutputFeed, [])
  // Choose the model before asking for a particular provider's account.
  const conv = useConversation()
  const [forStart, setForStart] = useState(false)
  useEffect(() => {
    if (!conv.needModel) return
    talk.modelAsked(); store.setMode('edit'); openModels('chat', conv.modelIntent !== 'input')
  }, [conv.needModel])
  const closeSettings = () => { setForStart(false); setSettingsTab('general'); setPop(back) }
  const continueAfterModel = () => {
    if (conv.modelIntent === 'chat') void talk.startChat().catch(() => {})
    else if (conv.modelIntent === 'live') startNow()
    else if (conv.modelIntent === 'conversation') talk.start()
  }
  const say = (s: string) => { setNote(s); window.setTimeout(() => setNote((n) => (n === s ? '' : n)), 3200) }
  const show = mode === 'show'
  // a phone or a narrow window: the stage full width, the console under it, cards over it
  const narrow = useNarrow()
  // what the stage is for (its goal), whether you play with an AI partner, and its 准备清单
  const ai = participants(scene).filter((c) => c.lines === 'ai' && !c.remote)
  const goal: Goal = scene.talk.goal ?? (scene.talk.start === 'live' ? 'live' : scene.talk.start === 'conversation' ? 'video' : hasAI ? 'chat' : 'perform')
  const partner = goal === 'perform' && ai.length > 0
  const checks = useChecks(goal, partner)
  // a goal picked: its stage (the template, unless your own characters are there) and its 准备清单
  const pickGoal = async (next: Goal, withPartner: boolean) => {
    const cast = participants(store.get()).filter((c) => !c.remote)
    // the demo's characters alone are no stage of yours: the goal's template takes their place
    const demo = demoFor(cast), demoCast = !!demo && Object.keys(demo.who).length === cast.length
    if (!cast.length || demoCast) {
      await template(next === 'perform' && withPartner ? 'cohost' : GOAL_TEMPLATE[next])
      // the stage is named by what it is for
      store.set({ name: tr(GOALS.find((g) => g.id === next)!.label) })
    }
    store.setTalk({ goal: next, ...goalOptions(next, withPartner) })
    // on a phone the character sheet would cover the stage the list is about
    if (narrow) store.select(null)
    setPop('checklist')
  }
  const startNow = () => { setPop(null); void startGoal(goal, optionsOf(scene.talk, partner)).catch((error: Error) => say(error.message)) }
  // after the demo, the same characters with a model of one's own: they talk among themselves (和角色聊天, you only
  // watching), and the checklist says what is still needed
  const ownModel = () => { playDemo(false); store.setTalk({ goal: 'chat', audience: 'me', you: 'none' }); setPop('checklist') }
  const fix = (target: Fix) => {
    const select = (who: 'ai' | 'me') => { const c = participants(store.get()).find((x) => x.lines === who && !x.remote) ?? participants(store.get())[0]; if (c) store.select(c.id); setBare(false) }
    if (target === 'connect:model') openModels('chat', false, 'checklist')
    else if (target === 'connect:speech') openModels('speech', false, 'checklist')
    else if (target === 'connect:realtime') openModels('realtime', false, 'checklist')
    // 实时通话 set up: its own card, where the call starts
    else if (target === 'realtime') { if (checks.find((c) => c.id === 'realtime')?.state === 'ok') setPop('realtime'); else openModels('realtime', false, 'checklist') }
    else if (target === 'live-room') setPop('live')
    else if (target === 'character:who') { select('me'); showCardPage('who') }
    else if (target === 'character:voice') { select('ai'); showCardPage('persona') }
    else if (target === 'options') setPop('start-options')
    else { setSettingsTab('general'); setPop('settings') }
  }
  useShortcuts({
    escape: () => { if (menu) setMenu(null); else if (pop) { setForStart(false); setPop(null) } else if (store.selected()) store.select(null); else if (store.mode() === 'show' && !phone) store.setMode('edit') },
    help: () => toggle('help'),
    zoom: setZoom,
    bare: () => setBare((b) => !b),
    say,
    start: () => { if (startGoesOut(goal, optionsOf(scene.talk, partner))) setPop('checklist'); else startNow() },
  })
  // the stage's room: the same whatever is open (only ⌘\ changes it)
  // a phone: the stage above the intro card at the bottom
  const insets: Insets = narrow && !show ? { top: 56, right: 8, bottom: 150, left: 8 } : show ? (phone ? { top: 12, right: 8, bottom: 360, left: 8 } : { top: 0, right: 0, bottom: 0, left: 0 }) : { top: 56, right: bare ? 80 : 312, bottom: hasAI ? 124 : 76, left: leftFolded ? 80 : 220 }
  const template = async (id: TemplateId) => {
    setPop(null)
    // no question first: it can be undone, and the note says how
    try {
      const had = store.get().items.length > 0
      pttCancel(); talk.detach(); playDemo(false); store.replace(await buildTemplate(id)); store.select(characters(store.get())[0]?.id ?? null)  // a new scene starts a new conversation
      if (had) say(tr("已换成「{0}」，⌘Z 可以换回来", tr(TEMPLATES.find((t) => t.id === id)!.label)))
    } catch (e) { say((e as Error).message) }
  }
  return (
    <div className={`app ${mode}${bare ? ' panels-folded' : ''}${hasAI ? '' : ' solo-mode'}${leftFolded ? ' tools-folded' : ''} next${narrow ? ' narrow' : ''}${store.selected() ? ' selected' : ''}`} onPointerDown={() => setMenu(null)}>
      <Stage insets={insets} onMenu={setMenu} zoom={zoom} setZoom={setZoom} empty={narrow ? null : <StartPage onGoal={(g, p) => void pickGoal(g, p)} onTemplate={template} onAdd={() => setPop('add')} />} />
      {show ? (phone ? <PhoneIntro onDemo={() => beginDemo()} /> : <ShowControls goal={goal} partner={partner} onStart={startNow} />) : <>
        <TopBar pop={pop} toggle={toggle} onTemplate={template} say={say} onStartPage={() => setPop('start')} />
        <CrowdNotice insets={insets} />
        <Rail pop={pop} toggle={toggle} folded={leftFolded} onFold={foldLeft} />
        {((pop === 'start' && scene.items.length > 0) || (narrow && !scene.items.length && !pop)) && <div className="start-overlay"><StartPage onGoal={(g, p) => void pickGoal(g, p)} onTemplate={template} onAdd={() => setPop('add')} onClose={() => setPop(null)} /></div>}
        {bare ? <PanelTab onOpen={() => setBare(false)} /> : <Panel onFold={() => setBare(true)} onAccount={openAccount} onVoice={(id) => { openModels('speech'); setVoiceSetup(id) }} />}
        {!leftFolded && <Cast onFriend={features.collab ? () => toggle('collab') : undefined} friendOn={pop === 'collab'} guide={goLive ? <GoLiveGuide id={goLive} onClose={() => setGoLive(null)} /> : null} />}
        {goal === 'perform' && !partner ? <><SoloStatus />{pop !== 'checklist' && scene.items.some((i) => i.kind === 'character') && <button className="st-tag solo-checks" onClick={() => setPop('checklist')}>{tr('准备清单')}</button>}</>
          : <Console goal={goal} partner={partner} checks={checks} optionsOpen={pop === 'start-options'} onOptions={() => toggle('start-options')} onChecklist={() => toggle('checklist')} onStart={startNow} onOwnModel={ownModel}
            onModel={() => openModels('chat')} onVoice={() => fix('character:voice')} onRoom={() => toggle('live')} onRealtime={() => toggle('realtime')}
            onLog={() => { setLog((on) => !on || logView === 'memory'); setLogView('history') }} onMemory={() => { setLogView('memory'); setLog(true) }} />}
        {pop === 'checklist' && <Checklist goal={goal} partner={partner} startLabel={startLabel(goal, partner)} onStart={startNow} onFix={fix} onClose={() => setPop(null)} />}
        {pop === 'start-options' && <StartOptionsCard goal={goal} partner={partner} onClose={() => setPop(null)} />}
        {kept('mixer') && <Kept on={pop === 'mixer'}><MixerPanel onClose={() => setPop(null)} onSettings={() => openModels('speech', false, 'mixer')} /></Kept>}
        {kept('collab') && <Kept on={pop === 'collab'}><CollabPanel onClose={() => setPop(null)} onSettings={() => openModels('speech', false, 'collab')} /></Kept>}
        {kept('live') && <Kept on={pop === 'live'}><LivePanel onClose={() => setPop(null)} /></Kept>}
        {pop === 'realtime' && <RealtimePanel onClose={() => setPop(null)} onSettings={() => openModels('realtime', false, 'realtime')} />}
        {log && <Transcript view={logView} setView={setLogView} onClose={() => setLog(false)} right={bare ? 80 : 324} />}
        {pop === 'add' && <AddCharacter left={228} onClose={() => setPop(null)} onSignIn={() => { setSettingsTab('account'); setPop('settings') }} />}
        {pop === 'settings' && <><div className="scrim" onPointerDown={closeSettings} /><SettingsCard key={voiceSetup ?? 'settings'} forVoice={voiceSetup} initialTab={settingsTab} initialModel={settingsModel} forStart={forStart} returns={back !== null} onContinue={continueAfterModel} onResetLayout={resetLayout} onAdd={() => { setForStart(false); setPop('add') }} onClose={closeSettings} /></>}
        {kept('record') && <Kept on={pop === 'record'}><RecordCard onClose={() => setPop(null)} onVoices={() => openModels('speech', false, 'record')} /></Kept>}
        <OutputPanel open={pop === 'output'} onClose={() => setPop(null)} />
        {pop === 'help' && <Help onClose={() => setPop(null)} />}
        {menu && <ContextMenu at={menu} close={() => setMenu(null)} />}

      </>}
      {ageAsk && <AgeDialog onAnswer={(adult) => void answerAge(adult)} />}
      {note && <div className="toast">{note}</div>}
    </div>
  )
}

type Keys = { escape: () => void; help: () => void; zoom: (z: Zoom | ((z: Zoom) => Zoom)) => void; bare: () => void; say: (s: string) => void; start: () => void }

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
        const x = [...document.querySelectorAll<HTMLButtonElement>('.popover button[data-close], .card.transcript button[data-close]')].find((button) => button.getClientRects().length > 0)
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
        if (!characters(store.get()).some((x) => x.lines === 'ai')) actors.forEach((a) => { if (a.item.lines === 'me') a.calibrate() })
        else if (c.running) { if (c.paused) talk.resume(); else talk.pause() }
        else {
          // the demo: again. Else the stage's start, as its button does; one that goes out to a 直播间 or records only
          // opens its checklist from a key. Lines paid with points start only from a button, never from a key: Space
          // plays the free demo instead. Points pay for LivLiv's lines and for every line in a LivLiv voice
          const brain = loadBrainConfig()
          const paidVoice = brain.kind !== 'demo' && participants(store.get()).some((c) => c.lines === 'ai' && !c.muted && voiceRoute(c) === 'livliv')
          if (brain.kind === 'demo') talk.start()
          else if (brain.kind === 'livliv') {
            if (demoFor(characters(store.get()))?.script.template === 'trio') void beginDemo()
            else K.say(tr("用积分的台词，请点按钮开始"))
          } else if (paidVoice) K.say(tr("用积分的台词，请点按钮开始"))
          else K.start()
        }
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

/** a phone or a narrow window (the redesign lays the editor out for it) */
function useNarrow() {
  const query = '(max-width: 760px)'
  const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches)
  useEffect(() => { const list = matchMedia(query), change = () => setNarrow(list.matches); list.addEventListener('change', change); return () => list.removeEventListener('change', change) }, [])
  return narrow
}

/** a panel kept as it was while a settings form it opened is in front (App: back) */
function Kept({ on, children }: { on: boolean; children: ReactNode }) {
  return <div className="kept-panel" style={{ display: on ? 'contents' : 'none' }}>{children}</div>
}

// ---------------------------------------------------------------- top

function TopBar({ pop, toggle, onTemplate, say, onStartPage }: { pop: Pop; toggle: (p: Pop) => void; onTemplate: (id: TemplateId) => void; say: (s: string) => void; onStartPage: () => void }) {
  const { scene, canUndo, canRedo } = useScene()
  const narrow = useNarrow()
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
      ctrl.signal.throwIfAborted(); pttCancel(); talk.detach(); playDemo(false); store.replaceProject(project)
      const notes = [missing ? tr("有 {0} 个从文件导入的角色这台电脑上没有，要重新导入", missing) : '', dropped ? tr("{0} 张图片的地址不受支持，已跳过", dropped) : '']
      if (missing || dropped) say(notes.filter(Boolean).join(' '))
    } catch (error) { if (!ctrl.signal.aborted) say((error as Error).message) }
    finally { if (task.current === ctrl) { task.current = null; setIO(null) } }
  }
  return (
    <header className="topbar" onPointerDown={(e) => e.stopPropagation()}>
      <div className="left">
        <img className="mark" src={`${import.meta.env.BASE_URL}wordmark.svg`} alt="LivLiv Stage" />
        <div className="menu-anchor scene-switcher"><input className="name" value={scene.name} aria-label={tr("舞台名字")} onChange={(e) => store.set({ name: e.target.value })} /><button className={pop === "scenes" ? "icon on" : "icon"} title={tr("切换镜头")} aria-expanded={pop === "scenes"} onClick={() => toggle("scenes")}><ChevronDown size={15} /></button>{pop === "scenes" && <ScenesMenu close={() => toggle(null)} onStartPage={() => { toggle(null); onStartPage() }} />}</div>
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
        <button className={pop === 'mixer' ? 'icon on' : 'icon'} title={tr('调音台')} onClick={() => toggle('mixer')}><Volume2 size={16} /></button>
        <RecordButton on={pop === 'record'} toggle={() => toggle('record')} />
        <button className="primary output-button" title={tr("输出到 OBS")} onClick={() => toggle('output')}><MonitorPlay size={15} />{narrow ? 'OBS' : tr("输出到 OBS")}</button>
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
  useEffect(() => { if (features.host === 'site' && signed) void accountCharacters().then(setOwn, (e: Error) => setErr(e.message)) }, [signed])
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

/** said once over the stage while a character shows nothing because the page has no WebGL context left for it
 *  (contexts.ts); gone when there is room again: characters removed or hidden */
function CrowdNotice({ insets }: { insets: Insets }) {
  const crowded = useCrowded(), { scene } = useScene()
  if (!scene.items.some((i) => i.kind === 'character' && !i.hidden && crowded.has(i.id))) return null
  return (
    <div className="crowd-notice" role="status" style={{ left: insets.left + 16, right: insets.right + 16 }}>
      <p><CircleAlert size={15} />{features.shell
        ? tr("舞台上的角色太多，显示不过来。桌面版大约 {0} 个能正常显示。请隐藏或移除一些角色。", ROOM)
        : tr("舞台上的角色太多，这个浏览器显示不过来。浏览器里大约 {0} 个能正常显示，桌面版可以更多。请隐藏或移除一些角色。", ROOM)}</p>
    </div>
  )
}

// ---------------------------------------------------------------- bottom: the cast and the console

/** who is in the conversation, in the order they'd speak, and what each is doing. A click: this one speaks next (or,
 *  one you play, the console speaks as it); a right click takes it off the stage or back */
function Cast({ guide, onFriend, friendOn }: { guide: ReactNode; onFriend?: () => void; friendOn?: boolean }) {
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
    {/* 好友联播 is a way onto the stage: a friend's character comes on as one of the cast */}
    {onFriend && <button className={`cast-friend${friendOn ? ' on' : ''}`} onClick={onFriend}><Users size={15} />{tr('请朋友上台')}</button>}
    {guide && <div className="cast-guide">{guide}</div>}
  </aside>
}

function SoloStatus() {
  const { scene } = useScene(), ptt = usePtt(), [, redraw] = useState(0)
  useEffect(() => { const off = onActors(() => redraw((n) => n + 1)), timer = setInterval(() => redraw((n) => n + 1), 500); return () => { off(); clearInterval(timer) } }, [])
  const cast = participants(scene)
  if (!cast.length) return null
  // the one 开播 put on the stage, else the first you play (in sight first)
  const human = cast.find((c) => c.id === faceCharacter() && !c.hidden) ?? cast.find((c) => c.lines === 'me' && !c.hidden) ?? cast.find((c) => c.lines === 'me')
  const actor = human && actors.get(human.id), track = actor?.tracking
  const label = actor?.inputPhase === 'error' ? actor.error : actor?.away ? tr("暂离中，按 B 回来") : actor?.inputPhase === 'opening' ? tr("正在连接摄像头…")
    : track ? track.face ? tr("面捕已连接") : tr("未识别到面部") : tr("画面实时更新")
  return <div className="solo-status"><span><i className={'live-dot' + (ptt.phase !== 'idle' ? ' recording' : actor?.away || (track && !track.face) ? ' waiting' : '')} />{ptt.phase === 'listening' ? tr("正在听…") : ptt.phase === 'opening' ? tr("正在打开麦克风…") : ptt.phase === 'recognizing' ? tr("正在识别…") : label}</span>
    {ptt.phase !== 'idle' ? <button onClick={ptt.phase === 'listening' ? () => void pttRelease() : pttCancel}>{ptt.phase === 'listening' ? tr("结束语音输入") : tr("取消")}</button> : track?.face && <button onClick={() => actor?.calibrate()}>{tr("校准正面")}</button>}
    {ptt.error && <span className="error">{tr(ptt.error ?? '')}</span>}</div>
}

function Transcript({ view, setView, onClose, right }: { view: 'history' | 'memory'; setView: (view: 'history' | 'memory') => void; onClose: () => void; right: number }) {
  const conv = useConversation(), { scene } = useScene()
  const end = useRef<HTMLDivElement>(null)
  const tabs = useId()
  const [source, setSource] = useState<{ sessionId: string; lineIds: string[]; text: string } | undefined>()
  const [sessions, setSessions] = useState<StoredSession[]>([])
  const [archiveError, setArchiveError] = useState('')
  const cast = participants(scene).filter((character) => character.lines === 'ai' && !character.remote)
  const profileIds = cast.map((character) => character.profileId ?? character.id)
  const names = Object.fromEntries(cast.map((character) => [character.profileId ?? character.id, character.name]))
  const profilesKey = JSON.stringify([...profileIds].sort())
  const panelScope = features.desktopConsole && !conv.running && view === 'memory' && !source ? conv.chatScope : conv.scope
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [conv.lines.length, view])
  useEffect(() => { if (view === 'history') setSource(undefined) }, [view])
  useEffect(() => setSource(undefined), [conv.sessionId, conv.scope, profilesKey])
  useEffect(() => {
    let active = true
    const refresh = () => { void memory.sessions(JSON.parse(profilesKey) as string[], conv.scope).then((values) => { if (active) { setSessions(values); setArchiveError('') } }, (error: unknown) => { if (active) setArchiveError(error instanceof Error ? error.message : String(error)) }) }
    refresh(); const off = memory.subscribe(refresh)
    return () => { active = false; off() }
  }, [profilesKey, conv.scope])
  const color = (who: string) => (scene.items.find((item) => item.id === who) as { color?: string } | undefined)?.color ?? '#7a746b'
  return <div className="card transcript chat-panel" style={{ right }} onPointerDown={(event) => event.stopPropagation()}>
      <header><div role="tablist" aria-label={tr('记录与记忆')} onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault(); event.stopPropagation()
        const next = event.key === 'Home' ? 'history' : event.key === 'End' ? 'memory' : view === 'history' ? 'memory' : 'history'
        setView(next); document.getElementById(`${tabs}-${next}`)?.focus()
      }}>{(['history', 'memory'] as const).map((tab) => <button key={tab} id={`${tabs}-${tab}`} role="tab" aria-selected={view === tab} aria-controls={`${tabs}-content`} tabIndex={view === tab ? 0 : -1} onClick={() => setView(tab)}>{tr(tab === 'history' ? '对话记录' : '记忆')}</button>)}</div><span className="chat-scope">{tr(panelScope === 'public' ? '公开记忆' : '私聊')}</span><button className="icon" data-close="true" aria-label={tr('关闭')} onClick={onClose}><X size={16} /></button></header>
      <div id={`${tabs}-content`} role="tabpanel" aria-labelledby={`${tabs}-${view}`}>
      {view === 'memory' ? <MemoryPanel embedded profileIds={profileIds} profileNames={names} scope={panelScope} source={source} /> : <>
      <div className="chat-history-controls">
        <select aria-label={tr('已保存的对话')} disabled={conv.running} value={sessions.some((session) => session.id === conv.sessionId) ? conv.sessionId : ''} onChange={(event) => void talk.openSession(event.target.value)}>
          <option value="" disabled>{tr('已保存的对话')}</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title || tr('新对话')}</option>)}
        </select>
      </div>
      <div className="lines">
        {!conv.lines.length && <p className="muted">{tr('还没有人说话')}</p>}
        {conv.lines.map((line) => <div key={line.id} className={`line${conv.speaking?.id === line.id ? ' now' : ''}${line.audience ? ' audience' : ''}`}>
          <b style={{ color: color(line.who) }}>{line.name}</b><span>{line.text}{line.cut && <small className="cut-label">{tr('（未完整说出）')}</small>}</span>
          <span className="acts">
            {!line.audience && !line.cut && conv.sessionId && <button title={tr('记住这件事')} onClick={() => { setSource({ sessionId: conv.sessionId, lineIds: [line.id], text: line.text }); setView('memory') }}>{tr('记住')}</button>}
            <button className="icon" title={tr('从这里重来：删掉这句和后面的')} disabled={conv.running} onClick={() => talk.rewind(line.id)}><RotateCcw size={13} /></button>
            <button className="icon" disabled={(conv.running && conv.mode === 'realtime')} title={tr((conv.running && conv.mode === 'realtime') ? '结束通话后可删除这句记录' : '删除这条聊天记录')} onClick={() => talk.forget(line.id)}><X size={13} /></button>
          </span>
        </div>)}
        <div ref={end} />
      </div>
      {archiveError && <p className="error" role="alert">{archiveError}</p>}
      <footer className="chat-history-footer">
        <button disabled={conv.running || !conv.lines.length} onClick={talk.redo}><RotateCcw size={14} />{tr('最后一句重说')}</button>
        <button disabled={conv.running} onClick={() => void talk.newChat()}>{tr('新对话')}</button>
        <button className="danger" disabled={!conv.lines.length} onClick={talk.clear}>{tr('清空')}</button>
      </footer>
      </>}
      </div>
    </div>
}

// ---------------------------------------------------------------- show mode, menus, AI

/** show mode's controls, for a moment after the mouse moves: the stage's start (the demo again, or the goal's), pause,
 *  stop, the recording, back to editing */
function ShowControls({ goal, partner, onStart }: { goal: Goal; partner: boolean; onStart: () => void }) {
  const conv = useConversation(), r = useRecording(), brain = useBrainConfig(), label = brain.kind === 'demo' ? '再看一次' : startLabel(goal, partner)
  const [on, setOn] = useState(true)
  useEffect(() => {
    let t = window.setTimeout(() => setOn(false), 2500)
    const wake = () => { setOn(true); clearTimeout(t); t = window.setTimeout(() => setOn(false), 2500) }
    addEventListener('pointermove', wake)
    return () => { removeEventListener('pointermove', wake); clearTimeout(t) }
  }, [])
  return (
    <div className={`show-controls${on ? ' on' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
      {label && !conv.running && <button className="primary" onClick={brain.kind === 'demo' ? () => talk.start() : onStart}><Play size={14} />{tr(label)}</button>}
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
  const heard = (c: (typeof voiced)[number]) => { const v = voiceRoute(c, speech); return !!actors.get(c.id)?.liveAudio || demo || v === 'api' || v === 'livliv' }
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
          {features.host === 'site' && <span className="chip num">{most.seconds < 60 ? tr("最长 {0} 秒", most.seconds) : tr("最长 {0} 分钟", Math.round(most.seconds / 60))}</span>}
          {features.host === 'site' && most.mark && <span className="chip">{tr("LivLiv 标记")}</span>}
        </div>
        {features.host === 'site' && most.mark && <p className="hint"><a href="/pricing" target="_blank" rel="noopener">{tr("会员录 5 分钟，没有标记")}<ExternalLink size={11} /></a></p>}
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

/** Settings for general preferences, models, voice, shortcuts and the optional livliv.ai account. */
/** returns: opened from a panel or card, so saving a form closes it and goes back there */
function SettingsCard({ onClose, onAdd, initialTab, initialModel, forStart, returns, forVoice, onContinue, onResetLayout }: { onClose: () => void; onAdd: () => void; initialTab: SettingsTab; initialModel: ModelTab; forStart: boolean; returns?: boolean; forVoice?: string; onContinue: () => void; onResetLayout: () => void }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  useEffect(() => { if (tab === 'account') void checkConnect() }, [tab])
  // providers and keys on one page (连接), and a search over every setting
  const [query, setQuery] = useState(''), [focus, setFocus] = useState<ConnectSection>(initialModel === 'chat' ? 'model' : initialModel)
  const found = query.trim() ? SETTINGS_INDEX.filter((entry) => `${tr(entry.label)} ${entry.label} ${entry.words}`.toLowerCase().includes(query.trim().toLowerCase())) : null
  return (
    <div className="card popover settings" onPointerDown={(e) => e.stopPropagation()}>
      <div className="settings-head"><header><span className="title">{tr("设置")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <input className="settings-search" type="search" value={query} placeholder={tr('搜索设置')} aria-label={tr('搜索设置')} onChange={(e) => setQuery(e.target.value)} />
      <div className="settings-tabs seg">{([{ id: 'general', label: tr("通用") }, { id: 'ai', label: tr('连接') }, { id: 'hotkeys', label: tr("全局热键") }, { id: 'account', label: tr("livliv.ai 帐号") }] as const).map((t) => <button className={`${tab === t.id ? 'on ' : ''}${t.id === 'account' ? 'account-tab' : ''}`} key={t.id} onClick={() => setTab(t.id)}>{t.id === 'account' && <Sparkles size={13} />}{t.label}</button>)}</div>
      </div><div className="settings-body">
      {found && <div className="settings-found">{found.length ? found.map((entry) => <button key={entry.label} className="item" onClick={() => { setTab(entry.tab); if (entry.section) setFocus(entry.section); setQuery('') }}><b>{tr(entry.label)}</b><span>{tr(({ general: '通用', ai: '连接', hotkeys: '全局热键', account: 'livliv.ai 帐号' } as const)[entry.tab])}</span></button>) : <p className="hint">{tr('没有找到')}</p>}</div>}
      {!found && <>
      {tab === 'general' && <GeneralPanel onResetLayout={onResetLayout} />}
      {tab === 'hotkeys' && <HotkeysPanel />}
      {tab === 'ai' && <Connections key={focus} focus={focus} forStart={forStart} forVoice={forVoice} onAccount={() => setTab('account')} onContinue={onContinue} onDone={forStart || returns ? onClose : undefined} />}
      {tab === 'account' && <AccountPanel onAdd={onAdd} />}
      </>}
      </div>
    </div>
  )
}
