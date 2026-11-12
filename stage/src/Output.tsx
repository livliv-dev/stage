// The output window (?output=1): the stage alone, filling the window, nothing else on it, for OBS to capture (window
// capture: a browser source runs in another browser, which the editor can't reach). It shows what the editor sends
// (link.ts): the scene, the conversation's lines and turns, each character's pose every frame, and makes no sound.
// A transparent stage stays transparent, in a see-through window with no frame: drag it anywhere to move it, close it
// from the editor's button. On livliv.ai/stage on the free plan the editor asks for the LivLiv mark in the corner.
import { useEffect, useState } from 'react'
import { actors } from './actors'
import { mirrorConv, type ConvState } from './conversation'
import { isClear, onMsg, post } from './link'
import { loadable, localModels, store, type Scene } from './scene'
import { Stage } from './Stage'
import { tr, useLocale } from './i18n'

const NONE = { top: 0, right: 0, bottom: 0, left: 0 }

export default function Output() {
  const locale = useLocale()
  const [linked, setLinked] = useState(false), [mark, setMark] = useState(false)
  useEffect(() => {
    document.documentElement.classList.add('output')
    if (isClear) document.documentElement.classList.add('clear')
    const bye = () => post({ t: 'bye' })
    window.addEventListener('pagehide', bye)
    post({ t: 'hello' })
    const alive = setInterval(() => post({ t: 'alive' }), 2000)
    const off = onMsg((m) => {
      if (m.t === 'assets') localModels.set(m.key, new Map(m.files))
      else if (m.t === 'scene') {
        const s = loadable(m.scene as Scene)
        if (s) {
          const used = new Set(s.items.flatMap((item) => item.kind === 'character' && item.model.type === 'files' ? [item.model.key] : []))
          for (const key of localModels.keys()) if (key.startsWith('remote:') && !used.has(key)) localModels.delete(key)
          store.mirror(s); setLinked(true)
        }
      }
      else if (m.t === 'conv') mirrorConv(m.conv as Partial<ConvState>)
      else if (m.t === 'pose') actors.get(m.id)?.follow(m.pose)
      else if (m.t === 'mark') setMark(m.on)
      else if (m.t === 'close') window.close()
    })
    return () => { clearInterval(alive); off(); window.removeEventListener('pagehide', bye) }
  }, [])
  useEffect(() => { document.title = tr("LivLiv Stage · 输出") }, [locale])
  return (
    <div className="app show output">
      <Stage insets={NONE} zoom="fit" setZoom={() => {}} onMenu={() => {}} empty={null} mark={mark} />
      {!linked && <p className="output-wait">{tr("正在连接舞台…")}</p>}
    </div>
  )
}
