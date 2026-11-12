// Where this copy of Stage runs.
//  - livliv.ai/stage (built with VITE_STAGE_HOST=livliv, `npm run build:site`): a page of the site itself. The visitor's
//    LivLiv account is the site's own sign-in (its cookie; no connect code), the face model comes from the site's
//    /mediapipe/, the AI services offered are the ones a web page can call straight (no /__ai pass-through), there is
//    no 联播 (its relay runs on your own computer), and recordings follow the visitor's LivLiv plan (free: 30 s with
//    the LivLiv mark; paid: 5 min)
//  - anywhere else (the desktop app, the dev server, a copy you host yourself): all of Stage, as before
export const onSite = import.meta.env.VITE_STAGE_HOST === 'livliv'

/** where the face tracker's files are: the site's own copy there (the same files), Stage's elsewhere */
export const mediapipeBase = onSite ? '/mediapipe/' : `${import.meta.env.BASE_URL}mediapipe/`

/** the site's sign-in, coming back to this page (and the character it was opened with) */
export const signInUrl = () => `/login?next=${encodeURIComponent(location.pathname + location.search)}`
/** the site's sign-up, the same way back */
export const signUpUrl = () => `/login?mode=signup&next=${encodeURIComponent(location.pathname + location.search)}`

/** a phone or a small tablet: the site shows the demo and asks for a computer for the rest */
export const small = () => typeof matchMedia === 'function' && matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1024px)').matches
