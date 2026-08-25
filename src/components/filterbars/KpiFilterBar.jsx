import { regionCountryMap, getWeeksForQuarter } from '../../data/mockGenerators.js'

const QUARTERS = ['FQ1', 'FQ2', 'FQ3', 'FQ4']

const QUEUE_OPTIONS = {
  voice: ['Voice - Sales', 'Voice - Support', 'Voice - Escalations'],
  digital: ['Email', 'Chat'],
  intraday: ['Voice', 'Email', 'Chat'],
}

export default function KpiFilterBar({ activeRegion, kView, filters, onChange }) {
  const countries = regionCountryMap[activeRegion] || ['All']
  const weeks = getWeeksForQuarter(filters.quarter)
  const queues = QUEUE_OPTIONS[kView]

  return (
    <div className="filters-bar">
      <div className="filter-group">
        <label>Sub Region / Country</label>
        <select value={filters.country} onChange={(e) => onChange('country', e.target.value)}>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Fiscal Quarter</label>
        <select value={filters.quarter} onChange={(e) => onChange('quarter', e.target.value)}>
          {QUARTERS.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Fiscal Week (52 Weeks Total)</label>
        <select value={filters.week} onChange={(e) => onChange('week', e.target.value)}>
          <option value="All">All Weeks (13)</option>
          {weeks.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Queue</label>
        <select value={filters.queue} onChange={(e) => onChange('queue', e.target.value)}>
          {queues.map((q) => (
            <option key={q}>{q}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
