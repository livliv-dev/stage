import { tr } from './i18n'
// livliv.ai/stage's first visit. On a computer: three featured characters already stand on the stage, one button plays
// their 52-second conversation (recorded voices, subtitles), and three ways in that need no account and no key to try:
// the camera, your own model's key, your own character. On a phone: the same conversation to watch, and the rest on
// a computer (the editor needs room, a camera and keys).
import { useState } from 'react'
import { Camera, Check, Copy, KeyRound, LoaderCircle, Pause, Play, Square, UserPlus, X } from 'lucide-react'
import { talk, useConversation } from './conversation'
import { openCreate } from './livliv'

const CAST = ['d03ft', 'k01', 'v04']
const avatar = (id: string) => `${import.meta.env.BASE_URL}characters/${id}/avatar.webp`

function DemoButton({ onDemo }: { onDemo: () => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const play = async () => { setBusy(true); setError(''); try { await onDemo() } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  return <>
    <button className="welcome-demo" disabled={busy} onClick={() => void play()}>
      <span className="welcome-cast" aria-hidden="true">{CAST.map((id) => <img key={id} src={avatar(id)} alt="" />)}</span>
      <span className="welcome-demo-copy"><b>{tr('Nana、Sena 与 Kai 的三人对谈')}</b><span>{tr('52 秒，角色自己的声音、动作和字幕')}</span></span>
      <span className="welcome-play">{busy ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{tr('看演示')}</span>
    </button>
    {error && <p className="hint error" role="alert">{error}</p>}
  </>
}

/** a computer's first visit: over the stage, until one of its ways is taken or it is closed */
export function SiteWelcome({ onDemo, onCamera, onModel, onCharacter, onClose }: {
  onDemo: () => Promise<void>; onCamera: () => void; onModel: () => void; onCharacter: () => void; onClose: () => void
}) {
  const ways = [
    { icon: Camera, title: '用摄像头试', hint: '你的表情带动角色，不用账号', act: onCamera },
    { icon: KeyRound, title: '接自己的模型', hint: '填上你的密钥，让角色们自己聊', act: onModel },
    { icon: UserPlus, title: '放自己的角色', hint: 'livliv.ai 的角色、VRM 或 PNG 立绘', act: onCharacter },
  ]
  return <div className="site-welcome card" role="dialog" aria-label={tr('欢迎来到 LivLiv Stage')} onPointerDown={(e) => e.stopPropagation()}>
    <button className="icon close" aria-label={tr('关闭')} onClick={onClose}><X size={16} /></button>
    <p className="big">{tr('很多角色，同一个舞台')}</p>
    <p className="hint">{tr('面捕、角色对谈、录制和 OBS 输出，在浏览器里就能用。')}</p>
    <DemoButton onDemo={onDemo} />
    <div className="site-ways">
      {ways.map((w) => <button key={w.title} className="workflow-tile" onClick={w.act}><w.icon size={18} /><b>{tr(w.title)}</b><span>{tr(w.hint)}</span></button>)}
    </div>
  </div>
}

/** a phone: the conversation to watch; the editor on a computer */
export function PhoneIntro({ onDemo }: { onDemo: () => Promise<void> }) {
  const conv = useConversation()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.origin + location.pathname); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* the address bar has it */ }
  }
  if (conv.running) return <div className="phone-intro running" onPointerDown={(e) => e.stopPropagation()}>
    {conv.paused ? <button onClick={talk.resume}><Play size={14} />{tr('继续')}</button> : <button onClick={talk.pause}><Pause size={14} />{tr('暂停')}</button>}
    <button className="icon" aria-label={tr('停止')} onClick={talk.stop}><Square size={14} /></button>
  </div>
  return <div className="phone-intro card" onPointerDown={(e) => e.stopPropagation()}>
    <img className="phone-mark" src={`${import.meta.env.BASE_URL}wordmark.svg`} alt="LivLiv Stage" />
    <p className="hint">{tr('多个角色同台：面捕、角色对谈、录制和 OBS 输出。')}</p>
    <DemoButton onDemo={onDemo} />
    <p className="hint">{tr('编辑、摄像头和接模型，请在电脑上打开这个页面。')}</p>
    <button onClick={() => void copy()}>{copied ? <Check size={14} /> : <Copy size={14} />}{tr(copied ? '已复制' : '复制链接')}</button>
    {/* making a character works on a phone too: the site's own page */}
    <button className="link" onClick={openCreate}>{tr('在 livliv.ai 创建新角色')}</button>
  </div>
}
