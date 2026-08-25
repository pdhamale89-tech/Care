import { regionCountryMap, managers, queueNames, departments } from '../../data/mockGenerators.js'

export default function EpicenterFilterBar({ activeRegion, filters, onChange }) {
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
        <label>Queue Name</label>
        <select value={filters.queue} onChange={(e) => onChange('queue', e.target.value)}>
          <option>All</option>
          {queueNames.map((q) => (
            <option key={q}>{q}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Department</label>
        <select value={filters.dept} onChange={(e) => onChange('dept', e.target.value)}>
          <option>All</option>
          {departments.map((d) => (
            <option key={d.name}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Search Agent / Badge ID</label>
        <input
          type="text"
          placeholder="Type name or badge ID..."
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
        />
      </div>
    </div>
  )
}
