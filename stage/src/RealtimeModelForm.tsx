import { useState } from 'react'
import { Check } from 'lucide-react'
import { useBrainConfig } from './brain'
import { useConversation } from './conversation'
import { tr } from './i18n'
import { lostKey } from './core/secrets'
import { clearRealtimeKey, loadRealtime, realtimeCredentials, realtimeDefaults, realtimeSocketHere, saveRealtime, type RealtimeSettings } from './realtime'
import { useSpeech } from './voiceApi'

/** onSaved: told once the settings are saved (opened from the realtime panel: back there) */
export function RealtimeModelForm({ onSaved }: { onSaved?: () => void } = {}) {
  useBrainConfig(); useSpeech()
  const conversation = useConversation()
  const [settings, setSettings] = useState(loadRealtime), [saved, setSaved] = useState(false), [error, setError] = useState('')
  // the key saved for the call's own service (清除 takes it off this computer)
  const [keptKey, setKeptKey] = useState(() => !!loadRealtime().key)
  const effective = realtimeCredentials(settings)
  const ready = !!effective.base && !!effective.key && !!settings.model.trim()
  const change = (patch: Partial<RealtimeSettings>) => { setSettings((current) => ({ ...current, ...patch })); setSaved(false); setError('') }
  const save = () => {
    try { saveRealtime(settings); setKeptKey(!!settings.key); setSaved(true); setError(''); onSaved?.() }
    catch (cause) { setSaved(false); setError(tr('设置未保存：{0}', (cause as Error).message)) }
  }
  return <div className="model-form realtime-model-form">
    <label className="field"><span>{tr('实时通话服务')}</span><select aria-label={tr('实时通话服务')} value={settings.provider} onChange={(event) => {
      const next = realtimeDefaults(event.target.value === 'openai' ? 'openai' : 'qwen')
      change({ ...next, semantic: settings.semantic, silence: settings.silence, minutes: settings.minutes })
    }}><option value="qwen">{tr('阿里云百炼')}</option><option value="openai">OpenAI Realtime</option></select></label>
    <label className="field"><span>{tr('接口地址')}</span><input aria-label={tr('接口地址')} value={settings.base} placeholder={effective.base || 'https://WORKSPACE.cn-beijing.maas.aliyuncs.com'} onChange={(event) => change({ base: event.target.value })} /></label>
    {settings.provider === 'qwen' && <p className="hint">{realtimeSocketHere()
      ? tr('百炼用标准密钥即可（桌面版经 WebSocket 连接）；填了工作空间地址（….maas.aliyuncs.com）则改走 WebRTC。')
      : tr('网页版的百炼实时通话要用百炼工作空间的专属地址（….maas.aliyuncs.com）；桌面版用标准密钥即可。')}</p>}
    <label className="field"><span>{tr('模型')}</span><input aria-label={tr('模型')} value={settings.model} onChange={(event) => change({ model: event.target.value })} /></label>
    <label className="field"><span>{tr('密钥')}{keptKey && <button type="button" className="link get clear-key" title={tr("从这台电脑上删掉保存的密钥")} onClick={() => { clearRealtimeKey(); setKeptKey(false); change({ key: '' }) }}>{tr('清除')}</button>}</span><input aria-label={tr('密钥')} type="password" autoComplete="off" value={settings.key} placeholder={effective.key ? tr('复用已配置的密钥') : tr('填写该服务的 API 密钥')} onChange={(event) => change({ key: event.target.value })} /></label>
    {!settings.key && lostKey('livliv-stage:realtime') && <p className="hint error">{tr('这台电脑上保存的密钥读不出来了，请重新填写')}</p>}
    <label className="field"><span>{tr('实时音色')}</span><input aria-label={tr('实时音色')} value={settings.voice} onChange={(event) => change({ voice: event.target.value })} /></label>
    <p className="hint">{tr('通话音色单独设置，需选择实时模型支持的音色。')}</p>
    {conversation.running && conversation.mode === 'realtime' && <p className="hint">{tr('更改将在下次通话生效。')}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="row end">{saved && <span className="hint" role="status"><Check size={13} />{tr('已保存')}</span>}<button className="primary" disabled={!ready} onClick={save}>{tr('保存')}</button></div>
  </div>
}
