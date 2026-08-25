import { regionCountryMap, managers } from '../../data/mockGenerators.js'

const STATUSES = ['All', 'Available', 'Unplanned Outage', 'Scheduled Off']

export default function OutageFilterBar({ activeRegion, filters, onChange }) {
  const countries = regionCountryMap[activeRegion] || ['All']

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
        <label>Manager</label>
        <select value={filters.manager} onChange={(e) => onChange('manager', e.target.value)}>
          <option>All</option>
          {managers.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Agent Status</label>
        <select value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Search Agent</label>
        <input
          type="text"
          placeholder="Type agent name..."
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
        />
      </div>
    </div>
  )
}
