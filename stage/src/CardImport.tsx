// A character card from another app (SillyTavern's family, AIRI's with its extensions.airi block), imported as this
// character's persona (characterCard.ts): its name, who it is, how it talks, its first message and example lines. Its
// body, voice and everything else stay. What came over and what didn't is shown, and the import can be undone.
import { useRef, useState } from 'react'
import { Undo2, Upload } from 'lucide-react'
import { tr } from './i18n'
import { CARD_BYTES, readCharacterCard, type CardError, type CardLeft, type CardRead } from './characterCard'
import type { CharacterItem } from './scene'

const ERRORS: Record<CardError, string> = {
  'too-big': '文件太大，角色卡最多 16 MB',
  'not-a-card': '这个文件不是角色卡',
  'no-name': '角色卡里没有名字',
  unreadable: '读不出这张角色卡，文件可能已损坏',
  charx: '暂不支持 .charx，请在原来的应用里导出为 PNG 或 JSON',
}
const LEFT: Record<CardLeft, string> = {
  avatar: '形象模型', voice: '声音', modules: 'AIRI 的其他模块设置', scenario: '场景',
  lorebook: '世界书', greetings: '其他开场白', system: '系统提示', pictures: '图片素材',
}
type Persona = Pick<CharacterItem, 'name' | 'cardName' | 'persona' | 'style' | 'examples' | 'greeting' | 'tagline'>

export function CardImport({ c, patch }: { c: CharacterItem; patch: (p: Partial<CharacterItem>) => void }) {
  const file = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<{ read: CardRead; before?: Persona } | null>(null)
  async function chosen(f: File | undefined) {
    if (!f) return
    const read = f.size > CARD_BYTES ? { ok: false as const, error: 'too-big' as const } : readCharacterCard(new Uint8Array(await f.arrayBuffer()))
    if (!read.ok) { setResult({ read }); return }
    const before: Persona = { name: c.name, cardName: c.cardName, persona: c.persona, style: c.style, examples: c.examples, greeting: c.greeting, tagline: c.tagline }
    const { card } = read
    // the old card's one-line form described the old character: gone with it
    patch({ name: card.name, cardName: card.name, persona: card.persona, style: card.style ?? '', examples: card.examples.length ? card.examples : undefined, greeting: card.greeting, tagline: undefined })
    setResult({ read, before })
  }
  const read = result?.read
  return <div className="card-import">
    <button onClick={() => file.current?.click()}><Upload size={13} />{tr('导入角色卡')}</button>
    <input ref={file} type="file" accept=".png,.json,application/json,image/png" hidden onChange={(e) => { void chosen(e.target.files?.[0]); e.target.value = '' }} />
    {!read && <p className="hint">{tr('SillyTavern、AIRI 角色卡，只导入人设')}</p>}
    {read && !read.ok && <p className="hint error" role="alert">{tr(ERRORS[read.error])}</p>}
    {read?.ok && <div className="card-import-result" role="status">
      <p>{tr('已导入「{0}」：{1}', read.card.name, [
        tr('名字'), read.card.persona && tr('人设'), read.card.style && tr('说话风格'), read.card.greeting && tr('开场白'),
        read.card.examples.length && tr('示例对话 {0} 句', read.card.examples.length),
      ].filter(Boolean).join(tr('、')))}</p>
      {read.left.length > 0 && <p className="hint">{tr('没有导入：{0}', read.left.map((l) => tr(LEFT[l])).join(tr('、')))}</p>}
      {read.trimmed && <p className="hint">{tr('有些内容太长，已截短。')}</p>}
      {result?.before && <button className="link" onClick={() => { patch(result.before!); setResult(null) }}><Undo2 size={13} />{tr('撤销导入')}</button>}
    </div>}
  </div>
}
