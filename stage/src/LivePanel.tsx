// 直播间: in the desktop app the game the characters play while live (set before the start), and while live how it
// goes (what it is doing, how much is left, the viewers' messages, the game's state and a task for it). Starting, the
// limits and choosing Twitch are the start options' (shell/StartBar.tsx); pausing and ending, the console's.
import { tr } from './i18n'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useBrainConfig } from './brain'
import { airiGameError } from './airiEngine'
import { airiFits, chooseEngine } from './brains/select'
import { liveModelName, talk, useConversation } from './conversation'
import { participants, useScene } from './scene'
import { voiceRoute, useActiveSpeech } from './voiceApi'
import { desktop } from './desktopBridge'
import { features } from './core/platform'
import { AudiencePanel } from './AudiencePanel'
import { liveGame, liveSetup, useLiveSetup } from './shell/liveSetup'

export function LivePanel({ onClose }: { onClose: () => void }) {
  const { scene } = useScene(), state = useConversation(), model = useBrainConfig(), speech = useActiveSpeech(), setup = useLiveSetup()
  const [, redraw] = useState(0)
  useEffect(() => { const timer = setInterval(() => redraw((n) => n + 1), 1000); return () => clearInterval(timer) }, [])
  const [windows, setWindows] = useState<{ id: string; name: string }[] | null>(null)
  const [visionError, setVisionError] = useState('')
  const [bridgeName, setBridgeName] = useState('')
  const [instruction, setInstruction] = useState(''), [actionError, setActionError] = useState('')
  // another model: the window list and the choice are asked again (the model may not see pictures)
  const seen = useRef(model)
  useEffect(() => { if (seen.current === model) return; seen.current = model; setWindows(null); liveSetup.set({ windowId: '' }); setVisionError('') }, [model])
  const cast = participants(scene).filter((c) => c.lines === 'ai')
  const active = state.running && state.mode === 'live'
  const { needsAiri } = liveGame(setup), game = setup.game
  const textOnly = cast.some((c) => !c.muted && voiceRoute(c, speech) === 'none')
  // AIRI or not: the one rule (brains/select.ts); a game or a window asks for it whatever the switch says
  const engine = chooseEngine(model, cast, { kind: 'live', textOnly, needsAiri }, features)
  const compatibleModel = airiFits(engine)
  const chooseBridge = async () => {
    setActionError('')
    try { const name = await desktop?.airiGame?.selectBridge(); if (name) setBridgeName(name) }
    catch (error) { setActionError(airiGameError(error)) }
  }
  const sendTask = async () => {
    if (!instruction.trim()) return
    setActionError('')
    try { await talk.playGame(instruction); setInstruction('') }
    catch (error) { setActionError(airiGameError(error)) }
  }
  const cancelTask = async () => {
    setActionError('')
    try { await talk.cancelGame() }
    catch (error) { setActionError(airiGameError(error)) }
  }
  const loadWindows = async () => {
    const vision = desktop?.vision
    if (!vision) return
    setVisionError('')
    try {
      const found = await vision.list()
      setWindows(found)
      if (!found.some(({ id }) => id === setup.windowId)) liveSetup.set({ windowId: '' })
      if (!found.length) setVisionError(tr('没有可用窗口，请打开游戏并检查屏幕录制权限'))
    } catch {
      setVisionError(tr('无法读取窗口，请检查屏幕录制权限'))
    }
  }
  const remaining = Math.max(0, Math.ceil((state.until - Date.now()) / 60_000))
  const retryIn = Math.ceil((state.retryAt - Date.now()) / 1000)
  const status = state.paused ? tr("已暂停 · 当前句说完后等待") : state.speaking ? tr("正在回应观众") : retryIn > 0 ? tr("出错了，{0} 秒后重试", retryIn) : state.waitingAudience ? tr("等待新弹幕") : tr("正在准备回应…")
  const pinnedModel = active ? liveModelName() : undefined
  return <div className={`card popover live-settings${features.desktopConsole ? ' desktop-live-settings' : ''}`} role="dialog" aria-label={tr('直播间')} onPointerDown={(e) => e.stopPropagation()}>
    <header><span className="title">{tr('直播间')}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
    {features.vision && !state.running && <section className="section live-game">
      {features.games && <label className="field"><span>{tr('游戏连接')}</span><select value={game} onChange={(e) => { liveSetup.set({ game: e.target.value as typeof game, windowId: '' }); setVisionError(''); setActionError('') }}>
        <option value="window">{tr('不连接游戏')}</option>
        <option value="minecraft">Minecraft / Fabric</option>
        <option value="factorio">Factorio / Autorio</option>
      </select></label>}
      {needsAiri && !compatibleModel && <p className="hint">{tr('内置 AIRI 需要一个本地 AI 角色和流式模型接口')}</p>}
      {game === 'minecraft' && <div>
        <p className="hint">{tr('先启动 Airicraft 并进入 Minecraft 世界。')}</p>
        <label className="switch"><span>{tr('发送 Minecraft 画面给模型')}</span><input type="checkbox" checked={setup.minecraftVision} onChange={(e) => liveSetup.set({ minecraftVision: e.target.checked, ...(e.target.checked ? { windowId: '' } : {}) })} /><i /></label>
        <button className="link" onClick={() => void chooseBridge()}>{tr('选择 Airicraft 连接文件')}</button>
        {bridgeName && <span className="hint"> {bridgeName}</span>}
      </div>}
      {game === 'factorio' && <div>
        <p className="hint">{tr('两个端口应连接同一个运行 Autorio 的存档。')}</p>
        <div className="live-limits">
          <label className="field"><span>{tr('日志端口')}</span><input type="number" min={1} max={65535} value={setup.eventsPort} onChange={(e) => liveSetup.set({ eventsPort: e.target.value })} /></label>
          <label className="field"><span>{tr('RCON API 端口')}</span><input type="number" min={1} max={65535} value={setup.rconPort} onChange={(e) => liveSetup.set({ rconPort: e.target.value })} /></label>
        </div>
      </div>}
      {compatibleModel && (game !== 'minecraft' || !setup.minecraftVision) && <div>
        <button className="link" onClick={() => void loadWindows()}>{tr(windows ? '刷新窗口列表' : '选择游戏窗口')}</button>
        {windows?.length ? <label className="field"><span>{tr('游戏画面')}</span><select value={setup.windowId} onChange={(e) => liveSetup.set({ windowId: e.target.value })}>
          <option value="">{tr('关闭画面输入')}</option>
          {windows.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select></label> : null}
        {setup.windowId && <p className="hint">{tr('回应时会把所选窗口的一帧画面发给当前模型。')}</p>}
        {visionError && <p className="hint error" role="alert">{visionError}</p>}
      </div>}
    </section>}
    {state.running && !active && <p className="hint">{tr('请先停止当前会话')}</p>}
    {active && state.game && <section className="section airi-game-status">
      <h3>{state.game.name === 'minecraft' ? 'Minecraft' : 'Factorio'}</h3>
      <p role="status">{tr({ connecting: '正在连接游戏', ready: '游戏已连接', submitting: 'AIRI 正在选择游戏动作', playing: '游戏正在执行任务', offline: '游戏连接已断开' }[state.game.status])}</p>
      {state.game.text && <p className="hint">{state.game.text}</p>}
      {state.game.name === 'minecraft' && state.game.status === 'playing' && <button onClick={() => void cancelTask()}>{tr('停止游戏任务')}</button>}
      {state.game.status === 'ready' && <div className="row">
        <input aria-label={tr('游戏指令')} placeholder={tr('给角色一个游戏任务')} value={instruction}
          onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void sendTask() }} />
        <button disabled={state.paused || !instruction.trim()} onClick={() => void sendTask()}>{tr('执行')}</button>
      </div>}
    </section>}
    {/* the viewers' messages: while live, and for a stage you perform alone (no start options there) */}
    {(active || !cast.length) && <AudiencePanel />}
    {active && <section className="section">
      <h3>{tr("本次会话")}</h3>
      <p className="live-status" role="status">{status}</p>
      <p className="hint num">{pinnedModel ? 'AIRI · ' + pinnedModel + ' · ' : ''}{tr("已生成")} {state.generations} / {state.generationLimit} {tr("次 · 剩余约")} {remaining} {tr("分钟")}</p>
    </section>}
    {state.mode === 'live' && !state.running && state.ended && <p className="hint" role="status">{tr(state.ended ?? '')}</p>}
    {state.mode === 'live' && state.error && <p className="hint error" role="alert">{tr(state.error ?? '')}</p>}
    {actionError && <p className="hint error" role="alert">{actionError}</p>}
  </div>
}
