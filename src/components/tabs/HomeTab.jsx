import { useApp } from '../../context/AppContext.jsx'

const SECTIONS = [
  { key: 'cco', tab: 'cco', icon: '📊', title: 'CCO Overview', tag: 'Weekly and quarterly SLA, volume, and backlog performance.' },
  { key: 'outage', tab: 'outage', icon: '⚠️', title: 'Outage Report', tag: 'Agent schedule adherence and unplanned-outage breakdowns by manager.' },
  { key: 'epicenter', tab: 'epicenter', icon: '👥', title: 'Epicenter HC', tag: 'Headcount roster across departments, queues, and managers.' },
]

export default function HomeTab() {
  const { navTo } = useApp()

  return (
    <div className="tab-panel active">
      <div className="home-hero-header">
        <div className="home-hero-eyebrow">Care SPOG · Single Pane Of Glass</div>
        <h1 className="home-hero-h1">Customer support operations, in one workspace</h1>
        <p className="home-hero-sub">Performance and workforce reporting for the Care support organization.</p>
      </div>

      <div className="home-hero-grid">
        {SECTIONS.map((s) => (
          <button key={s.key} type="button" className={`home-hero-card ${s.key}`} onClick={() => navTo(s.tab)}>
            <span className="home-hero-ic">{s.icon}</span>
            <span className="home-hero-title">{s.title}</span>
            <span className="home-hero-tag">{s.tag}</span>
            <span className="home-hero-cta">Open →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
