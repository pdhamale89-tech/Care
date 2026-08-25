import { useApp } from '../../context/AppContext.jsx'

export default function Topbar() {
  const { breadcrumb, theme, toggleTheme, lastUpdated } = useApp()
  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1>Care SPOG</h1>
        <span className="bc">{breadcrumb}</span>
      </div>
      <div className="topbar-r">
        <span className="tog-lbl">☀️</span>
        <label className="theme-tog">
          <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
          <div className="tog-track"><div className="tog-thumb"></div></div>
        </label>
        <span className="tog-lbl">🌙</span>
        <span className="last-updated">Last Updated: {lastUpdated}</span>
      </div>
    </div>
  )
}
