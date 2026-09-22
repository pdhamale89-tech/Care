import { useApp } from '../../core/hooks/useApp.js'
import Icon from '../components/Icon.jsx'

const NAV_SECTIONS = [
  {
    label: 'Performance Reports',
    items: [
      { id: 'cco', label: 'CCO Overview', icon: 'dashboards' },
    ],
  },
  {
    label: 'Workforce Reports',
    items: [
      { id: 'outage', label: 'Outage Report', icon: 'warning' },
      { id: 'epiHc', label: 'Epi HC', icon: 'trending' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { id: 'whatIf', label: 'What-If Simulator', icon: 'calculator' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'reports', label: 'Reports', icon: 'document' },
      {
        id: 'calendar',
        label: 'Calendar',
        icon: 'calendar',
        children: [
          { id: 'fiscalCalendar', label: 'Fiscal Calendar' },
        ],
      },
      { id: 'glossary', label: 'Glossary', icon: 'book' },
    ],
  },
]

const SYSTEM_ITEMS = [
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
]

export default function Sidebar() {
  const { currentTab, navTo, sidenavOpen, toggleSidenav } = useApp()
  const itemClass = (id) => 'nav-item' + (currentTab === id ? ' active' : '')

  return (
    <nav className={'sidenav' + (sidenavOpen ? ' open' : '')} aria-label="Primary">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="nav-group-label">{section.label}</div>
          {section.items.map((item) => (
            <div key={item.id}>
              <button type="button" className={itemClass(item.id)} onClick={() => navTo(item.id)}>
                <span className="ic"><Icon name={item.icon} size={18} /></span><span className="lbl">{item.label}</span>
              </button>
              {item.children && sidenavOpen && (
                <div>
                  {item.children.map((child) => (
                    <button type="button" key={child.id} className={itemClass(child.id) + ' sub'} onClick={() => navTo(child.id)}>
                      <span className="lbl">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 'auto' }}>
        <div className="nav-group-label">System</div>
        {SYSTEM_ITEMS.map((item) => (
          <button type="button" key={item.id} className={itemClass(item.id)} onClick={() => navTo(item.id)}>
            <span className="ic"><Icon name={item.icon} size={18} /></span><span className="lbl">{item.label}</span>
          </button>
        ))}
        <button type="button" className="nav-item collapse-btn" onClick={toggleSidenav} aria-label={sidenavOpen ? 'Collapse navigation' : 'Expand navigation'}>
          <span className="ic"><Icon name="chevronLeft" size={16} style={{ transform: sidenavOpen ? 'none' : 'rotate(180deg)' }} /></span>
          <span className="lbl">Collapse</span>
        </button>
      </div>
    </nav>
  )
}
