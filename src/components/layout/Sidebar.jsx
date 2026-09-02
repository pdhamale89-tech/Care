import { useApp } from '../../context/AppContext.jsx'

const NAV_SECTIONS = [
  {
    label: 'Performance Reports',
    items: [
      { id: 'cco', label: 'CCO Overview', icon: '📊' },
    ],
  },
  {
    label: 'Workforce Reports',
    items: [
      { id: 'outage', label: 'Outage Report', icon: '⚠️' },
      { id: 'epicenter', label: 'Epicenter HC', icon: '👥' },
      { id: 'epiHc', label: 'Epi HC', icon: '📈' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'reports', label: 'Reports', icon: '📄' },
      {
        id: 'calendar',
        label: 'Calendar',
        icon: '📅',
        children: [
          { id: 'planningCalendar', label: 'Planning Calendar' },
          { id: 'fiscalCalendar', label: 'Fiscal Calendar' },
        ],
      },
      { id: 'glossary', label: 'Glossary', icon: '📖' },
    ],
  },
]

const SYSTEM_ITEMS = [
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
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
              <div key={item.id}>
                <div className={itemClass(item.id)} onClick={() => navTo(item.id)}>
                  <span className="ic">{item.icon}</span>{item.label}
                </div>
                {item.children && (
                  <div className="sb-sub">
                    {item.children.map((child) => (
                      <div key={child.id} className={itemClass(child.id)} onClick={() => navTo(child.id)}>
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-section-label">System</div>
        {SYSTEM_ITEMS.map((item) => (
          <div key={item.id} className={itemClass(item.id)} onClick={() => navTo(item.id)}>
            <span className="ic">{item.icon}</span>{item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
