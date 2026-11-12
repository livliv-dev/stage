// Files a page of ours saves (a recorded video, a scene file): straight into the Downloads folder under their own name
// (" (2)" and on when one is there already), then shown in Finder / Explorer, rather than left to Electron's own
// handling. Only our pages load here (security.ts), so nothing else can save a file this way.
import { app, session, shell } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'

export function saveDownloads() {
  session.defaultSession.on('will-download', (_e, item) => {
    const dir = app.getPath('downloads'), name = path.basename(item.getFilename()) || 'download'
    const ext = path.extname(name), base = name.slice(0, name.length - ext.length)
    let target = path.join(dir, name)
    for (let n = 2; existsSync(target); n++) target = path.join(dir, `${base} (${n})${ext}`)
    item.setSavePath(target)
    item.once('done', (_d, state) => { if (state === 'completed') shell.showItemInFolder(target) })
  })
}
