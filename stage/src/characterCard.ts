// A character card from another app, read as a Stage character's persona. The cards of SillyTavern's family: Character
// Card V3 (which AIRI exports, with its own `extensions.airi` block), V2, and the first TavernAI format; as JSON, or
// inside a PNG (its `ccv3` or `chara` text chunk: the card's JSON in base64). Read from it: the name, who it is (the
// description, else the personality), how it talks (the personality, when there is a description), its first message
// and the character's lines from its example dialogue, with the card's {{char}} and {{user}} filled in and *actions*
// left out (Stage's characters speak; they don't narrate). The rest stays behind, and the result says what: from AIRI
// the avatar model, the voice and the other module settings (the character keeps its own body and voice), and from any
// card its scenario, lorebook, other greetings, system prompt and pictures. Pure: test/characterCard.test.ts.

export type CardPersona = {
  name: string
  persona: string
  style?: string
  /** the first message: the line a chat opens with */
  greeting?: string
  /** the character's lines from the example dialogue */
  examples: string[]
}
/** what a card holds that isn't imported */
export type CardLeft = 'avatar' | 'voice' | 'modules' | 'scenario' | 'lorebook' | 'greetings' | 'system' | 'pictures'
export type CardRead =
  | { ok: true; spec: 'v3' | 'v2' | 'v1'; airi: boolean; card: CardPersona; left: CardLeft[]; trimmed: boolean }
  | { ok: false; error: CardError }
export type CardError = 'too-big' | 'not-a-card' | 'no-name' | 'unreadable' | 'charx'

/** the largest file read (a PNG card carries its picture) */
export const CARD_BYTES = 16 * 1024 * 1024
const LIMIT = { name: 60, persona: 4000, style: 1500, greeting: 400, example: 300, examples: 12 }

type Data = Record<string, unknown>
const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim() : '')
const object = (v: unknown): v is Data => !!v && typeof v === 'object' && !Array.isArray(v)
const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : object(v) ? Object.keys(v).length > 0 : !!text(v))

/** the card in a file: its bytes, as chosen (JSON, or a PNG with the card inside) */
export function readCharacterCard(bytes: Uint8Array): CardRead {
  if (bytes.length > CARD_BYTES) return { ok: false, error: 'too-big' }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return { ok: false, error: 'charx' }
  let json: string | null
  if (isPng(bytes)) {
    const chunk = pngText(bytes)
    if (chunk === undefined) return { ok: false, error: 'unreadable' }
    if (chunk === null) return { ok: false, error: 'not-a-card' }
    json = base64Text(chunk)
    if (json === null) return { ok: false, error: 'unreadable' }
  } else {
    json = utf8(bytes)
    if (json === null) return { ok: false, error: 'not-a-card' }
  }
  let raw: unknown
  try { raw = JSON.parse(json.replace(/^﻿/, '')) } catch { return { ok: false, error: 'not-a-card' } }
  return readCardJson(raw)
}

/** a card already parsed from JSON */
export function readCardJson(raw: unknown): CardRead {
  if (!object(raw)) return { ok: false, error: 'not-a-card' }
  let spec: 'v3' | 'v2' | 'v1', data: Data
  if (raw.spec === 'chara_card_v3' || raw.spec === 'chara_card_v2') {
    if (!object(raw.data)) return { ok: false, error: 'not-a-card' }
    spec = raw.spec === 'chara_card_v3' ? 'v3' : 'v2'
    data = raw.data
  } else if (raw.spec === undefined && ['description', 'personality', 'first_mes', 'mes_example'].some((k) => typeof raw[k] === 'string') && 'name' in raw) {
    spec = 'v1'
    data = raw
  } else return { ok: false, error: 'not-a-card' }

  const cardName = text(data.name)
  if (!cardName) return { ok: false, error: 'no-name' }
  let trimmed = false
  const cut = (value: string, max: number) => {
    if (value.length <= max) return value
    trimmed = true
    const head = value.slice(0, max), end = Math.max(...['。', '！', '？', '. ', '! ', '? ', '\n'].map((m) => head.lastIndexOf(m)))
    return (end > max / 2 ? head.slice(0, end + 1) : head).trim()
  }
  const description = text(data.description), personality = text(data.personality)
  const user = userWord(`${description}\n${personality}\n${text(data.first_mes)}`)
  const fill = macros(text(data.nickname) || cardName, user)
  const name = cut(cardName, LIMIT.name)
  const persona = cut(fill(description || personality), LIMIT.persona)
  const style = description && personality ? cut(fill(personality), LIMIT.style) : ''
  const greeting = cut(spoken(fill(text(data.first_mes))), LIMIT.greeting)
  const all = exampleLines(text(data.mes_example), cardName, fill)
  if (all.length > LIMIT.examples) trimmed = true
  const examples = all.slice(0, LIMIT.examples).map((line) => cut(line, LIMIT.example))

  const ext = object(data.extensions) ? data.extensions : {}
  const airi = object(ext.airi)
  const left: CardLeft[] = []
  if (airi) {
    const a = ext.airi as Data, modules = object(a.modules) ? a.modules : {}
    const speech = object(modules.speech) ? modules.speech : {}
    if (filled(a.avatarModels) || filled(modules.vrm) || filled(modules.live2d)) left.push('avatar')
    if (filled(speech.provider) || filled(speech.voice_id)) left.push('voice')
    left.push('modules')
  }
  if (filled(data.scenario)) left.push('scenario')
  if (filled(data.character_book)) left.push('lorebook')
  if (filled(data.alternate_greetings) || filled(data.group_only_greetings)) left.push('greetings')
  if (filled(data.system_prompt) || filled(data.post_history_instructions)) left.push('system')
  if (filled(data.assets)) left.push('pictures')

  return {
    ok: true, spec, airi, trimmed, left,
    card: { name, persona, ...(style ? { style } : {}), ...(greeting ? { greeting } : {}), examples },
  }
}

/** who {{user}} is in the card's own language: the person talking with the character */
function userWord(sample: string) {
  return /[぀-ヿ]/.test(sample) ? 'あなた' : /[一-鿿]/.test(sample) ? '你' : 'you'
}
/** the card's names for the character and for you, filled in (also TavernAI's <BOT> and <USER>) */
const macros = (character: string, user: string) => (value: string) => {
  const named = value.replace(/\{\{\s*char\s*\}\}|<BOT>/gi, character)
  return (user === 'you' ? named.replace(/(?:\{\{\s*user\s*\}\}|<USER>)['’]s\b/gi, 'your') : named).replace(/\{\{\s*user\s*\}\}|<USER>/gi, user)
}
/** what is said: *actions* and (OOC) notes left out, spaces tidied */
function spoken(value: string) {
  return value.replace(/\*[^*\n]*\*/g, ' ').replace(/\(\(?\s*OOC:[^)]*\)\)?/gi, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim()
}
/** the character's lines in an example dialogue (`{{char}}: …` or `<name>: …`; a line without a speaker continues the
 *  one before), each as said */
function exampleLines(dialogue: string, cardName: string, fill: (v: string) => string) {
  const lines: string[] = []
  let mine = false
  const own = new RegExp(`^(?:\\{\\{\\s*char\\s*\\}\\}|<BOT>|${cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*[:：]\\s*`, 'i')
  const other = /^(?:\{\{\s*user\s*\}\}|<USER>|[^:：\s]{1,30})\s*[:：]/i
  for (const raw of dialogue.split('\n')) {
    const line = raw.trim()
    if (!line || /^<START>$/i.test(line)) { mine = false; continue }
    if (own.test(line)) { lines.push(line.replace(own, '')); mine = true; continue }
    if (other.test(line)) { mine = false; continue }
    if (mine && lines.length) lines[lines.length - 1] += ` ${line}`
  }
  return lines.map((line) => spoken(fill(line))).filter(Boolean)
}

// ---------------------------------------------------------------- the PNG a card comes in

function isPng(b: Uint8Array) {
  return b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)
}
/** the card's text chunk: `ccv3` (V3) before `chara` (V2); null: none; undefined: the file is broken */
function pngText(b: Uint8Array): string | null | undefined {
  const found: Record<string, string> = {}
  let at = 8
  while (at + 12 <= b.length) {
    const length = ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0
    const type = String.fromCharCode(b[at + 4], b[at + 5], b[at + 6], b[at + 7])
    const start = at + 8, end = start + length
    if (end + 4 > b.length) return undefined
    if (type === 'tEXt' || type === 'iTXt') {
      const zero = b.indexOf(0, start)
      if (zero < 0 || zero >= end) return undefined
      const keyword = latin1(b.subarray(start, zero)).toLowerCase()
      if (keyword === 'ccv3' || keyword === 'chara') {
        if (type === 'tEXt') found[keyword] = latin1(b.subarray(zero + 1, end))
        else {
          // iTXt: compression flag and method, language tag\0, translated keyword\0, then the text (uncompressed only)
          if (b[zero + 1] !== 0) return undefined
          const lang = b.indexOf(0, zero + 3), translated = lang < 0 ? -1 : b.indexOf(0, lang + 1)
          if (translated < 0 || translated >= end) return undefined
          found[keyword] = utf8(b.subarray(translated + 1, end)) ?? ''
        }
      }
    }
    if (type === 'IEND') break
    at = end + 4
  }
  return found.ccv3 ?? found.chara ?? null
}
const latin1 = (b: Uint8Array) => { let s = ''; for (const v of b) s += String.fromCharCode(v); return s }
function utf8(b: Uint8Array) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b) } catch { return null }
}
function base64Text(value: string) {
  const clean = value.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null
  try {
    const binary = atob(clean), out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
    return utf8(out)
  } catch { return null }
}
