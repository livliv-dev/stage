import { tr } from './i18n'
// livliv.ai/stage: a visitor who isn't signed in is asked to after a minute on the page: the site's sign-in or sign-up,
// back to this page afterwards. Whatever was playing (the demo, a conversation) stops behind it. It has no close: it
// goes away once the site says they are signed in (in another tab too: the page asks again when it gets the focus).
// Never in the output window (Output.tsx, what OBS captures) and never off the site.
import { useEffect, useState } from 'react'
import { talk } from './conversation'
import { onSite, signInUrl, signUpUrl } from './host'
import { useAccount } from './livliv'

/** how long a visitor may look around signed out */
export const GUEST_SECONDS = 60

export function GuestGate() {
  const account = useAccount()
  const out = onSite && account.status === 'out'
  const [due, setDue] = useState(false)
  useEffect(() => {
    if (!out || due) return
    const t = window.setTimeout(() => setDue(true), GUEST_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [out, due])
  const shown = out && due
  useEffect(() => { if (shown) talk.stop() }, [shown])
  if (!shown) return null
  return <>
    <div className="scrim" />
    <div className="card popover settings age-check guest-gate" role="dialog" aria-modal="true" aria-labelledby="guest-title" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title" id="guest-title">{tr("登录 livliv.ai 继续使用")}</span></header>
      <p className="hint">{tr("注册免费，还送积分。")}</p>
      <div className="row end">
        <button onClick={() => location.assign(signUpUrl())}>{tr("注册")}</button>
        <button className="primary" autoFocus onClick={() => location.assign(signInUrl())}>{tr("登录")}</button>
      </div>
    </div>
  </>
}
