import { tr, useLocale } from './i18n'
// The editor, or, while another tab of this browser edits, a note saying so with the way to move here (tabs.ts).
import { useEffect, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { moveHere, startTabs, useTab } from './tabs'
import { store } from './scene'
import { recording } from './recording'
import { conversation } from './conversation'
import { isOutput, outputOpen } from './link'

const BUSY = { rec: '录制', talk: '对谈', out: 'OBS 输出' } as const

// the output window never edits: it takes no part
if (!isOutput) startTabs({
  busy: () => [...(['recording', 'starting', 'making'].includes(recording().phase) ? ['rec' as const] : []), ...(conversation().running ? ['talk' as const] : []), ...(outputOpen() ? ['out' as const] : [])],
  save: () => store.flush(),
  load: () => store.reload(),
})

export function TabGate({ children }: { children: ReactNode }) {
  useLocale()
  const { tab, busy } = useTab()
  useEffect(() => { if (tab === 'here') store.edit() }, [tab])
  if (tab === 'here') return <>{children}</>
  if (tab === 'wait') return null
  return <div className="tab-gate">
    <div className="card">
      <img src={`${import.meta.env.BASE_URL}wordmark.svg`} alt="LivLiv Stage" />
      <p className="big">{tr('Stage 已在另一个标签页打开')}</p>
      <p className="hint">{tr('同一个浏览器一次只在一个标签页里编辑，免得两边互相覆盖。')}</p>
      {busy.length > 0 && <p className="hint warn">{tr('那边正在{0}：移到这里会停下来。', busy.map((b) => tr(BUSY[b])).join(tr('、')))}</p>}
      <button className="primary" disabled={tab === 'moving'} onClick={moveHere}>{tab === 'moving' && <LoaderCircle size={14} className="spin" />}{tr('在这里继续')}</button>
    </div>
  </div>
}
