const NAV_SECTIONS = [
  {
    label: 'Performance Reports',
    items: [
      { label: 'Daily CCO Dashboard', page: 'cco', view: 'daily' },
      { label: 'Weekly CCO Dashboard', page: 'cco', view: 'weekly' },
      { label: 'Qtrly CCO Dashboard', page: 'cco', view: 'quarterly' },
    ],
  },
  {
    label: 'Workforce Reports',
    items: [
      { label: 'Outage Report', page: 'outage' },
      { label: 'Epicenter HC', page: 'epicenter' },
    ],
  },
  {
    label: 'KPI Reports',
    items: [
      { label: 'Voice Queue KPI', page: 'kpi', kview: 'voice' },
      { label: 'Chat and Email KPI', page: 'kpi', kview: 'digital' },
      { label: 'Intraday Performance', page: 'kpi', kview: 'intraday' },
    ],
  },
]

export default function Sidebar({ currentPage, ccoView, kView, onSelect }) {
  function isActive(item) {
    if (item.page !== currentPage) return false
    if (item.view && item.view !== ccoView) return false
    if (item.kview && item.kview !== kView) return false
    return true
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        Care SPOG
        <span>Single Pane Of Glass</span>
      </div>
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="sidebar-section-label">{section.label}</div>
          {section.items.map((item) => (
            <div
              key={item.label}
              className={'sidebar-item' + (isActive(item) ? ' active' : '')}
              onClick={() => onSelect(item)}
            >
              {item.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
