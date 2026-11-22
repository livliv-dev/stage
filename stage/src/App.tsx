// LivLiv Stage. Edit mode: the top bar (name, edit / show, undo, templates, files, AI), the tools on the left (add
// things), the panel on the right (the selected item; with nothing selected, the stage and its layers), at the bottom
// the cast (who is in the conversation, and in what state) over the console (topic, run, your line). ⌘\ folds the
// right panel away. Show mode: only the stage; moving the mouse brings back a small control bar for a moment.
// The parts live in shell/ (TopBar, Rail, Cast, Console, the cards); which card is open is the ui store's (shell/ui.ts).
import { keysOf } from './core/prefs'
import { useEffect, useRef, useState } from 'react'
import { playDemo } from './brain'
import { talk, useConversation } from './conversation'
import { Panel, PanelTab } from './Inspector'
import { characters, hadSaved, participants, store, useScene, type Goal } from './scene'
import { Stage, type Insets, type MenuAt, type Zoom } from './Stage'
import { OutputPanel } from './OutputPanel'
import { LivePanel } from './LivePanel'
import { RealtimePanel } from './RealtimePanel'
import { CollabPanel } from './CollabPanel'
import { connectDesktop } from './desktop'
import { ageGate, refresh, setAge } from './livliv'
import { cancel as pttCancel, holdKey } from './ptt'
import { buildTemplate, TEMPLATES, type TemplateId } from './templates'
import { demoFor } from './demo'
import { connectNetworkTracking } from './networkTracking'
import { connectAudienceActions } from './audienceControl'
import { MixerPanel } from './MixerPanel'
import { tr, useLocale } from './i18n'
import { small } from './host'
import { features } from './core/platform'
import { linkedAs, linkedId, openLinked } from './entry'
import { PhoneIntro } from './SiteIntro'
import { closeGuestGate, GuestGate, useGuestGate } from './GuestGate'
import { closeDesktopNotice, DesktopNotice, showDesktopNotice, unseen, useDesktopNotice } from './DesktopNotice'
import { beginDemo, ensureTrio } from './shell/demoStart'
import { StartPage } from './shell/StartPage'
import { Checklist, type Fix } from './shell/Checklist'
import { StartOptionsCard } from './shell/StartBar'
import { Console } from './shell/Console'
import { useChecks } from './shell/useChecks'
import { GOAL_TEMPLATE, GOALS, goalOf, goalOptions, optionsOf, startLabel } from './shell/goals'
import { paidHearing, startGoal, startGoesOut } from './shell/start'
import { endLive } from './shell/liveSetup'
import { showCardPage } from './shell/cardPage'
import { connectCharacterKeys } from './characterKeys'
import { connectOutputFeed } from './outputFeed'
import { GoLiveGuide } from './GoLive'
import { connectNeuro } from './neuroBridge'
import { ui, useUi } from './shell/ui'
import { useNarrow, useShortcuts } from './shell/hooks'
import { TopBar } from './shell/TopBar'
import { Rail, AddCharacter } from './shell/Rail'
import { Cast, SoloStatus } from './shell/Cast'
import { Transcript } from './shell/Transcript'
import { ShowControls } from './shell/ShowControls'
import { RecordCard } from './shell/RecordCard'
import { AgeDialog, ContextMenu, CrowdNotice, Help, Kept } from './shell/Overlays'
import { SettingsCard } from './shell/SettingsCard'
import './chat.css'
import './shell/shell.css'

const FOLDED = 'livliv-stage:panel-folded'

export default function App() {
  useLocale()
  const { mode, scene } = useScene()
  const hasAI = participants(scene).some((c) => c.lines === 'ai')
  const { pop, settingsTab, settingsModel, forStart, voiceSetup, back, detourBack, log, logView, castOpen, note } = useUi()
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
    for (const key of keysOf(['layout'])) localStorage.removeItem(key)
    setBareNow(false); setLeftFolded(false); setZoom('fit')
  }
  const [menu, setMenu] = useState<MenuAt | null>(null)
  // livliv.ai/stage: a phone gets the demo to watch; a computer's first visit gets the demo's three on the stage and the
  // start page over them (none for a link to a character, which opens that one instead)
  const phone = features.host === 'site' && small()
  const firstVisit = features.host === 'site' && !phone && !hadSaved && !linkedId()
  // the site's 开播 (?c=<id>&as=face): its card, where the first-visit checklist goes
  const [goLive, setGoLive] = useState<string | null>(null)
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
      if (note) ui.say(note)
      if (character && as === 'face') { setGoLive(character); setLeftFolded(false) }
      if (character && as === 'ai') { store.setTalk({ goal: 'live', ...goalOptions('live', false) }); ui.setPop('checklist') }
    })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  // on the site, signing in or out happens on its own pages, maybe in another tab: asked again when this one is back
  useEffect(() => { if (!(features.host === 'site')) return; const again = () => void refresh(); addEventListener('focus', again); return () => removeEventListener('focus', again) }, [])
  useEffect(() => { if (phone && mode !== 'show') store.setMode('show') }, [phone, mode])
  useEffect(() => { if (firstVisit) ui.setPop('start') }, [])  // eslint-disable-line react-hooks/exhaustive-deps
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
  // livliv.ai/stage: a visitor not signed in is asked to after three minutes (GuestGate.tsx)
  const gated = useGuestGate()
  // livliv.ai/stage in a browser on a computer, the first time: what the desktop app adds, once the start page is closed
  // (the first visit's, or an empty stage's) and nothing plays, never with the sign-in prompt, a card or the age question
  // (DesktopNotice.tsx). Not in the desktop app showing the site (it is the desktop app), and once closed, never again
  const notice = useDesktopNotice()
  const [noticeDue, setNoticeDue] = useState(() => features.host === 'site' && !features.shell && !phone && !navigator.userAgent.includes('OBS/') && unseen())
  // a first visit's start page opens after the first render: the notice waits for it to have opened and closed
  const [startSeen, setStartSeen] = useState(!firstVisit)
  useEffect(() => { if (pop === 'start') setStartSeen(true) }, [pop])
  const staged = scene.items.length > 0  // an empty stage shows the start page in its place
  useEffect(() => {
    if (noticeDue && unseen() && startSeen && staged && !pop && !gated && !ageAsk && !conv.running && mode === 'edit') { setNoticeDue(false); showDesktopNotice() }
  }, [noticeDue, startSeen, staged, pop, gated, ageAsk, conv.running, mode])
  const noticeShown = notice && staged && !pop && !gated && !ageAsk
  useEffect(() => {
    if (!conv.needModel) return
    talk.modelAsked(); store.setMode('edit'); ui.openModels('chat', conv.modelIntent !== 'input')
  }, [conv.needModel])
  const continueAfterModel = () => {
    if (conv.modelIntent === 'chat') void talk.startChat().catch(() => {})
    else if (conv.modelIntent === 'live') startNow()
    else if (conv.modelIntent === 'conversation') talk.start()
  }
  // a live session ended: its game and window are not carried into the next
  const wasLive = useRef(false)
  useEffect(() => { const live = conv.running && conv.mode === 'live'; if (wasLive.current && !live) endLive(); wasLive.current = live }, [conv.running, conv.mode])
  const show = mode === 'show'
  // a phone or a narrow window: the stage full width, the console under it, cards over it
  const narrow = useNarrow()
  // what the stage is for (its goal), whether you play with an AI partner, and its 准备清单
  const ai = participants(scene).filter((c) => c.lines === 'ai' && !c.remote)
  const goal: Goal = goalOf(scene.talk, hasAI)
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
    ui.setPop('checklist')
  }
  const startNow = (firstLine = '') => { ui.setPop(null); void startGoal(goal, optionsOf(scene.talk, goal, partner), firstLine).catch((error: Error) => ui.say(error.message)) }
  // after the demo, the same characters with a model of one's own: they talk among themselves (和角色聊天, you only
  // watching), and the checklist says what is still needed
  const ownModel = () => { playDemo(false); store.setTalk({ goal: 'chat', audience: 'me', you: 'none' }); ui.setPop('checklist') }
  // a phone: a character chosen closes the cast sheet (its card opens instead)
  const selectedId = store.selected()
  useEffect(() => { if (selectedId) ui.set({ castOpen: false }) }, [selectedId])
  const fix = (target: Fix) => {
    const select = (who: 'ai' | 'me') => { const c = participants(store.get()).find((x) => x.lines === who && !x.remote) ?? participants(store.get())[0]; if (c) store.select(c.id); setBare(false) }
    if (target === 'connect:model') ui.openModels('chat', false, 'checklist')
    else if (target === 'connect:speech') ui.openModels('speech', false, 'checklist')
    else if (target === 'connect:realtime') ui.openModels('realtime', false, 'checklist')
    // 实时通话 set up: its own card, where the call starts
    else if (target === 'realtime') { if (checks.find((c) => c.id === 'realtime')?.state === 'ok') ui.setPop('realtime'); else ui.openModels('realtime', false, 'checklist') }
    else if (target === 'live-room') ui.detour('live')
    else if (target === 'character:who') { select('me'); showCardPage('who') }
    else if (target === 'character:voice') { select('ai'); showCardPage('persona') }
    else if (target === 'options') ui.detour('start-options')
    else ui.set({ settingsTab: 'general', pop: 'settings' })
  }
  useShortcuts({
    escape: () => { if (gated) closeGuestGate(); else if (menu) setMenu(null); else if (pop) ui.set({ forStart: false, pop: null }); else if (noticeShown) closeDesktopNotice(); else if (store.selected()) store.select(null); else if (store.mode() === 'show' && !phone) store.setMode('edit') },
    help: () => ui.toggle('help'),
    zoom: setZoom,
    bare: () => setBare((b) => !b),
    say: ui.say,
    // a key starts nothing that goes out (it opens the checklist) and no speech recognition paid with points
    start: () => { const options = optionsOf(scene.talk, goal, partner); if (startGoesOut(goal, options)) ui.setPop('checklist'); else if (paidHearing(options)) ui.say(tr('用积分识别语音时，请点按钮开始')); else startNow() },
  })
  // the stage's room: the same whatever is open (only ⌘\ changes it)
  // a phone: the stage above the intro card at the bottom
  const insets: Insets = narrow && !show ? { top: 56, right: 8, bottom: 150, left: 8 } : show ? (phone ? { top: 12, right: 8, bottom: 360, left: 8 } : { top: 0, right: 0, bottom: 0, left: 0 }) : { top: 56, right: bare ? 80 : 312, bottom: hasAI ? 124 : 76, left: leftFolded ? 80 : 220 }
  const template = async (id: TemplateId) => {
    ui.setPop(null)
    // no question first: it can be undone, and the note says how
    try {
      const had = store.get().items.length > 0
      pttCancel(); talk.detach(); playDemo(false); store.replace(await buildTemplate(id)); store.select(characters(store.get())[0]?.id ?? null)  // a new scene starts a new conversation
      if (had) ui.say(tr("已换成「{0}」，⌘Z 可以换回来", tr(TEMPLATES.find((t) => t.id === id)!.label)))
    } catch (e) { ui.say((e as Error).message) }
  }
  const kept = ui.kept
  return (
    <div className={`app ${mode}${bare ? ' panels-folded' : ''}${hasAI ? '' : ' solo-mode'}${leftFolded ? ' tools-folded' : ''} next${narrow ? ' narrow' : ''}${narrow && castOpen ? ' cast-open' : ''}${store.selected() ? ' selected' : ''}`} onPointerDown={() => setMenu(null)}>
      <Stage insets={insets} onMenu={setMenu} zoom={zoom} setZoom={setZoom} empty={narrow ? null : <StartPage onGoal={(g, p) => void pickGoal(g, p)} onTemplate={template} onAdd={() => ui.setPop('add')} />} />
      {show ? (phone ? <PhoneIntro onDemo={() => beginDemo()} /> : <ShowControls goal={goal} partner={partner} onStart={startNow} />) : <>
        <TopBar onTemplate={template} />
        <CrowdNotice insets={insets} />
        {noticeShown && <DesktopNotice />}
        <Rail folded={leftFolded} onFold={foldLeft} />
        {((pop === 'start' && scene.items.length > 0) || (narrow && !scene.items.length && !pop)) && <div className="start-overlay"><StartPage onGoal={(g, p) => void pickGoal(g, p)} onTemplate={template} onAdd={() => ui.setPop('add')} onClose={() => ui.setPop(null)} /></div>}
        {bare ? <PanelTab onOpen={() => setBare(false)} /> : <Panel onFold={() => setBare(true)} onAccount={ui.openAccount} onVoice={(id) => ui.openModels('speech', false, null, id)} />}
        {(!leftFolded || narrow) && <Cast onFriend={features.collab ? () => ui.toggle('collab') : undefined} friendOn={pop === 'collab'} guide={goLive ? <GoLiveGuide id={goLive} onClose={() => setGoLive(null)} /> : null} />}
        {(goal === 'perform' && !partner) || !ai.length ? <><SoloStatus />{pop !== 'checklist' && scene.items.some((i) => i.kind === 'character') && <button className="st-tag solo-checks" onClick={() => ui.setPop('checklist')}>{tr('准备清单')}</button>}</>
          : <Console goal={goal} partner={partner} checks={checks} optionsOpen={pop === 'start-options'} onOptions={() => ui.toggle('start-options')} onChecklist={() => ui.toggle('checklist')} onStart={startNow} onOwnModel={ownModel}
            onModel={() => ui.openModels('chat')} onVoice={() => fix('character:voice')} onRoom={() => ui.toggle('live')} onRealtime={() => ui.toggle('realtime')}
            onLog={() => ui.set((now) => ({ log: !now.log || now.logView === 'memory', logView: 'history' }))} onMemory={() => ui.set({ logView: 'memory', log: true })} />}
        {pop === 'checklist' && <Checklist goal={goal} partner={partner} startLabel={startLabel(goal, partner, optionsOf(scene.talk, goal, partner))} onStart={startNow} onFix={fix} onClose={() => ui.setPop(null)} />}
        {pop === 'start-options' && <StartOptionsCard goal={goal} partner={partner} onClose={() => ui.setPop(detourBack)} />}
        {kept('mixer') && <Kept on={pop === 'mixer'}><MixerPanel onClose={() => ui.setPop(null)} onSettings={() => ui.openModels('speech', false, 'mixer')} /></Kept>}
        {kept('collab') && <Kept on={pop === 'collab'}><CollabPanel onClose={() => ui.setPop(null)} onSettings={() => ui.openModels('speech', false, 'collab')} /></Kept>}
        {kept('live') && <Kept on={pop === 'live'}><LivePanel onClose={() => ui.setPop(detourBack)} /></Kept>}
        {pop === 'realtime' && <RealtimePanel onClose={() => ui.setPop(null)} onSettings={() => ui.openModels('realtime', false, 'realtime')} />}
        {log && <Transcript view={logView} setView={(view) => ui.set({ logView: view })} onClose={() => ui.set({ log: false })} right={bare ? 80 : 324} />}
        {pop === 'add' && <AddCharacter left={228} onClose={() => ui.setPop(null)} onSignIn={() => ui.set({ settingsTab: 'account', pop: 'settings' })} />}
        {pop === 'settings' && <><div className="scrim" onPointerDown={ui.closeSettings} /><SettingsCard key={voiceSetup ?? 'settings'} forVoice={voiceSetup} initialTab={settingsTab} initialModel={settingsModel} forStart={forStart} returns={back !== null} onContinue={continueAfterModel} onResetLayout={resetLayout} onAdd={() => ui.set({ forStart: false, pop: 'add' })} onDesktop={() => { ui.set({ forStart: false, settingsTab: 'general', back: null, pop: null }); showDesktopNotice() }} onClose={ui.closeSettings} /></>}
        {kept('record') && <Kept on={pop === 'record'}><RecordCard onClose={() => ui.setPop(null)} onVoices={() => ui.openModels('speech', false, 'record')} /></Kept>}
        <OutputPanel open={pop === 'output'} onClose={() => ui.setPop(null)} />
        {pop === 'help' && <Help onClose={() => ui.setPop(null)} />}
        {menu && <ContextMenu at={menu} close={() => setMenu(null)} />}

      </>}
      {ageAsk && <AgeDialog onAnswer={(adult) => void answerAge(adult)} />}
      <GuestGate shown={gated} />
      {note && <div className="toast">{note}</div>}
    </div>
  )
}
