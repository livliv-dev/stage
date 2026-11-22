import { tr } from './i18n'
// livliv.ai/stage: a visitor who isn't signed in is asked to after three minutes on the page: the site's sign-in or
// sign-up, back to this page afterwards. Whatever is playing (the demo, a conversation) goes on behind it. 先逛逛 (or Esc,
// or a click outside) closes it for the rest of this visit; a new visit asks again after three minutes. It also goes
// away once the site says they are signed in (in another tab too: the page asks again when it gets the focus).
// Never in the output window (Output.tsx, what OBS captures), nor in OBS's own browser (its user agent says OBS/: a
// stage loaded straight into a browser source), nor before the site has said who is there (a member never sees it while
// /api/me is still on its way), and never off the site.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { signInUrl, signUpUrl } from './host'
import { features } from './core/platform'
import { useAccount } from './livliv'

/** how long a visitor may look around signed out before being asked */
export const GUEST_SECONDS = 180

// closed on this visit (kept in memory only: loading the page again starts over)
let closed = false
const listeners = new Set<() => void>()
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
/** 先逛逛: not again on this visit */
export const closeGuestGate = () => { closed = true; listeners.forEach((f) => f()) }

/** whether the prompt is up (App keeps its other cards out of the way meanwhile) */
export function useGuestGate() {
  const account = useAccount()
  // the site in a browser: the desktop app showing livliv.ai/stage is the app, with a sign-in of its own
  const out = features.host === 'site' && !features.shell && account.status === 'out' && !navigator.userAgent.includes('OBS/')
  const shut = useSyncExternalStore(subscribe, () => closed)
  const [due, setDue] = useState(false)
  useEffect(() => {
    if (!out || due || shut) return
    const t = window.setTimeout(() => setDue(true), GUEST_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [out, due, shut])
  return out && due && !shut
}

export function GuestGate({ shown }: { shown: boolean }) {
  // the prompt itself takes the focus, not 登录: Space or Enter, pressed for what plays behind it, signs nobody in
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { if (shown) box.current?.focus() }, [shown])
  if (!shown) return null
  return <>
    <div className="scrim" onClick={closeGuestGate} />
    <div ref={box} tabIndex={-1} className="card popover settings age-check guest-gate" role="dialog" aria-modal="true" aria-labelledby="guest-title" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title" id="guest-title">{tr("登录 livliv.ai，用你自己的角色和声音")}</span></header>
      <p className="hint">{tr("注册免费，还送积分。")}</p>
      <div className="row end">
        <button className="later" onClick={closeGuestGate}>{tr("先逛逛")}</button>
        <button onClick={() => location.assign(signUpUrl())}>{tr("注册")}</button>
        <button className="primary" onClick={() => location.assign(signInUrl())}>{tr("登录")}</button>
      </div>
    </div>
  </>
}
