// Stage's dev server for the browser checks, and how long they wait. Each check starts its own on a free port and waits until it says it
// serves; STAGE_TEST_VITE_TIMEOUT (milliseconds, default 20000) is how long that may take. Colours are turned off and
// stripped either way: GitHub Actions turns them on, and they split the "Local:" the wait looks for.
// `node test/vite.mjs --warm` starts one, asks for the app once so Vite pre-bundles its dependencies into
// node_modules/.vite, and stops it: CI runs it once per job, so no check pays that first start.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

export const stageRoot = fileURLToPath(new URL('..', import.meta.url))
export const viteTimeout = Number(process.env.STAGE_TEST_VITE_TIMEOUT) || 20000
/** how long a check's page waits: its own figure, times STAGE_TEST_SLOW on a slower machine (CI sets 3) */
export const testTimeout = (ms) => ms * (Number(process.env.STAGE_TEST_SLOW) || 1)

export async function freePort() {
  const socket = createServer(); await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const { port } = socket.address(); await new Promise((resolve) => socket.close(resolve))
  return port
}

/** starts `vite` in stage/ on this port, with these extra arguments and environment; the child process, once ready */
export async function startVite({ port, args = [], env = {} }) {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...args, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: stageRoot, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', ...env } })
  let output = ''
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Vite did not start in ${viteTimeout} ms: ${output}`)), viteTimeout)
      const read = (bytes) => { output += String(bytes); if (output.replace(/\x1b\[[0-9;]*m/g, '').includes('Local:')) { clearTimeout(timer); resolve() } }
      server.stdout.on('data', read); server.stderr.on('data', (bytes) => { output += String(bytes) })
      server.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Vite exited ${code}: ${output}`)) })
    })
  } catch (error) { server.kill(); throw error }
  return server
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--warm')) {
  const port = await freePort(), server = await startVite({ port }), origin = `http://127.0.0.1:${port}`
  try {
    const started = Date.now()
    const get = async (path) => {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(viteTimeout) })
      if (!response.ok) throw new Error(`${path}: ${response.status}`)
      return response.text()
    }
    await get('/')
    // a pre-bundled module answers once the optimizer has written them all
    const deps = [...(await get('/src/main.tsx')).matchAll(/from "(\/node_modules\/\.vite\/deps\/[^"]+)"/g)].map((match) => match[1])
    if (!deps.length) throw new Error('the app imports no pre-bundled dependency')
    await get(deps[0])
    console.log(`Vite warmed in ${Date.now() - started} ms (${deps.length} pre-bundled imports in the entry)`)
  } finally { server.kill() }
}
