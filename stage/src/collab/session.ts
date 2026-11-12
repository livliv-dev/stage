import { tr } from '../i18n'
import { useSyncExternalStore } from 'react'
import { actors, onActors, onFrame, type Actor } from '../actors'
import { inputs, onInputs } from '../devices'
import { store, type CharacterItem } from '../scene'
import { packageFor, PackageReceiver, sendPackage, type Package } from './assets'
import { PublishAudio } from './audio'
import { checkPackage } from './headers'
import { actorFor, characterFor, receiveCharacter, removeCharacter } from './scene'
import { attachSound, removeSound, volumeFor } from './streams'
import { decodeInvite, encodeInvite, MAX_MEMBERS, object, personName, ROOM_VERSION, serviceUrl, validSignal, type Invite, type Member } from './protocol'
import { readPose } from './pose'

export type PeerState = Member & { phase: 'connecting' | 'receiving' | 'loading' | 'ready' | 'error'; progress: number; error: string; muted: boolean }
export type RoomState = { phase: 'off' | 'connecting' | 'waiting' | 'on' | 'error'; role: 'host' | 'guest' | null; id: string; room: string; invite: string; members: PeerState[]; pending: Member[]; microphone: boolean; microphoneError: string; error: string }
const empty = (): RoomState => ({ phase: 'off', role: null, id: '', room: '', invite: '', members: [], pending: [], microphone: true, microphoneError: '', error: '' })
let state = empty(), session: Session | null = null
const listeners = new Set<() => void>()
const set = (patch: Partial<RoomState>) => { state = { ...state, ...patch }; listeners.forEach((listener) => listener()) }
export const roomState = () => state
export const useRoom = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => state)
export const onRoom = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
type Peer = { member: Member; pc: RTCPeerConnection; stateChannel: RTCDataChannel | null; poseChannel: RTCDataChannel | null; receiver: PackageReceiver; pendingIce: RTCIceCandidateInit[]; asset: AbortController; status: PeerState }
function membersFrom(raw: unknown, limit = MAX_MEMBERS): Member[] {
  if (!Array.isArray(raw) || raw.length > limit || raw.some((member) => !object(member) || typeof member.id !== 'string' || !/^[\w-]{1,64}$/.test(member.id) || !personName(member.name) || typeof member.host !== 'boolean')) throw new Error(tr("联播成员信息有问题"))
  const members = raw as Member[]
  if (new Set(members.map((member) => member.id)).size !== members.length) throw new Error(tr("联播成员重复"))
  return members.map((member) => ({ ...member, name: personName(member.name) }))
}

class Session {
  private socket: WebSocket
  private controller = new AbortController()
  private peers = new Map<string, Peer>()
  private audio = new PublishAudio()
  private configuration: RTCConfiguration = { iceServers: [] }
  private me = ''
  private room = ''
  private members: Member[] = []
  private asset: Promise<Package> | null = null
  private actor: Actor | null = null
  private lastPose = 0
  private lastProgress = 0
  private model: string
  private stopped = false
  private offs: (() => void)[] = []
  private url: string
  private characterId: string
  private microphone: boolean
  constructor(url: string, characterId: string, microphone: boolean, message: Record<string, unknown>) {
    this.url = url; this.characterId = characterId; this.microphone = microphone
    const character = this.character()
    this.model = JSON.stringify(character.model)
    this.actor = actors.get(characterId) ?? null
    this.audio.connectActor(this.actor)
    this.audio.onError = (error) => { if (!this.stopped) set({ microphoneError: error }) }
    this.socket = new WebSocket(url)
    this.socket.onopen = () => this.send(message)
    this.socket.onmessage = (event) => { void this.signal(event.data).catch((error: Error) => this.fail(error.message)) }
    this.socket.onerror = () => this.fail(tr("联播服务未连接，请检查服务地址"))
    this.socket.onclose = () => { if (!this.stopped) this.fail(tr("联播连接已断开")) }
    this.offs = [store.subscribe(() => this.sceneChanged()), onActors(() => this.actorsChanged()), onFrame((actor) => this.frame(actor))]
    let microphoneId = inputs().microphone
    this.offs.push(onInputs(() => { const id = inputs().microphone; if (id !== microphoneId) { microphoneId = id; if (this.microphone && this.me) void this.audio.microphoneOn(true) } }))
  }
  private character() {
    const item = store.get().items.find((item): item is CharacterItem => item.id === this.characterId && item.kind === 'character' && !item.remote)
    if (!item) throw new Error(tr("请选择自己的角色"))
    return item
  }
  send(message: Record<string, unknown>) { if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)) }
  private async signal(text: unknown) {
    if (this.stopped || typeof text !== 'string' || text.length > 64 * 1024) return
    const value: unknown = JSON.parse(text)
    if (!object(value)) throw new Error(tr("联播服务消息有问题"))
    if (value.t === 'error' || value.t === 'ended') { this.fail(typeof value.reason === 'string' ? value.reason : tr("联播已结束")); return }
    if (value.t === 'waiting') { set({ phase: 'waiting' }); return }
    if (value.t === 'pending') { set({ pending: membersFrom(value.people, 8) }); return }
    if (value.t === 'joined') {
      if (value.version !== ROOM_VERSION || typeof value.id !== 'string' || typeof value.room !== 'string' || typeof value.token !== 'string' || !Array.isArray(value.iceServers) || value.iceServers.length > 16) throw new Error(tr("联播服务版本不兼容"))
      this.me = value.id; this.room = value.room
      this.configuration = { iceServers: value.iceServers as RTCIceServer[], iceTransportPolicy: value.relayOnly === true ? 'relay' : 'all' }
      const members = membersFrom(value.members)
      if (!members.some((member) => member.id === this.me)) throw new Error(tr("联播身份有问题"))
      set({ phase: 'on', id: this.me, room: this.room, invite: encodeInvite({ server: this.url, room: value.room, token: value.token }), microphone: this.microphone })
      if (this.microphone) void this.audio.microphoneOn(true)
      this.syncPeers(members); return
    }
    if (value.t === 'members' && this.me) { this.syncPeers(membersFrom(value.members)); return }
    if (value.t === 'signal' && typeof value.from === 'string' && validSignal(value.signal)) {
      const peer = this.peers.get(value.from)
      if (!peer) return
      const signal = value.signal as { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
      try {
        if (signal.description) {
          await peer.pc.setRemoteDescription(signal.description)
          for (const candidate of peer.pendingIce.splice(0)) await peer.pc.addIceCandidate(candidate)
          if (signal.description.type === 'offer') { await peer.pc.setLocalDescription(await peer.pc.createAnswer()); this.send({ t: 'signal', to: peer.member.id, signal: { description: peer.pc.localDescription!.toJSON() } }) }
        } else if (signal.candidate) {
          if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(signal.candidate)
          else { if (peer.pendingIce.length >= 128) throw new Error(tr("连接候选过多")); peer.pendingIce.push(signal.candidate) }
        }
      } catch (error) { this.peerError(peer, tr("连接没有建立：") + (error as Error).message) }
    }
  }
  private syncPeers(members: Member[]) {
    this.members = members
    for (const [id, peer] of this.peers) if (!members.some((member) => member.id === id)) { this.closePeer(peer); this.peers.delete(id) }
    for (const member of members) if (member.id !== this.me && !this.peers.has(member.id)) this.createPeer(member)
    this.publish()
  }
  private createPeer(member: Member) {
    const pc = new RTCPeerConnection(this.configuration)
    const peer: Peer = { member, pc, stateChannel: null, poseChannel: null, receiver: new PackageReceiver(), pendingIce: [], asset: new AbortController(), status: { ...member, phase: 'connecting', progress: 0, error: '', muted: false } }
    this.peers.set(member.id, peer)
    pc.addTrack(this.audio.stream.getAudioTracks()[0], this.audio.stream)
    pc.onicecandidate = (event) => { if (event.candidate) this.send({ t: 'signal', to: member.id, signal: { candidate: event.candidate.toJSON() } }) }
    pc.ontrack = (event) => { const stream = event.streams[0] ?? new MediaStream([event.track]); attachSound(member.id, stream); volumeFor(member.id, peer.status.muted ? 0 : characterFor(member.id)?.tuning.volume ?? 1) }
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') this.peerError(peer, tr("与这位朋友的连接失败")); else if (pc.connectionState === 'disconnected') { peer.status.phase = 'connecting'; this.publish() } else if (pc.connectionState === 'connected' && actorFor(member.id)?.status === 'ready') { peer.status.phase = 'ready'; this.publish() } }
    pc.ondatachannel = (event) => this.channel(peer, event.channel)
    if (this.me < member.id) {
      this.channel(peer, pc.createDataChannel('model'))
      this.channel(peer, pc.createDataChannel('pose', { ordered: false, maxRetransmits: 0 }))
      void (async () => { try { await pc.setLocalDescription(await pc.createOffer()); this.send({ t: 'signal', to: member.id, signal: { description: pc.localDescription!.toJSON() } }) } catch (error) { if (!this.stopped) this.peerError(peer, (error as Error).message) } })()
    }
  }
  private channel(peer: Peer, channel: RTCDataChannel) {
    if (channel.label === 'pose' && !peer.poseChannel) {
      peer.poseChannel = channel
      channel.onmessage = (event) => {
        if (this.stopped || peer.status.phase === 'error') return
        try { if (typeof event.data !== 'string' || event.data.length > 16 * 1024) throw new Error(); const pose = readPose(JSON.parse(event.data)); if (!pose) throw new Error(); actorFor(peer.member.id)?.follow(pose) }
        catch { this.peerError(peer, tr("收到的角色动作有问题")) }
      }
      return
    }
    if (channel.label !== 'model' || peer.stateChannel) { channel.close(); return }
    peer.stateChannel = channel; channel.binaryType = 'arraybuffer'
    channel.onopen = () => { void this.share(peer) }
    channel.onmessage = (event) => {
      if (this.stopped || peer.status.phase === 'error') return
      try {
        if (event.data instanceof ArrayBuffer) { peer.receiver.chunk(event.data); if (performance.now() - this.lastProgress > 100) { this.lastProgress = performance.now(); peer.status.progress = peer.receiver.progress; this.publish() } }
        else {
          if (typeof event.data !== 'string' || new TextEncoder().encode(event.data).length > 64 * 1024) throw new Error(tr("联播消息过大"))
          const message: unknown = JSON.parse(event.data)
          if (!object(message)) throw new Error(tr("联播消息无效"))
          if (message.t === 'model') { peer.receiver.begin(message.model); peer.status.phase = 'receiving'; this.publish() }
          else if (message.t === 'model-end') { const value = peer.receiver.end(message.id); peer.status.phase = 'loading'; peer.status.progress = 1; this.publish(); void this.load(peer, value) }
        }
      } catch (error) { this.peerError(peer, (error as Error).message) }
    }
    channel.onclose = () => { if (!this.stopped && this.peers.has(peer.member.id) && peer.pc.connectionState !== 'closed') this.peerError(peer, tr("角色同步已断开")) }
  }
  private async load(peer: Peer, value: Package) {
    try { await checkPackage(value.files) } catch (error) { this.peerError(peer, (error as Error).message); return }
    if (!this.stopped && this.peers.get(peer.member.id) === peer && peer.status.phase !== 'error') receiveCharacter(this.room, peer.member, value, peer.status.muted)
  }
  private async share(peer: Peer) {
    try {
      this.asset ??= packageFor(this.character(), this.controller.signal)
      const value = await this.asset
      if (this.stopped || peer.asset.signal.aborted) return
      await sendPackage(peer.stateChannel!, value, peer.asset.signal)
    } catch (error) { if (!this.stopped && !peer.asset.signal.aborted) this.peerError(peer, tr("角色没有分享成功：") + (error as Error).message) }
  }
  private frame(actor: Actor) {
    if (this.stopped || actor !== this.actor || actor.item.id !== this.characterId || actor.status !== 'ready' || performance.now() - this.lastPose < 50) return
    this.lastPose = performance.now()
    const text = JSON.stringify(actor.lastPose)
    for (const peer of this.peers.values()) if (peer.poseChannel?.readyState === 'open' && peer.poseChannel.bufferedAmount < 32 * 1024) peer.poseChannel.send(text)
  }
  private actorsChanged() {
    const actor = actors.get(this.characterId) ?? null
    if (this.actor !== actor) { this.actor = actor; this.audio.connectActor(actor) }
    let changed = false
    for (const peer of this.peers.values()) {
      const remote = actorFor(peer.member.id)
      if (remote?.status === 'ready' && peer.status.phase === 'loading') { peer.status.phase = 'ready'; changed = true }
      else if (remote?.status === 'error' && peer.status.phase !== 'error') { peer.status.phase = 'error'; peer.status.error = remote.error; changed = true }
    }
    if (changed) this.publish()
  }
  private sceneChanged() {
    if (this.stopped) return
    const character = store.get().items.find((item) => item.id === this.characterId && item.kind === 'character')
    if (!character || character.kind !== 'character' || JSON.stringify(character.model) !== this.model) { this.fail(tr("共享角色已更换，联播已结束")); return }
    for (const peer of this.peers.values()) { const remote = characterFor(peer.member.id); if (!remote) continue; volumeFor(peer.member.id, remote.muted ? 0 : remote.tuning.volume); if (peer.status.muted !== remote.muted) { peer.status.muted = remote.muted; this.publish() } }
  }
  private publish() { if (!this.stopped) set({ members: this.members.map((member) => member.id === this.me ? { ...member, phase: 'ready', progress: 1, error: '', muted: false } : { ...this.peers.get(member.id)!.status }) }) }
  mutePeer(id: string) { const peer = this.peers.get(id); if (!peer) return; const character = characterFor(id); if (character) store.patch(character.id, { muted: !character.muted }); else { peer.status.muted = !peer.status.muted; volumeFor(id, peer.status.muted ? 0 : 1); this.publish() } }
  mic(on: boolean) { this.microphone = on; set({ microphone: on, microphoneError: '' }); void this.audio.microphoneOn(on) }
  private peerError(peer: Peer, message: string) { if (this.stopped || peer.status.phase === 'error') return; peer.status.phase = 'error'; peer.status.error = message; peer.asset.abort(); peer.pc.close(); removeSound(peer.member.id); removeCharacter(peer.member.id); this.publish() }
  private closePeer(peer: Peer) { peer.asset.abort(); peer.pc.onconnectionstatechange = null; if (peer.stateChannel) peer.stateChannel.onclose = null; peer.pc.close(); removeSound(peer.member.id); removeCharacter(peer.member.id) }
  fail(error: string) { if (this.stopped) return; this.close(); set({ phase: 'error', error, pending: [], members: [] }) }
  close() { if (this.stopped) return; this.stopped = true; this.controller.abort(); this.offs.forEach((off) => off()); this.audio.close(); for (const peer of this.peers.values()) this.closePeer(peer); this.peers.clear(); this.socket.close() }
}
function start(server: string, name: string, character: string, microphone: boolean, invite?: Invite) {
  room.leave()
  const person = personName(name)
  if (!person) { set({ phase: 'error', error: tr("请输入你的名字") }); return }
  const target = store.get().items.find((item) => item.id === character && item.kind === 'character' && !item.remote)
  if (!target || actors.get(character)?.status !== 'ready') { set({ phase: 'error', error: tr("请先载入自己的角色") }); return }
  try { const url = serviceUrl(server); set({ ...empty(), phase: 'connecting', role: invite ? 'guest' : 'host', microphone }); session = new Session(url, character, microphone, invite ? { t: 'join', name: person, room: invite.room, token: invite.token } : { t: 'create', name: person }) }
  catch (error) { set({ phase: 'error', error: (error as Error).message }) }
}
export const room = {
  create(server: string, name: string, character: string, microphone: boolean) { start(server, name, character, microphone) },
  join(code: string, name: string, character: string, microphone: boolean) { try { const invite = decodeInvite(code); start(invite.server, name, character, microphone, invite) } catch (error) { set({ phase: 'error', error: (error as Error).message }) } },
  admit(id: string) { session?.send({ t: 'admit', id }) }, remove(id: string) { session?.send({ t: 'remove', id }) },
  mute(id: string) { session?.mutePeer(id) }, mic(on: boolean) { session?.mic(on) },
  leave() { session?.close(); session = null; set(empty()) },
}
addEventListener('pagehide', () => room.leave())
