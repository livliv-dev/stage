// The tools on the left (a character, a caption, text, a picture) and the card that adds a character.
import { useEffect, useRef, useState } from 'react'
import { Captions, FolderOpen, Image as ImageIcon, FileBox, Plus, Type, UserPlus, X } from 'lucide-react'
import { byId, fromFiles, fromKept, fromPngs, mine as accountCharacters, samples, type Pick } from '../library'
import { PNG_SLOTS, type PngSlot } from '../bodies/png'
import { forget, kept, type Kept } from '../vault'
import { bubbleFor, captionBar, newCharacter, store, uid } from '../scene'
import { checkConnect, useAccount } from '../livliv'
import { pictureFile } from '../assets'
import { SidebarToggle } from '../SidebarToggle'
import { tr, getLocale } from '../i18n'
import { features } from '../core/platform'
import { ui, useUi } from './ui'

export function Rail({ folded, onFold }: { folded: boolean; onFold: () => void }) {
  const { pop } = useUi(), toggle = ui.toggle
  const picture = useRef<HTMLInputElement>(null), pictureScene = useRef<string | null>(null)
  const [pictureError, setPictureError] = useState('')
  const addText = () => store.add({ id: uid(), kind: 'text', text: tr("双击改文字"), size: 72, color: '#1f1d1a', bg: 'transparent', x: 120, y: 80, w: 720, h: 130 })
  const addPicture = async (f?: File) => {
    if (!f) return
    setPictureError('')
    const sceneId = pictureScene.current ?? store.get().id
    try {
      const picture = await pictureFile(f), scene = store.project().scenes.find((s) => s.id === sceneId)
      if (!scene) throw new Error(tr('镜头已删除，请重新添加图片'))
      const w = Math.min(picture.w, scene.width * .4), h = w * picture.h / picture.w
      store.addImage(sceneId, { id: uid(), kind: 'image', asset: picture.key, url: picture.url, name: f.name, x: Math.round((scene.width - w) / 2), y: Math.round((scene.height - h) / 2), w: Math.round(w), h: Math.round(h) })
    } catch (error) { setPictureError((error as Error).message) }
  }
  const tools = [
    { label: tr("角色"), icon: <UserPlus size={20} />, on: pop === 'add', act: () => toggle('add') },
    { label: tr("字幕"), icon: <Captions size={20} />, act: () => store.add(captionBar(store.get())) },
    { label: tr("文字"), icon: <Type size={20} />, act: addText },
    { label: tr("图片"), icon: <ImageIcon size={20} />, act: () => { pictureScene.current = store.get().id; picture.current?.click() } },
  ]
  return (
    <nav className="rail" onPointerDown={(e) => e.stopPropagation()} aria-label={tr("添加")}>
      {!folded && tools.map((t) => <button key={t.label} className={`tool${t.on ? ' on' : ''}`} onClick={t.act}>{t.icon}<span>{t.label}</span></button>)}
      <SidebarToggle side="left" folded={folded} label={tr('舞台内容')} onToggle={onFold} />
      {pictureError && <button className='rail-error' onClick={() => setPictureError('')}>{pictureError}<X size={12} /></button>}
      <input ref={picture} type="file" accept="image/*" hidden onChange={(e) => { addPicture(e.target.files?.[0]); e.target.value = '' }} />
    </nav>
  )
}

/** places a character, with its own speech bubble */
function place(p: Pick) {
  const c = newCharacter(store.get(), p.name, p.model, p.persona, undefined, p.card)
  store.add(c, bubbleFor(c))
}

export function AddCharacter({ left, onClose, onSignIn }: { left: number; onClose: () => void; onSignIn: () => void }) {
  const list = samples()
  const account = useAccount(), signed = account.status === 'in', closed = account.closed  // a character by its id comes from LivLiv: an account's
  const [err, setErr] = useState('')
  const [id, setId] = useState('')
  const [mine, setMine] = useState<Kept[]>([])
  useEffect(() => { void checkConnect() }, [])
  const [png, setPng] = useState(false)
  const folder = useRef<HTMLInputElement>(null), file = useRef<HTMLInputElement>(null)
  useEffect(() => { void kept().then(setMine) }, [])
  // on livliv.ai/stage, signed in: the account's own characters, to pick instead of typing an id
  const [own, setOwn] = useState<Pick[] | null>(null)
  useEffect(() => { if (features.host === 'site' && signed) void accountCharacters().then(setOwn, (e: Error) => setErr(e.message)) }, [signed])
  const take = (p: Pick) => { place(p); onClose() }
  const files = async (f: FileList | File[] | null) => {
    if (!f?.length) return
    try { take(await fromFiles(f)) } catch (e) { setErr((e as Error).message) }
  }
  // a model package's zip or a .vrm dropped on the card
  const drop = (e: React.DragEvent) => {
    const f = [...e.dataTransfer.files].filter((x) => /\.(livliv|zip|vrm)$/i.test(x.name))
    if (!f.length) return
    e.preventDefault()
    void files(f.slice(0, 1))
  }
  return (
    <div className="card popover add" style={{ left }} onPointerDown={(e) => e.stopPropagation()}
      onDragOver={(e) => { if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) e.preventDefault() }} onDrop={drop}>
      <header><span className="title">{tr("放一个角色")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <p className="label first">{tr("导入")}</p>
      <div className="row imports">
        <button title={tr("LivLiv 模型包（文件夹）")} onClick={() => folder.current?.click()}><FolderOpen size={15} />{tr("模型文件夹")}</button>
        <button title={tr("LivLiv 模型包（.livliv 或 zip），或 VRM（VRoid 等）")} onClick={() => file.current?.click()}><FileBox size={15} />.livliv / VRM</button>
        <button className={png ? 'on' : ''} aria-expanded={png} onClick={() => setPng((v) => !v)}><ImageIcon size={15} />{tr("PNG 立绘")}</button>
        <input ref={folder} type="file" hidden {...{ webkitdirectory: '' }} onChange={(e) => { void files(e.target.files); e.target.value = '' }} />
        <input ref={file} type="file" accept=".livliv,.zip,.vrm" hidden onChange={(e) => { void files(e.target.files); e.target.value = '' }} />
      </div>
      {png && <PngForm onDone={take} onError={setErr} />}
      <p className="label">{tr("精选角色")}</p>
      <div className="grid">
        {list.map((p) => (
          <button key={p.id} className="pick" title={p.card?.tagline ?? p.persona} onClick={() => take(p)}>
            {p.thumb && <img src={p.thumb} alt="" />}<span>{p.label ?? p.name}</span>
          </button>
        ))}
      </div>
      {mine.length > 0 && <>
        <p className="label">{tr("本机导入过的")}</p>
        <div className="kept">
          {mine.map((k) => (
            <div key={k.key} className="kept-row">
              <button className="link" onClick={() => take(fromKept(k))}>
                {k.name}{k.format && k.format !== 'livliv' && <i className="fmt">{k.format === 'vrm' ? 'VRM' : tr("立绘")}</i>}
              </button>
              <span>{new Date(k.at).toLocaleDateString(getLocale())}</span>
              <button className="icon" title={tr("从这台电脑上删掉（用到它的角色会显示要重新导入）")}
                onClick={() => { void forget(k.key).then(() => setMine((m) => m.filter((x) => x.key !== k.key))) }}><X size={13} /></button>
            </div>
          ))}
        </div>
      </>}
      {own && own.length > 0 && <>
        <p className="label">{tr("你在 livliv.ai 的角色")}</p>
        <div className="grid">
          {own.map((p) => <button key={p.id} className="pick" title={p.persona} onClick={() => take(p)}>{p.thumb && <img src={p.thumb} alt="" />}<span>{p.name}</span></button>)}
        </div>
      </>}
      <p className="label split">{tr("从 livliv.ai 增加")}{account.status === 'out' && (closed ? <span>{tr("帐号登录暂未开放")}</span> : <button className="link" onClick={onSignIn}>{tr("登录 livliv.ai")}</button>)}</p>
      <div className="row">
        <input value={id} disabled={!signed} placeholder={tr("角色 ID，网址里 /c/ 后面那段")} onChange={(e) => setId(e.target.value)} />
        <button disabled={!signed || !id.trim()} onClick={async () => { try { take(await byId(id.trim())) } catch (e) { setErr((e as Error).message) } }}>{tr("放上来")}</button>
      </div>
      {err && <p className="err">{tr(err)}</p>}
    </div>
  )
}

/** a PNGTuber from its pictures: one per slot (closed and open needed), picked or dropped on the slot */
function PngForm({ onDone, onError }: { onDone: (p: Pick) => void; onError: (m: string) => void }) {
  const [pics, setPics] = useState<Partial<Record<PngSlot, File>>>({})
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const urls = useRef(new Map<File, string>()), box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    return () => { for (const u of urls.current.values()) URL.revokeObjectURL(u) }
  }, [])
  const url = (f: File) => { let u = urls.current.get(f); if (!u) urls.current.set(f, (u = URL.createObjectURL(f))); return u }
  const put = (slot: PngSlot, f: File | undefined) => {
    if (!f || !f.type.startsWith('image/')) return
    setPics((p) => ({ ...p, [slot]: f }))
    if (!name && slot === 'closed') setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_ ]*(closed|idle|闭嘴)$/i, ''))
  }
  const ready = !!pics.closed && !!pics.open && !!name.trim()
  const go = async () => {
    setBusy(true)
    try { onDone(await fromPngs(pics, name.trim())) } catch (e) { onError((e as Error).message) } finally { setBusy(false) }
  }
  return <div className="png-form" ref={box}>
    <div className="slots">
      {PNG_SLOTS.map((s) => {
        const f = pics[s.id]
        return <label key={s.id} className={`slot${s.need ? ' need' : ''}${f ? ' set' : ''}`}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); put(s.id, e.dataTransfer.files[0]) }}>
          {f ? <img src={url(f)} alt="" /> : <Plus size={18} />}
          <span>{tr(s.label ?? '')}</span>
          <input type="file" accept="image/png,image/webp,image/gif" hidden onChange={(e) => { put(s.id, e.target.files?.[0]); e.target.value = '' }} />
          {f && !s.need && <button className="icon clear" aria-label={tr("去掉{0}", s.label)} onClick={(e) => { e.preventDefault(); setPics((p) => ({ ...p, [s.id]: undefined })) }}><X size={12} /></button>}
        </label>
      })}
    </div>
    <div className="row">
      <input value={name} placeholder={tr("名字")} onChange={(e) => setName(e.target.value)} />
      <button className="primary" disabled={!ready || busy} onClick={go}>{tr("放上来")}</button>
    </div>
  </div>
}
