// Settings → 连接: every provider and key in one place. livliv.ai first: one switch, its text and its voices (with
// speech recognition) each on or off below it, paid with points. Then your own services: the text model, the voices and
// speech recognition (which use the model's key wherever its service has them: 一个密钥用于全部), each folded to one line
// while livliv.ai covers it (what was saved there stays); and the realtime call, folded, always your own key. Each with
// its own test. Keys stay on this computer. A character's voice is chosen on its card.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, ExternalLink, LoaderCircle } from 'lucide-react'
import { tr } from '../i18n'
import { setLivLiv, useBrainConfig, useLivLiv, wantLivLiv } from '../brain'
import { features } from '../core/platform'
import { cancelConnect, connect, openConnect, signedIn, useAccount } from '../livliv'
import { saveSpeech, SPEECH_UNSET, speechOfModel, useSpeech } from '../voiceApi'
import { RealtimeModelForm } from '../RealtimeModelForm'
import { ModelForm, SpeechForm } from './ConnectForms'

export type ConnectSection = 'livliv' | 'model' | 'speech' | 'realtime'

export function Connections({ focus, forStart, forVoice, onAccount, onContinue, onDone }: { focus?: ConnectSection; forStart?: boolean; forVoice?: string; onAccount: () => void; onContinue: () => void; onDone?: () => void }) {
  const chat = useBrainConfig(), speech = useSpeech(), shareable = speechOfModel(chat), livliv = useLivLiv()
  // the speech API follows the model's key until one of its own is chosen (SpeechForm saves it)
  const [own, setOwn] = useState(!!speech.provider), shared = !!shareable && !own && !speech.provider
  const [realtimeOpen, setRealtimeOpen] = useState(focus === 'realtime')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { if (focus && focus !== 'model' && focus !== 'livliv') box.current?.querySelector(`[data-section="${focus}"]`)?.scrollIntoView({ block: 'start' }) }, [focus])
  return <div className="connections" ref={box}>
    {features.points && <LivLivSection forStart={forStart} onContinue={onContinue} onDone={onDone} />}
    <Covered section="model" title="文字模型" hint="所有角色共用" covered={livliv.text} open={focus === 'model' && !!forStart}>
      <ModelForm forStart={forStart} done={onDone} onContinue={onContinue} demoDone={onDone} onAccount={onAccount} noDemo />
    </Covered>
    <Covered section="speech" title="声音与语音识别" hint="音色在角色卡里选" covered={livliv.voice} open={focus === 'speech' || !!forVoice}>
      {shareable && <label className="switch"><span>{tr('一个密钥用于全部')}</span>
        <input type="checkbox" checked={shared} onChange={(e) => { if (e.target.checked) { saveSpeech(SPEECH_UNSET); setOwn(false) } else setOwn(true) }} /><i /></label>}
      {!shared && <SpeechForm forCharacter={forVoice} onDone={() => onDone?.()} />}
    </Covered>
    <section className="connect-section" data-section="realtime">
      <button className="fold" aria-expanded={realtimeOpen} onClick={() => setRealtimeOpen((open) => !open)}><ChevronRight size={14} className={realtimeOpen ? 'open' : ''} /><h3>{tr('实时通话')}</h3></button>
      <p className="hint">{tr('需要 OpenAI 或阿里云百炼密钥')}</p>
      {realtimeOpen && <RealtimeModelForm onSaved={onDone} />}
    </section>
  </div>
}

/** one of your own services: open, or while livliv.ai covers it one line that opens it (what is saved there is kept) */
function Covered({ section, title, hint, covered, open, children }: { section: ConnectSection; title: string; hint?: string; covered: boolean; open: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(open)
  if (!covered) return <section className="connect-section" data-section={section}>
    <h3>{tr(title)}</h3>{hint && <p className="hint">{tr(hint)}</p>}
    {children}
  </section>
  return <section className="connect-section covered" data-section={section}>
    <button className="fold" aria-expanded={shown} onClick={() => setShown((value) => !value)}><ChevronRight size={14} className={shown ? 'open' : ''} /><h3>{tr(title)}</h3><span className="hint">{tr('由 livliv.ai 提供')}</span></button>
    {shown && children}
  </section>
}

/** 用 livliv.ai: one switch, the balance beside it once signed in; on, its two parts. Turned on signed out, the sign-in
 *  starts here (a code in the desktop app, the site's page on livliv.ai) and it comes on once that succeeds */
function LivLivSection({ forStart, onContinue, onDone }: { forStart?: boolean; onContinue: () => void; onDone?: () => void }) {
  const account = useAccount(), livliv = useLivLiv(), on = livliv.text || livliv.voice
  const [waiting, setWaiting] = useState(false)
  const turn = async (want: boolean) => {
    if (!want) { wantLivLiv(false); setLivLiv({ text: false, voice: false }); return }
    if (account.status === 'in') { setLivLiv({ text: true, voice: true }); return }
    wantLivLiv(true); setWaiting(true)
    // the site's own sign-in leaves this page: the wish waits for its return
    try { await connect() } finally { setWaiting(false); if (features.host !== 'site' && !signedIn()) wantLivLiv(false) }
  }
  // both parts off: livliv.ai is off
  const part = (p: 'text' | 'voice', value: boolean) => setLivLiv({ ...livliv.chosen, [p]: value })
  return <section className="connect-section livliv" data-section="livliv">
    <label className="switch main"><span>{tr('用 livliv.ai')}<small className="hint">{tr('按积分')}</small></span>
      {account.status === 'in' && <b className="balance num">{tr('{0} 积分', account.points)}</b>}
      <input type="checkbox" checked={on} disabled={waiting && !account.connect} onChange={(e) => void turn(e.target.checked)} /><i /></label>
    {account.connect && <div className="connect-wait">
      <p className="hint"><LoaderCircle className="spin" size={12} /> {tr('在浏览器完成登录')} · <strong className="num">{account.connect.code}</strong></p>
      <div className="row"><button onClick={openConnect}><ExternalLink size={14} />{tr('再打开网页')}</button><button onClick={() => { wantLivLiv(false); cancelConnect() }}>{tr('取消')}</button></div>
    </div>}
    {account.status === 'out' && account.error && !account.closed && <p className="hint error" role="alert">{tr(account.error)}</p>}
    {on && <div className="livliv-parts">
      <label className="switch"><span>{tr('文字')}</span><input type="checkbox" checked={livliv.chosen.text} onChange={(e) => part('text', e.target.checked)} /><i /></label>
      <label className="switch"><span>{tr('声音')}<small className="hint">{tr('可以在角色卡里单独设置')}</small></span><input type="checkbox" checked={livliv.chosen.voice} onChange={(e) => part('voice', e.target.checked)} /><i /></label>
    </div>}
    {forStart && livliv.text && <div className="row end"><button className="primary" onClick={() => { onDone?.(); onContinue() }}>{tr('开始')}</button></div>}
  </section>
}

/** what the settings search finds: each setting by the words people look for it with, and the tab it is on */
export const SETTINGS_INDEX: { label: string; words: string; tab: 'general' | 'ai' | 'hotkeys' | 'account'; section?: ConnectSection }[] = [
  { label: '用 livliv.ai', words: 'livliv 积分 points 声音 文字 语音识别', tab: 'ai', section: 'livliv' },
  { label: '文字模型', words: '模型 密钥 key api openai deepseek qwen 百炼 ollama model', tab: 'ai', section: 'model' },
  { label: '声音与语音识别', words: '声音 配音 音色 语音 识别 tts asr voice speech', tab: 'ai', section: 'speech' },
  { label: '一个密钥用于全部', words: '密钥 共用 key', tab: 'ai', section: 'speech' },
  { label: '实时通话', words: '实时 通话 realtime 语音通话', tab: 'ai', section: 'realtime' },
  { label: '界面语言', words: '语言 language 中文 english 日本語', tab: 'general' },
  { label: '画面质量', words: '画质 质量 quality', tab: 'general' },
  { label: '手机与网络追踪', words: '手机 vmc 面捕 追踪 iphone tracking', tab: 'general' },
  { label: '控制接口', words: 'api 接口 控制 streamdeck', tab: 'general' },
  { label: 'Neuro 游戏', words: 'neuro 游戏 game', tab: 'general' },
  { label: '恢复默认设置', words: '重置 恢复 reset', tab: 'general' },
  { label: '全局热键', words: '热键 快捷键 hotkey', tab: 'hotkeys' },
  { label: 'livliv.ai 帐号', words: '帐号 账号 登录 积分 livliv account', tab: 'account' },
]
