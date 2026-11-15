import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

export type RelayOptions = {
  host?: string; port?: number; origins?: string[]; iceServers?: unknown[]; relayOnly?: boolean
  maxConnections?: number; socketsPerAddress?: number; roomsPerAddress?: number; trustProxy?: boolean
  helloTimeout?: number; messageRate?: number; messageBurst?: number
}
export type Relay = { server: Server; address: AddressInfo; close(): Promise<void> }
export function startRelay(options?: RelayOptions): Promise<Relay>
