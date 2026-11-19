// Runs a browser check written against a running Stage dev server (STAGE_TEST_URL): starts one on a free port, runs
// the check, stops the server. Usage: node test/with-vite.mjs test/realtime.mjs
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const [file, ...args] = process.argv.slice(2)
if (!file) throw new Error('Usage: node test/with-vite.mjs <check.mjs>')
const socket = createServer(); await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port; await new Promise((resolve) => socket.close(resolve))
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--configLoader', 'native', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] })
let output = ''
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start: ' + output)), 20000)
    vite.stdout.on('data', (bytes) => { output += String(bytes); if (output.includes('Local:')) { clearTimeout(timer); resolve() } })
    vite.once('exit', (code) => { clearTimeout(timer); reject(new Error('Vite exited ' + code + ': ' + output)) })
  })
  const check = spawn(process.execPath, [file, ...args], { cwd: root, stdio: 'inherit', env: { ...process.env, STAGE_TEST_URL: `http://127.0.0.1:${port}` } })
  process.exitCode = await new Promise((resolve) => check.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0))))
} finally {
  vite.kill()
}
