import { regionCountryMap, getWeeksForQuarter } from '../../data/mockGenerators.js'

const QUARTERS = ['FQ1', 'FQ2', 'FQ3', 'FQ4']
const CLASSIFICATIONS = ['All', 'FED', 'Global Sales', 'Consumer']

export default function CcoFilterBar({ activeRegion, filters, onChange }) {
  const countries = regionCountryMap[activeRegion] || ['All']
  const weeks = getWeeksForQuarter(filters.quarter)

  return (
    <div className="filters-bar">
      <div className="filter-group">
        <label>Sub Region / Country</label>
        <select value={filters.subRegion} onChange={(e) => onChange('subRegion', e.target.value)}>
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
        <label>Classification</label>
        <select value={filters.classification} onChange={(e) => onChange('classification', e.target.value)}>
          {CLASSIFICATIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
