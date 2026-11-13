import { ExternalLink } from 'lucide-react'
import { NetworkPanel } from './NetworkPanel'
import { motionSupported } from './networkTracking'
import { StageApiPanel } from './StageApiPanel'
import { desktop } from './desktop'
import { QUALITIES, setQuality, useQuality, type Quality } from './quality'
import { LANGUAGES, setLocale, tr, useLocale, type Locale } from './i18n'

/** stage/package.json's version, set by vite.config.ts */
declare const __STAGE_VERSION__: string
const REPO = 'https://github.com/livliv-dev/stage'

/** onDesktop: livliv.ai/stage's note on the desktop app (DesktopNotice.tsx), opened again from About */
export function GeneralPanel({ onDesktop }: { onDesktop?: () => void } = {}) {
  const locale = useLocale(), quality = useQuality()
  return <div className="general-panel">
    <section className="general-preferences">
      <label className="general-language"><span>{tr("界面语言")}</span><select className="language-select" value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>{LANGUAGES.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}</select></label>
      <label className="general-language"><span>{tr("画面质量")}</span><select value={quality} onChange={(event) => setQuality(event.target.value as Quality)}>{QUALITIES.map((q) => <option key={q.id} value={q.id}>{tr(q.label)}</option>)}</select></label>
    </section>
    {motionSupported() && <NetworkPanel />}
    <StageApiPanel />
    <section className="general-about">
      <h3>{tr("关于")}</h3>
      <div className="about-brand"><img src={`${import.meta.env.BASE_URL}wordmark.svg`} alt="LivLiv Stage" /><span className="about-version num">v{__STAGE_VERSION__}{!desktop && ` · ${tr("网页版")}`}</span></div>
      <p>{tr("面捕出镜、AI 互动和朋友同台。")}</p>
      <span className="about-player">{tr("由 LivLiv Player 驱动")}</span>
      <p className="about-legal">© LivLiv (livliv.ai)<br />{tr("代码采用 AGPL-3.0 许可，精选角色另有自己的许可。")}</p>
      <div className="about-links">{onDesktop && <button className="link" onClick={onDesktop}>{tr("桌面版")}</button>}<a href="https://livliv.ai" target="_blank" rel="noopener noreferrer">livliv.ai<ExternalLink size={12} /></a><a href={REPO} target="_blank" rel="noopener noreferrer">{tr("项目源码")}<ExternalLink size={12} /></a><a href={`${REPO}/blob/main/stage/public/characters/LICENSE.md`} target="_blank" rel="noopener noreferrer">{tr("角色许可")}<ExternalLink size={12} /></a><a href="https://github.com/livliv-dev/player" target="_blank" rel="noopener noreferrer">LivLiv Player<ExternalLink size={12} /></a></div>
    </section>
  </div>
}
