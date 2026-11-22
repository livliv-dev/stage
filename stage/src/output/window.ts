// The OBS output window listens to the conversation: each change, and its hello when it opens, sends it what it may show
// (sessions/state.ts shownConv: a private conversation's lines never leave the editor).
import { isOutput, onMsg, outputOpen, post } from '../link'
import { onConv, shownConv } from '../sessions/state'

const send = () => post({ t: 'conv', conv: shownConv() })

if (!isOutput) {
  onConv(() => { if (outputOpen()) send() })
  onMsg((m) => { if (m.t === 'hello') send() })
}
