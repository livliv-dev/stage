// Addresses and sizes that depend on where Stage runs (which host it is: core/platform.ts).
import { features } from './core/platform'

/** where the face tracker's files are: the site's own copy there (the same files), Stage's elsewhere */
export const mediapipeBase = features.host === 'site' ? '/mediapipe/' : `${import.meta.env.BASE_URL}mediapipe/`

/** the site's sign-in, coming back to this page (and the character it was opened with) */
export const signInUrl = () => `/login?next=${encodeURIComponent(location.pathname + location.search)}`
/** the site's sign-up, the same way back */
export const signUpUrl = () => `/login?mode=signup&next=${encodeURIComponent(location.pathname + location.search)}`

/** a phone or a small tablet: the site shows the demo and asks for a computer for the rest */
export const SMALL = '(max-width: 760px), (pointer: coarse) and (max-width: 1024px)'
export const small = () => typeof matchMedia === 'function' && matchMedia(SMALL).matches
