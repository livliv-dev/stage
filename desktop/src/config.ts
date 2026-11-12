// What the shell loads. Two apps are built from it:
//  - the site's shell ('site'): development (not packaged) the local web dev server, LIVLIV_URL or the vite default
//    port of the website's Vite (5173); packaged livliv.ai. --url=<origin> overrides it in development (npm start = this
//    build against the site)
//  - LivLiv Stage ('stage', package.json "livliv": {"app": "stage"} as electron-builder.stage.yml writes it, --app=stage
//    in development): the Stage editor built into the app (stage/dist), served at livliv-stage://app (stageApp.ts),
//    its /api and /models passed to LivLiv (LIVLIV_API or --api=, livliv.ai by default). --url / LIVLIV_URL loads a
//    Stage dev server instead
// A packaged app ignores these overrides (and --stage-dir, --user-data): it loads and talks to what it was built for.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { app } from 'electron'
import { PROD_ORIGIN } from './urls'

export const flag = (name: string) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`))
  return a ? a.slice(name.length + 3) : undefined
}

/** devtools, the measurement probe (probe.ts), the overrides below */
export const DEV = !app.isPackaged
const devFlag = (name: string) => (DEV ? flag(name) : undefined)
const devEnv = (name: string) => (DEV ? process.env[name] : undefined)

function builtAs(): string | undefined {
  try { return JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf8')).livliv?.app } catch { return undefined }
}
export const APP: 'site' | 'stage' = (flag('app') ?? builtAs()) === 'stage' ? 'stage' : 'site'
// its own settings, cookies and saved scenes, also when run from this folder (packaged, its name gives the same place)
// (--user-data=<dir>: an isolated profile, in development)
if (APP === 'stage') app.setPath('userData', devFlag('user-data') || join(app.getPath('appData'), 'LivLiv Stage'))

export const STAGE_SCHEME = 'livliv-stage'
const asked = devFlag('url') || devEnv('LIVLIV_URL')
/** Stage's own build, served by the shell (no dev server asked for) */
export const STAGE_BUILT = APP === 'stage' && !asked
/** where Stage's build is: in the app's resources, or stage/dist next to this folder in development */
export const STAGE_DIR = resolve(devFlag('stage-dir') || (app.isPackaged ? join(process.resourcesPath, 'stage') : join(__dirname, '..', '..', 'stage', 'dist')))
/** the LivLiv Stage's /api and /models go to (its account, voices, speech recognition, characters by id) */
export const LIVLIV_API = new URL(devFlag('api') || devEnv('LIVLIV_API') || PROD_ORIGIN).origin

const origin = STAGE_BUILT ? `${STAGE_SCHEME}://app`
  : new URL(asked || (DEV ? 'http://127.0.0.1:5173' : PROD_ORIGIN)).origin
export const APP_ORIGIN = origin
/** pages that stay in the shell, get the preload and may call it */
export const ORIGINS: ReadonlySet<string> = new Set([origin])

export const VERSION = app.getVersion()
export const NAME = APP === 'stage' ? 'LivLiv Stage' : 'LivLiv'
