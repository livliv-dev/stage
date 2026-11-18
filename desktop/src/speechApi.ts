// Local speech ingress. Audio is base64 in the JSON body. A URL is rejected so this route cannot fetch one.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { SPEECH_AUDIO_LIMIT, SPEECH_EMOTIONS, SPEECH_TEXT_LIMIT, type SpeechEmotion, type SpeechInput, type SpeechResult } from './speechBridge'

export type SpeechApi = {
  submit(input: SpeechInput): Promise<SpeechResult>
  status(utteranceId: string): Promise<SpeechResult>
  cancel(utteranceId: string): Promise<SpeechResult>
}

const MAX_BODY = 2_200_000
const MIME = new Set(['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm'])
const FORBIDDEN = new Set(['url', 'audiourl', 'src', 'href', 'uri', 'fetch'])

type Send = (response: ServerResponse, status: number, body: object) => void

export async function serveSpeech(request: IncomingMessage, response: ServerResponse, path: string, speech: SpeechApi, send: Send) {
  try {
    if (request.method === 'GET' && path === '/api/stage/speech') {
      const id = new URL(request.url || '/', 'http://127.0.0.1').searchParams.get('id') || ''
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) { send(response, 400, { ok: false, status: 400, error: 'Invalid utterance id' }); return }
      const result = await speech.status(id)
      send(response, result.status, result)
      return
    }
    if (request.method !== 'POST') { send(response, 405, { error: 'Use POST' }); return }
    const body = await readBody(request)
    if (body === 'too-large') { send(response, 413, { ok: false, status: 413, error: 'Speech body is larger than 2 MB' }); return }
    let value: unknown
    try { value = JSON.parse(body) } catch { send(response, 400, { ok: false, status: 400, error: 'Invalid JSON utterance' }); return }
    if (path === '/api/stage/speech/cancel') {
      const id = value && typeof value === 'object' && 'utteranceId' in value && typeof value.utteranceId === 'string' ? value.utteranceId : ''
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) { send(response, 400, { ok: false, status: 400, error: 'Invalid utterance id' }); return }
      const result = await speech.cancel(id)
      send(response, result.status, result)
      return
    }
    const parsed = readSpeechJson(value)
    if (!parsed.ok) { send(response, parsed.result.status, parsed.result); return }
    const result = await speech.submit(parsed.input)
    send(response, result.status, result)
  } catch (error) {
    if (request.aborted || response.destroyed) return
    console.error('[stage-speech] unavailable:', error)
    send(response, 503, { ok: false, status: 503, error: 'Stage is not responding' })
  }
}

export function readSpeechJson(value: unknown): { ok: true; input: SpeechInput } | { ok: false; result: SpeechResult } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance' } }
  const raw = value as Record<string, unknown>
  for (const key of Object.keys(raw)) if (FORBIDDEN.has(key.toLowerCase())) return { ok: false, result: { ok: false, status: 400, error: 'Speech audio must be inline bytes, not a URL' } }
  const input: SpeechInput = {}
  if (raw.utteranceId !== undefined) {
    if (typeof raw.utteranceId !== 'string') return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance id' } }
    input.utteranceId = raw.utteranceId
  }
  if (raw.character !== undefined) {
    if (typeof raw.character !== 'string') return { ok: false, result: { ok: false, status: 400, error: 'Invalid character id' } }
    input.character = raw.character
  }
  if (raw.text !== undefined) {
    if (typeof raw.text !== 'string') return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance text' } }
    if ([...raw.text].length > SPEECH_TEXT_LIMIT) return { ok: false, result: { ok: false, status: 400, error: 'Text is longer than 4000 characters' } }
    input.text = raw.text
  }
  if (raw.emotion !== undefined) {
    if (typeof raw.emotion !== 'string' || !SPEECH_EMOTIONS.includes(raw.emotion as SpeechEmotion)) return { ok: false, result: { ok: false, status: 400, error: 'Unknown emotion' } }
    input.emotion = raw.emotion as SpeechEmotion
  }
  if (raw.mime !== undefined) {
    if (typeof raw.mime !== 'string' || !MIME.has(raw.mime.toLowerCase())) return { ok: false, result: { ok: false, status: 400, error: 'Unsupported audio type' } }
    input.mime = raw.mime.toLowerCase()
  }
  if (raw.audio !== undefined) {
    if (typeof raw.audio !== 'string') return { ok: false, result: { ok: false, status: 400, error: 'Audio must be base64 bytes' } }
    if (!input.mime) return { ok: false, result: { ok: false, status: 400, error: 'Unsupported audio type' } }
    const audio = decode(raw.audio)
    if (!audio) return { ok: false, result: { ok: false, status: 400, error: 'Audio must be base64 bytes' } }
    if (audio.byteLength > SPEECH_AUDIO_LIMIT) return { ok: false, result: { ok: false, status: 413, error: 'Audio is larger than 1.5 MB' } }
    input.audio = audio
  }
  if (raw.seq !== undefined) {
    if (typeof raw.seq !== 'number') return { ok: false, result: { ok: false, status: 400, error: 'Chunk sequence is out of range' } }
    input.seq = raw.seq
  }
  if (raw.final !== undefined) {
    if (typeof raw.final !== 'boolean') return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance' } }
    input.final = raw.final
  }
  if (raw.raw !== undefined) {
    if (typeof raw.raw !== 'string') return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance' } }
    input.raw = raw.raw
  }
  if (raw.interrupt !== undefined) {
    if (typeof raw.interrupt !== 'boolean') return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance' } }
    input.interrupt = raw.interrupt
  }
  return { ok: true, input }
}

function decode(value: string) {
  const cleaned = value.replace(/\s/g, '')
  if (!cleaned || cleaned.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) return null
  const bytes = Buffer.from(cleaned, 'base64')
  if (!bytes.length) return null
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function readBody(request: IncomingMessage) {
  return new Promise<string | 'too-large'>((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    request.on('data', (part: Buffer | string) => {
      const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part)
      size += chunk.length
      if (size <= MAX_BODY) chunks.push(chunk)
    })
    request.on('end', () => resolve(size > MAX_BODY ? 'too-large' : Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
    request.on('aborted', () => reject(new Error('request aborted')))
  })
}
