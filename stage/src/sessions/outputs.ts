// What is on that takes the stage out of the room: the OBS output window, a recording, a co-stream (好友联播), Twitch
// chat connected, a 直播间 running. While any is, every session is public (sessions/scope.ts). The session reads them
// here; a recording tells it through sessions/recordingOutput.ts, so nothing in the session imports it.
import { onMsg, outputOpen } from '../link'
import { chatState, onChatState } from '../danmaku'
import { onRoom, roomState } from '../collab/session'
import { onRecordingOutput, recordingOn } from './recordingOutput'
import { outputsOn } from './scope'

const liveRoom = () => ['connecting', 'waiting', 'on'].includes(roomState().phase)

/** any output on; `live`: a 直播间 session running */
export const outputsNow = (live: boolean) => outputsOn({ window: outputOpen(), recording: recordingOn(), room: liveRoom(), twitch: chatState().status === 'on', live })

/** `changed` each time an output may have come on or gone off, and every second as well (an output window can close
 *  without saying so) */
export function watchOutputs(changed: () => void) {
  const off = [
    onMsg((m) => { if (m.t === 'hello' || m.t === 'alive' || m.t === 'bye') changed() }),
    onRecordingOutput(changed), onRoom(changed), onChatState(changed),
  ]
  const timer = setInterval(changed, 1000)
  return () => { off.forEach((f) => f()); clearInterval(timer) }
}
