// LivLiv Stage.app after the rename. A Mac that installs VTuber Stage from the DMG keeps the old app beside it: the
// same app id and the same settings, and the Dock may still open the old one. The first time the renamed app starts
// and finds the old one, it offers once to move it to the Trash (main.ts asks, settings.oldAppAsked remembers).
// Plain Node: main.ts gives it what it needs.
import { join } from 'node:path'

/** where an installed LivLiv Stage.app may be, skipping the app that is running (in case it still has the old name) */
export function oldApps(home: string, exe: string, exists: (path: string) => boolean): string[] {
  return ['/Applications/LivLiv Stage.app', join(home, 'Applications', 'LivLiv Stage.app')]
    .filter((path) => exists(path) && !exe.startsWith(path + '/'))
}

const TEXT = {
  'zh-Hans': { message: '要把旧的 LivLiv Stage 移到废纸篓吗？', detail: 'LivLiv Stage 现在叫 VTuber Stage。旧版还在「应用程序」里，打开它会用旧版本。你的设置、密钥和项目都在新版里，不受影响。', trash: '移到废纸篓', keep: '保留' },
  'zh-Hant': { message: '要把舊的 LivLiv Stage 移到垃圾桶嗎？', detail: 'LivLiv Stage 現在叫 VTuber Stage。舊版還在「應用程式」裡，打開它會用到舊版本。你的設定、金鑰和專案都在新版裡，不受影響。', trash: '移到垃圾桶', keep: '保留' },
  en: { message: 'Move the old LivLiv Stage to the Trash?', detail: 'LivLiv Stage is now VTuber Stage. The old app is still in Applications, and opening it runs the old version. Your settings, keys and projects are in the new one and stay as they are.', trash: 'Move to Trash', keep: 'Keep It' },
  ja: { message: '古い LivLiv Stage をゴミ箱に入れますか？', detail: 'LivLiv Stage は VTuber Stage になりました。古いアプリがアプリケーションフォルダに残っていて、開くと古いバージョンが起動します。設定、キー、プロジェクトは新しいアプリにそのまま残ります。', trash: 'ゴミ箱に入れる', keep: '残す' },
}

/** the question in the system's language (app.getLocale()): Chinese, Japanese, or else English */
export function oldAppText(locale: string) {
  const l = locale.toLowerCase()
  return l.startsWith('zh') ? (/hant|tw|hk|mo/.test(l) ? TEXT['zh-Hant'] : TEXT['zh-Hans']) : l.startsWith('ja') ? TEXT.ja : TEXT.en
}
