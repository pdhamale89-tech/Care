import { useApp } from '../../core/hooks/useApp.js'
import Icon from '../components/Icon.jsx'

export default function Topbar() {
  const { breadcrumb, theme, toggleTheme, lastUpdated, sidenavOpen, toggleSidenav, navTo } = useApp()
  return (
    <header className="masthead">
      <button type="button" className="icon-btn" onClick={toggleSidenav} aria-label="Toggle navigation" aria-expanded={sidenavOpen}>
        <Icon name="menu" size={20} />
      </button>
      <div className="brand">
        <span className="mark">C</span>
        Care SPOG
        <span className="divider"></span>
        <span className="app-name">{breadcrumb}</span>
      </div>
      <div className="spacer"></div>
      <label className="m-search" htmlFor="globalSearch">
        <Icon name="search" size={16} />
        <input id="globalSearch" type="search" placeholder="Search agents, queues, reports…" />
      </label>
      <button type="button" className="icon-btn" onClick={() => navTo('notifications')} aria-label="Notifications">
        <Icon name="bell" size={19} />
      </button>
      <span className="last-updated">Last Updated: {lastUpdated}</span>
      <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle color theme">
        <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
      </button>
      <div className="avatar" title="Care SPOG">CS</div>
    </header>
  )
}
