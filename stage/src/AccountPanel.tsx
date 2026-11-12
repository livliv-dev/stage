import { tr } from './i18n'
import { Check, ExternalLink, LoaderCircle, Sparkles, UserPlus, Volume2, Zap } from 'lucide-react'
import { cancelConnect, connect, logout, openConnect, useAccount } from './livliv'
import { onSite } from './host'

const BENEFITS = [
  { icon: UserPlus, tone: 'peach', title: '带入云端角色', hint: '把你在 livliv.ai 的角色加入舞台。' },
  { icon: Volume2, tone: 'lavender', title: '使用角色的声音', hint: '让角色用自己在 livliv.ai 的声音开口。' },
  { icon: Zap, tone: 'mint', title: '无需配置 API', hint: '角色语音直接使用 livliv.ai 积分。' },
]
export function AccountPanel({ onAdd }: { onAdd: () => void }) {
  const account = useAccount()
  return <section className="account account-panel">
    <div className="account-hero">
      <span className="account-spark" aria-hidden="true"><Sparkles size={24} /></span>
      <span className="account-site">livliv.ai</span>
      <h3>{tr("你的角色，来 Stage 同台")}</h3>
      <p>{account.status === 'in' ? tr("在 Stage 使用你的 livliv.ai 角色与声音。") : tr("登录后，把 livliv.ai 的角色与声音带到舞台。")}</p>
      {account.status === 'in' && <span className="account-connected"><Check size={12} />{tr("已连接")}</span>}
    </div>
    {account.status === 'in' ? <div className="account-profile">
      <div className="account-person"><span className="account-initial" aria-hidden="true">{[...account.email][0]?.toUpperCase() || 'L'}</span><span><b>{account.email}</b><small>{tr("积分")} {account.points}</small></span></div>
      <button className="primary account-cta" onClick={onAdd}><UserPlus size={15} />{tr("从 livliv.ai 增加")}</button>
      {onSite  // signed in to the site itself: its own pages manage the account
        ? <a className="link account-signout" href="/me" target="_blank" rel="noopener">{tr("在 livliv.ai 管理")}<ExternalLink size={12} /></a>
        : <button className="link account-signout" onClick={() => void logout()}>{tr("退出登录")}</button>}
    </div> : account.connect ? <div className="account-connect">
      <span className="account-connect-status"><LoaderCircle className="spin" size={15} />{tr("在浏览器完成登录")}</span>
      <p className="hint">{tr("网页需要验证码时，输入这串代码")}</p>
      <strong className="account-code num">{account.connect.code}</strong>
      <div className="row"><button onClick={openConnect}><ExternalLink size={14} />{tr("再打开网页")}</button><button onClick={cancelConnect}>{tr("取消")}</button></div>
    </div> : <div className="account-login">
      <button className="account-cta" disabled={account.closed} onClick={() => void connect()}><ExternalLink size={15} />{tr("登录 livliv.ai")}</button>
      {account.closed && <p className="hint account-unavailable">{tr("帐号登录暂未开放")}</p>}
    </div>}
    {account.error && !account.closed && <p className="hint error" role="alert">{tr(account.error ?? '')}</p>}
    <div className="account-benefits">{BENEFITS.map((benefit) => <div className="account-benefit" key={benefit.title}><span className={'benefit-icon ' + benefit.tone}><benefit.icon size={17} /></span><div><b>{tr(benefit.title ?? '')}</b><p>{tr(benefit.hint ?? '')}</p></div></div>)}</div>
  </section>
}
