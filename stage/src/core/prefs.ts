// Every name Stage keeps under `livliv-stage:` in this browser (localStorage), and the channels its windows talk on, in
// one place, each in a group. 恢复默认偏好 resets by group (ResetPreferences.tsx); what isn't in a reset group (your
// model and keys, the sign-in, scenes, chat records) is never touched. A name can't be used without being here: a test
// scans the source for `livliv-stage:` (test/prefs.test.ts).

/** what a name belongs to. The first five are preferences 恢复默认偏好 can reset; the rest are kept */
export type PrefGroup = 'layout' | 'locale' | 'quality' | 'inputs' | 'mixer'
  | 'connections' | 'account' | 'scenes' | 'characters' | 'audience' | 'collab' | 'window' | 'dev'

export const PREFS = {
  'livliv-stage:panel-folded': { group: 'layout', about: 'the side panels hidden (bare stage)' },
  'livliv-stage:left-folded': { group: 'layout', about: 'the left panel folded' },
  'livliv-stage:tools-folded': { group: 'layout', about: 'the tools folded (older builds)' },
  'livliv-stage:cast-folded': { group: 'layout', about: 'the cast folded (older builds)' },
  'livliv-stage:locale': { group: 'locale', about: 'the interface language' },
  'livliv-stage:quality': { group: 'quality', about: 'the rendering quality' },
  'livliv-stage:inputs': { group: 'inputs', about: 'the camera and microphone chosen' },
  'livliv-stage:mixer': { group: 'mixer', about: 'the volumes' },
  'livliv-stage:brain': { group: 'connections', about: 'the text model and its key' },
  'livliv-stage:brain-api': { group: 'connections', about: 'the model of one\'s own, kept while the demo or livliv.ai\'s text runs' },
  'livliv-stage:livliv-voice': { group: 'connections', about: 'livliv.ai\'s voices and speech recognition on or off' },
  'livliv-stage:livliv-want': { group: 'account', about: 'livliv.ai turned on while signed out: on once the sign-in succeeds (session storage)' },
  'livliv-stage:speech': { group: 'connections', about: 'the speech API and its key' },
  'livliv-stage:realtime': { group: 'connections', about: 'the realtime call\'s provider and key' },
  'livliv-stage:twitch': { group: 'connections', about: 'the Twitch channel read' },
  'livliv-stage:session': { group: 'account', about: 'the livliv.ai sign-in (desktop and self-hosted)' },
  'livliv-stage:keys-cleared': { group: 'connections', about: 'keys and the sign-in cleared here whose encrypted copy (desktop) is not yet deleted' },
  'livliv-stage:scene': { group: 'scenes', about: 'the stage being edited' },
  'livliv-stage:shots': { group: 'scenes', about: 'the scenes of the project' },
  'livliv-stage:recent-livliv-voices': { group: 'characters', about: 'LivLiv voices picked lately' },
  'livliv-stage:tracking-presets': { group: 'characters', about: 'saved motion presets' },
  'livliv-stage:blocked-viewers': { group: 'audience', about: 'viewers whose messages are never answered' },
  'livliv-stage:person': { group: 'collab', about: 'your name in 好友联播' },
  'livliv-stage:relay': { group: 'collab', about: 'the 好友联播 service address' },
  'livliv-stage:collab-service': { group: 'collab', about: 'the desktop\'s own 好友联播 service, or another' },
  'livliv-stage:editor': { group: 'window', about: 'which tab holds the editor (a lock, not a preference)' },
  'livliv-stage:tabs': { group: 'window', about: 'the channel the editor\'s tabs talk on' },
  'livliv-stage:memory': { group: 'window', about: 'the channel memory changes are told on' },
  'livliv-stage:fake-mic': { group: 'dev', about: 'a recording played as the microphone (the dev server only)' },
} as const satisfies Record<string, { group: PrefGroup; about: string }>

export type PrefKey = keyof typeof PREFS

/** the preferences 恢复默认偏好 resets, in the order it lists them, with their names */
export const RESET_GROUPS = [
  { id: 'locale', label: '界面语言' },
  { id: 'quality', label: '画面质量' },
  { id: 'inputs', label: '设备选择' },
  { id: 'mixer', label: '音量' },
  { id: 'layout', label: '面板布局' },
] as const satisfies readonly { id: PrefGroup; label: string }[]
export type ResetGroup = typeof RESET_GROUPS[number]['id']

/** the names in these groups */
export const keysOf = (groups: readonly PrefGroup[]) => (Object.keys(PREFS) as PrefKey[]).filter((key) => groups.includes(PREFS[key].group))

/** the saved values of these groups removed; nothing else */
export function clearGroups(groups: readonly ResetGroup[], storage: Pick<Storage, 'removeItem'> = localStorage) {
  for (const key of keysOf(groups)) storage.removeItem(key)
}
