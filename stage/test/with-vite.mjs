// Runs a browser check written against a running Stage dev server (STAGE_TEST_URL): starts one on a free port, runs
// the check, stops the server. Usage: node test/with-vite.mjs test/realtime.mjs
import { spawn } from 'node:child_process'
import { freePort, stageRoot, startVite } from './vite.mjs'

const [file, ...args] = process.argv.slice(2)
if (!file) throw new Error('Usage: node test/with-vite.mjs <check.mjs>')
const port = await freePort(), server = await startVite({ port, args: ['--configLoader', 'native'] })
try {
  const check = spawn(process.execPath, [file, ...args], { cwd: stageRoot, stdio: 'inherit', env: { ...process.env, STAGE_TEST_URL: `http://127.0.0.1:${port}` } })
  process.exitCode = await new Promise((resolve) => check.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0))))
} finally {
  server.kill()
}
