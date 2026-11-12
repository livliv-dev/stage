import { Check, Copy, Plus, Trash } from 'lucide-react'
import { store, useScene } from './scene'
import { tr } from './i18n'

export function ScenesMenu({ close }: { close: () => void }) {
  const { scene, scenes } = useScene()
  return <div className="card shots-menu">
    <header><b>{tr('镜头')}</b><span className="num">{scenes.length}</span></header>
    <div className="shots-list">
      {scenes.map((shot, index) => <div className={`shot-row${shot.id === scene.id ? ' active' : ''}`} key={shot.id}>
        <button className="shot-choice" aria-current={shot.id === scene.id ? 'true' : undefined} onClick={() => { store.switchScene(shot.id); close() }}>
          <span className="shot-number num">{index + 1}</span><span>{shot.name || tr('未命名舞台')}</span>{shot.id === scene.id && <Check size={15} />}
        </button>
        <button className="icon danger" disabled={scenes.length === 1} title={tr('删除镜头')} onClick={() => store.removeScene(shot.id)}><Trash size={14} /></button>
      </div>)}
    </div>
    <footer><button onClick={() => { store.addScene(); close() }}><Copy size={14} />{tr('复制当前镜头')}</button><button onClick={() => { store.addScene(true); close() }}><Plus size={14} />{tr('空白镜头')}</button></footer>
  </div>
}
