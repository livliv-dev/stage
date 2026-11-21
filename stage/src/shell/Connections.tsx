// Settings → 连接: every provider and key in one place. The text model; the voices and speech recognition, which use the
// model's key wherever its service has them (一个密钥用于全部); and the realtime call, folded. Each with its own test.
// Keys stay on this computer. A character's voice is chosen on its card, not here.
import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { tr } from '../i18n'
import { useBrainConfig } from '../brain'
import { saveSpeech, SPEECH_UNSET, speechOfModel, useSpeech } from '../voiceApi'
import { RealtimeModelForm } from '../RealtimeModelForm'
import { ModelForm, SpeechForm } from './ConnectForms'

export type ConnectSection = 'model' | 'speech' | 'realtime'

export function Connections({ focus, forStart, onAccount, onContinue, onDone }: { focus?: ConnectSection; forStart?: boolean; onAccount: () => void; onContinue: () => void; onDone?: () => void }) {
  const chat = useBrainConfig(), speech = useSpeech(), shareable = speechOfModel(chat)
  // the speech API follows the model's key until one of its own is chosen (SpeechForm saves it)
  const [own, setOwn] = useState(!!speech.provider), shared = !!shareable && !own && !speech.provider
  const [realtimeOpen, setRealtimeOpen] = useState(focus === 'realtime')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { if (focus && focus !== 'model') box.current?.querySelector(`[data-section="${focus}"]`)?.scrollIntoView({ block: 'start' }) }, [focus])
  return <div className="connections" ref={box}>
    <section className="connect-section" data-section="model">
      <h3>{tr('文字模型')}</h3><p className="hint">{tr('角色想台词用的模型，所有角色共用一个。')}</p>
      <ModelForm forStart={forStart} done={onDone} onContinue={onContinue} demoDone={onDone} onAccount={onAccount} noDemo />
    </section>
    <section className="connect-section" data-section="speech">
      <h3>{tr('声音与语音识别')}</h3><p className="hint">{tr('角色念台词，和你说话变成文字。每个角色用哪个音色，在角色卡里选。')}</p>
      {shareable && <label className="switch"><span>{tr('一个密钥用于全部')}<small className="hint">{tr('声音、语音识别和实时通话用文字模型的密钥')}</small></span>
        <input type="checkbox" checked={shared} onChange={(e) => { if (e.target.checked) { saveSpeech(SPEECH_UNSET); setOwn(false) } else setOwn(true) }} /><i /></label>}
      {!shared && <SpeechForm onDone={() => onDone?.()} />}
    </section>
    <section className="connect-section" data-section="realtime">
      <button className="fold" aria-expanded={realtimeOpen} onClick={() => setRealtimeOpen((open) => !open)}><ChevronRight size={14} className={realtimeOpen ? 'open' : ''} /><h3>{tr('实时通话')}</h3></button>
      <p className="hint">{tr('和一个角色直接通话：用服务商自己的声音，要自己的 OpenAI 或阿里云百炼密钥。')}</p>
      {realtimeOpen && <RealtimeModelForm onSaved={onDone} />}
    </section>
  </div>
}

/** what the settings search finds: each setting by the words people look for it with, and the tab it is on */
export const SETTINGS_INDEX: { label: string; words: string; tab: 'general' | 'ai' | 'hotkeys' | 'account'; section?: ConnectSection }[] = [
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
