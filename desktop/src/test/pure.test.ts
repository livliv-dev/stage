// npm test: the parts without a window. The `do` cases are the ones livliv.ai's /api/live/cmd is tested with, so the
// local endpoint takes exactly what the server takes.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isCmdBody, parseDo } from '../commands'
import { checkAccelerator, cleanBindings, defaultBindings, readStageHotkeys, stageBindings, stagePrefix } from '../hotkeys'
import { route, stageFromPath, stageOutput, stageUrl } from '../urls'

test('parseDo: the server grammar', () => {
  assert.deepEqual(parseDo('expr:1'), { do: 'expr', id: '1' })
  assert.deepEqual(parseDo(' expr:害羞:on '), { do: 'expr', id: '害羞', on: true })
  assert.deepEqual(parseDo('expr:smile:off'), { do: 'expr', id: 'smile', on: false })
  assert.deepEqual(parseDo('act:nod'), { do: 'act', id: 'nod' })
  assert.deepEqual(parseDo('act:away'), { do: 'act', id: 'away' })
  for (const d of ['clear', 'calibrate', 'mic', 'mute', 'ai-pause', 'ai-stop', 'ptt']) assert.deepEqual(parseDo(d), { do: d })
  for (const bad of ['', 'expr:', 'expr:a:maybe', 'act:dance', 'act:Nod', 'dance', 'clear:1', `expr:${'x'.repeat(41)}`, 'expr:a:b:c'])
    assert.equal(parseDo(bad), null, bad)
  assert.ok(parseDo(`expr:${'表'.repeat(40)}`), '40 characters, as Python counts them')
})

test('isCmdBody', () => {
  assert.ok(isCmdBody({ do: 'expr', id: '1' }))
  assert.ok(isCmdBody({ do: 'act', id: 'hop' }))
  assert.ok(!isCmdBody({ do: 'act', id: 'dance' }))
  assert.ok(!isCmdBody({ do: 'expr', id: '1', on: 'yes' }))
  assert.ok(!isCmdBody(null))
  for (const cmd of ['mute', 'ai-pause', 'ai-stop', 'ptt']) assert.ok(isCmdBody({ do: cmd }))
  assert.ok(!isCmdBody({ do: 'expr:1' }), 'structured commands do not accept a command string')
})

test('route: what stays in the shell', () => {
  const o = new Set(['https://livliv.ai'])
  assert.equal(route('https://livliv.ai/c/d03', o).kind, 'app')
  const st = route('https://livliv.ai/live/d03?bg=green&k=abc', o)
  assert.equal(st.kind, 'stage')
  assert.equal(st.kind === 'stage' && st.id, 'd03')
  assert.equal(route('https://livliv.ai/live/d03/extra', o).kind, 'app')
  assert.equal(route('https://accounts.google.com/o/oauth2/auth', o).kind, 'auth')
  assert.equal(route('https://checkout.stripe.com/pay', o).kind, 'external')
  assert.equal(route('http://livliv.ai/live/d03', o).kind, 'external', 'another origin: http')
  assert.equal(route('https://livliv.ai.evil.com/live/d03', o).kind, 'external')
  assert.equal(route('blob:https://livliv.ai/1234', o).kind, 'app')
  for (const bad of ['file:///etc/passwd', 'data:text/html,hi', 'javascript:alert(1)', 'livliv://x', 'not a url'])
    assert.equal(route(bad, o).kind, 'blocked', bad)
})

test('route: LivLiv Stage served at its own scheme', () => {
  const o = new Set(['livliv-stage://app'])
  assert.equal(route('livliv-stage://app/', o).kind, 'app')
  assert.equal(route('livliv-stage://app/?output=1', o).kind, 'app', 'its output window')
  assert.equal(route('blob:livliv-stage://app/1234', o).kind, 'app', 'a recording to save')
  assert.equal(route('livliv-stage://other/', o).kind, 'blocked')
  assert.equal(route('https://livliv.ai/c/d03', o).kind, 'external')
  assert.equal(route('file:///etc/passwd', o).kind, 'blocked')
})

test('stageUrl: transparent, the rest kept', () => {
  const u = stageUrl(new URL('https://livliv.ai/live/d03?bg=green&track=1&k=abc'))
  assert.equal(u.searchParams.get('bg'), 'transparent')
  assert.equal(u.searchParams.get('channel'), 'desktop')
  assert.equal(u.searchParams.get('k'), 'abc')
  assert.equal(stageUrl(new URL('https://livliv.ai/live/d03?bg=%23123456')).searchParams.get('bg'), '#123456')
})

test('stageFromPath: only /live/<id> on our origin', () => {
  assert.equal(stageFromPath('/live/d03?track=1', 'https://livliv.ai')?.id, 'd03')
  for (const bad of ['//evil.com/live/d03', '/live/../admin', 'https://evil.com/live/d03', '/c/d03', 42 as unknown as string])
    assert.equal(stageFromPath(bad, 'https://livliv.ai'), null, String(bad))
})

test('hotkeys: a modifier, or F13-F24', () => {
  assert.equal(checkAccelerator('Control+Alt+1'), null)
  assert.equal(checkAccelerator('CommandOrControl+Shift+Q'), null)
  assert.equal(checkAccelerator('F15'), null)
  assert.equal(checkAccelerator('Control+Alt+Space', 'win32'), null)
  assert.ok(checkAccelerator('1'), 'a bare key would take it from every program')
  assert.ok(checkAccelerator('Shift+1'), 'Shift alone types')
  assert.ok(checkAccelerator('Control+Control+1'))
  assert.ok(checkAccelerator('Hyper+1'))
  assert.ok(checkAccelerator('Control+Alt+F99'))
  assert.equal(defaultBindings('Control+Alt').length, 17)
  assert.ok(defaultBindings('Control+Alt').every((b) => checkAccelerator(b.accelerator, 'win32') === null && parseDo(b.do)))
})

test('hotkeys: never a shortcut of the system or of every program', () => {
  const taken: [string, string][] = [['Command+Q', 'darwin'], ['Cmd+C', 'darwin'], ['CommandOrControl+V', 'darwin'], ['Super+Q', 'darwin'],
    ['Command+Tab', 'darwin'], ['Control+Option+Space', 'darwin'], ['Alt+Control+Space', 'darwin'], ['Control+Space', 'darwin'],
    ['Alt+F4', 'win32'], ['Control+C', 'win32'], ['CmdOrCtrl+V', 'win32'], ['ctrl+z', 'linux'], ['Super+L', 'win32'], ['Control+Alt+Delete', 'win32']]
  for (const [a, platform] of taken) assert.ok(checkAccelerator(a, platform), `${a} on ${platform}`)
  for (const [a, platform] of [['Control+Alt+1', 'darwin'], ['Control+Alt+C', 'darwin'], ['Command+Shift+1', 'darwin'], ['Control+Shift+Alt+1', 'win32'], ['Control+Alt+Space', 'win32']])
    assert.equal(checkAccelerator(a, platform), null, `${a} on ${platform}`)
  assert.equal(cleanBindings([{ accelerator: 'Alt+Shift+1', do: 'expr:1' }, { accelerator: 'CommandOrControl+C', do: 'clear' }]), null)
})

test('cleanBindings: all usable or none', () => {
  assert.deepEqual(cleanBindings([{ accelerator: 'Alt+Shift+1', do: 'expr:1' }]), [{ accelerator: 'Alt+Shift+1', do: 'expr:1' }])
  assert.equal(cleanBindings([{ accelerator: '1', do: 'expr:1' }]), null)
  assert.equal(cleanBindings([{ accelerator: 'Alt+1', do: 'dance' }]), null)
  assert.equal(cleanBindings([{ accelerator: 'Alt+1', do: 'clear' }, { accelerator: 'alt+1', do: 'mic' }]), null, 'twice')
  assert.equal(cleanBindings('Alt+1'), null)
})

test('stageOutput: the output window, see-through only when asked', () => {
  assert.equal(stageOutput(new URL('livliv-stage://app/')), null)
  assert.deepEqual(stageOutput(new URL('livliv-stage://app/?output=1')), { clear: false })
  assert.deepEqual(stageOutput(new URL('livliv-stage://app/?output=1&clear=1')), { clear: true })
})

test('Stage shortcuts: no Space, and not AltGr on Windows', () => {
  assert.equal(stagePrefix('win32'), 'Control+Shift+Alt')
  assert.equal(stagePrefix('darwin'), 'Control+Alt')
  assert.equal(stagePrefix('linux'), 'Control+Alt')
  for (const platform of ['win32', 'darwin', 'linux']) {
    const bindings = stageBindings(stagePrefix(platform))
    assert.ok(bindings.every((b) => checkAccelerator(b.accelerator, platform) === null && parseDo(b.do)), platform)
    assert.ok(!bindings.some((b) => b.accelerator.endsWith('+Space')), platform)
  }
  assert.ok(stageBindings(stagePrefix('win32')).every((b) => b.accelerator.startsWith('Control+Shift+Alt+')))
})

test('Stage hotkeys: off until turned on, choices made before kept', () => {
  const mine = [{ accelerator: 'Control+Alt+9', do: 'expr:1' }]
  // saved before: on with Control+Alt for everyone, chosen or not
  assert.deepEqual(readStageHotkeys({ enabled: true, prefix: 'Control+Alt' }, null, false, 'win32'), { enabled: false, prefix: 'Control+Shift+Alt', bindings: null })
  assert.deepEqual(readStageHotkeys({ enabled: true, prefix: 'Control+Alt' }, mine, false, 'win32'), { enabled: true, prefix: 'Control+Shift+Alt', bindings: mine })
  assert.deepEqual(readStageHotkeys({ enabled: true, prefix: 'Alt+Shift' }, null, false, 'win32'), { enabled: false, prefix: 'Alt+Shift', bindings: null })
  // saved since: what the user turned on or off
  assert.deepEqual(readStageHotkeys({ enabled: true, prefix: 'Control+Alt' }, null, true, 'darwin'), { enabled: true, prefix: 'Control+Alt', bindings: null })
  assert.deepEqual(readStageHotkeys({ enabled: false, prefix: 'Control+Shift+Alt' }, mine, true, 'win32'), { enabled: false, prefix: 'Control+Shift+Alt', bindings: mine })
  assert.deepEqual(readStageHotkeys({}, null, true, 'win32'), { enabled: false, prefix: 'Control+Shift+Alt', bindings: null })
})

test('Stage shortcuts validate and include performance and session controls', () => {
  const bindings = stageBindings('Control+Alt')
  assert.ok(bindings.every((b) => checkAccelerator(b.accelerator) === null && parseDo(b.do)))
  assert.equal(cleanBindings(bindings)?.length, bindings.length)
  for (const cmd of ['calibrate', 'mute', 'ai-pause', 'ai-stop', 'ptt']) assert.ok(bindings.some((b) => b.do === cmd))
})
