import { useState } from 'react'
import { tr } from './i18n'
import { saveAiri, useAiri } from './airiSettings'
import { useAiriLink } from './airiHost'

const PHASE = { off: '未开启', connecting: '正在连接 AIRI…', ready: '已连接 AIRI', closed: 'AIRI 连接已断开', failed: 'AIRI 连接失败' } as const

export function AiriPanel({ characters }: { characters: { id: string; name: string }[] }) {
  const settings = useAiri()
  const link = useAiriLink()
  const [open, setOpen] = useState(settings.enabled)
  const status = tr(PHASE[link.phase])
  return <section className="neuro-panel airi-panel">
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary><span>{tr('AIRI 角色主持')}</span><small>{status}</small></summary>
      <p className="hint">{tr('AIRI 负责对话。Stage 用当前角色说出 AIRI 的完成回复，并做口型。默认关闭。')}</p>
      <p className="hint">{tr('这不是 AIRI 自己的声音。没有随回复附带音频时，使用这个角色已经配置的声音。')}</p>
      <label className="field"><span>{tr('AIRI 服务地址')}</span><input value={settings.url} disabled={settings.enabled} spellCheck={false} onChange={(event) => saveAiri({ url: event.target.value })} /></label>
      <label className="field"><span>{tr('AIRI 令牌（可选）')}</span><input type="password" value={settings.token} disabled={settings.enabled} autoComplete="off" onChange={(event) => saveAiri({ token: event.target.value })} /></label>
      <label className="field"><span>{tr('说话的角色')}</span><select value={settings.characterId} disabled={settings.enabled} onChange={(event) => saveAiri({ characterId: event.target.value })}>
        <option value="">{tr('跟随当前舞台')}</option>
        {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
      </select></label>
      <label className="switch"><span>{tr('把控制台输入发给 AIRI')}</span><input type="checkbox" checked={settings.forwardInput} onChange={(event) => saveAiri({ forwardInput: event.target.checked })} /><i /></label>
      <p className="hint">{tr('打开后，控制台的话只发给 AIRI，不再让 Stage 自己的模型回答。请先停止 Stage 里正在进行的聊天。')}</p>
      <button className={settings.enabled ? '' : 'primary'} onClick={() => saveAiri({ enabled: !settings.enabled })}>{tr(settings.enabled ? '断开 AIRI' : '连接 AIRI')}</button>
      {link.error && <p className="error" role="alert">{link.error}</p>}
    </details>
  </section>
}
