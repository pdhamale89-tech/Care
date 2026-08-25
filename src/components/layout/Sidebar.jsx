import { useApp } from '../../context/AppContext.jsx'

const NAV_SECTIONS = [
  {
    label: 'Performance Reports',
    items: [
      { id: 'cco', label: 'CCO Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'Workforce Reports',
    items: [
      { id: 'outage', label: 'Outage Report', icon: '⚠️' },
      { id: 'epicenter', label: 'Epicenter HC', icon: '👥' },
    ],
  },
  {
    label: 'KPI Reports',
    items: [
      { id: 'kpi-voice', label: 'Voice Queue KPI', icon: '📞' },
      { id: 'kpi-digital', label: 'Chat and Email KPI', icon: '💬' },
      { id: 'kpi-intraday', label: 'Intraday Performance', icon: '⏱️' },
    ],
  },
]

export default function Sidebar() {
  const { currentTab, navTo } = useApp()
  const itemClass = (id) => 'sb-i' + (currentTab === id ? ' active' : '')

  return (
    <div className="sidebar">
      <div className="sidebar-logo-area">
        <div className="sidebar-logo">C</div>
        <div className="sidebar-brand">Care SPOG<small>Single Pane Of Glass</small></div>
      </div>
      <div className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        <div className={itemClass('home')} onClick={() => navTo('home')}><span className="ic">🏠</span>Home</div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <div key={item.id} className={itemClass(item.id)} onClick={() => navTo(item.id)}>
                <span className="ic">{item.icon}</span>{item.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
