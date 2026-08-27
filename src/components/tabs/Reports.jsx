import { useApp } from '../../context/AppContext.jsx'

const REPORTS = [
  { name: 'Voice Queue KPI', icon: '📞', category: 'Voice', description: 'Queue-level SLA, AHT and abandonment KPIs for voice.', url: null },
  { name: 'Voice Queue Intraday', icon: '⏱️', category: 'Voice', description: 'Intraday voice queue volume and staffing vs plan.', url: null },
  { name: 'Voice Agent KPI', icon: '🎧', category: 'Voice', description: 'Agent-level voice KPIs — AHT, occupancy and quality.', url: null },
  { name: 'Genesys Skill Data', icon: '🧩', category: 'Genesys', description: 'Skill-based routing configuration and skill group volumes.', url: null },
]

export default function Reports() {
  const { showToast } = useApp()

  function handleOpen(report) {
    if (report.url) {
      window.open(report.url, '_blank', 'noopener,noreferrer')
    } else {
      showToast(`${report.name} link not configured yet`, 'toast-info')
    }
  }

  function handleKeyDown(e, report) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen(report)
    }
  }

  return (
    <div className="tab-panel active">
      <div className="report-grid">
        {REPORTS.map((r) => (
          <div
            className={'report-card' + (r.url ? '' : ' disabled')}
            key={r.name}
            role="button"
            tabIndex={0}
            onClick={() => handleOpen(r)}
            onKeyDown={(e) => handleKeyDown(e, r)}
          >
            <div className="report-card-icon">{r.icon}</div>
            <div className="report-card-name">{r.name}</div>
            <div className="report-card-category">{r.category}</div>
            <div className="report-card-desc">{r.description}</div>
            <div className="report-card-cta">{r.url ? 'Open Report ↗' : 'Coming soon'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
