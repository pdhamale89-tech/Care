import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { regionCountryMap, managers, queueNames, departments, getWeeksForQuarter, REGIONS } from '../../data/mockGenerators.js'

const QUARTERS = ['FQ1', 'FQ2', 'FQ3', 'FQ4']
const CLASSIFICATIONS = ['All', 'FED', 'Global Sales', 'Consumer']
const STATUSES = ['All', 'Available', 'Unplanned Outage', 'Scheduled Off']

export default function FilterBar() {
  const {
    currentTab, showFilters, activeRegion, setActiveRegion,
    ccoFilters, setCcoFilter, ccoView, setCcoView, outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    clearFilters,
  } = useApp()
  const [expanded, setExpanded] = useState(true)

  if (!showFilters) return null

  const countries = regionCountryMap[activeRegion] || ['All']
  const isCco = currentTab === 'cco'
  const isOutage = currentTab === 'outage'
  const isEpicenter = currentTab === 'epicenter'

  return (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <div className="filter-panel-title" onClick={() => setExpanded((e) => !e)}>
          <span className="filter-panel-icon">🔎</span>Filters
          <span className={'filter-panel-caret' + (expanded ? '' : ' collapsed')}>▾</span>
        </div>
        {isCco && (
          <div className="period-bar">
            {[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly']].map(([v, label]) => (
              <button key={v} type="button" className={'p-btn' + (ccoView === v ? ' active' : '')} onClick={() => setCcoView(v)}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <>
          <div className="filter-grid">
            <div className="filter-group">
              <label>Region</label>
              <select value={activeRegion} onChange={(e) => setActiveRegion(e.target.value)}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {isCco && (
              <>
                <div className="filter-group">
                  <label>Sub Region / Country</label>
                  <select value={ccoFilters.subRegion} onChange={(e) => setCcoFilter('subRegion', e.target.value)}>
                    {countries.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Fiscal Quarter</label>
                  <select value={ccoFilters.quarter} onChange={(e) => setCcoFilter('quarter', e.target.value)}>
                    {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Fiscal Week (52 Weeks Total)</label>
                  <select value={ccoFilters.week} onChange={(e) => setCcoFilter('week', e.target.value)}>
                    <option value="All">All Weeks (13)</option>
                    {getWeeksForQuarter(ccoFilters.quarter).map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Classification</label>
                  <select value={ccoFilters.classification} onChange={(e) => setCcoFilter('classification', e.target.value)}>
                    {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            {isOutage && (
              <>
                <div className="filter-group">
                  <label>Sub Region / Country</label>
                  <select value={outageFilters.country} onChange={(e) => setOutageFilter('country', e.target.value)}>
                    {countries.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Fiscal Quarter</label>
                  <select value={outageFilters.quarter} onChange={(e) => setOutageFilter('quarter', e.target.value)}>
                    {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Fiscal Week (52 Weeks Total)</label>
                  <select value={outageFilters.week} onChange={(e) => setOutageFilter('week', e.target.value)}>
                    <option value="All">All Weeks (13)</option>
                    {getWeeksForQuarter(outageFilters.quarter).map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Manager</label>
                  <select value={outageFilters.manager} onChange={(e) => setOutageFilter('manager', e.target.value)}>
                    <option>All</option>
                    {managers.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Agent Status</label>
                  <select value={outageFilters.status} onChange={(e) => setOutageFilter('status', e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Search Agent</label>
                  <input type="text" placeholder="Type agent name..." value={outageFilters.search} onChange={(e) => setOutageFilter('search', e.target.value)} />
                </div>
              </>
            )}

            {isEpicenter && (
              <>
                <div className="filter-group">
                  <label>Sub Region / Country</label>
                  <select value={epicenterFilters.country} onChange={(e) => setEpicenterFilter('country', e.target.value)}>
                    {countries.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Manager</label>
                  <select value={epicenterFilters.manager} onChange={(e) => setEpicenterFilter('manager', e.target.value)}>
                    <option>All</option>
                    {managers.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Queue Name</label>
                  <select value={epicenterFilters.queue} onChange={(e) => setEpicenterFilter('queue', e.target.value)}>
                    <option>All</option>
                    {queueNames.map((q) => <option key={q}>{q}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Department</label>
                  <select value={epicenterFilters.dept} onChange={(e) => setEpicenterFilter('dept', e.target.value)}>
                    <option>All</option>
                    {departments.map((d) => <option key={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Search Agent / Badge ID</label>
                  <input type="text" placeholder="Type name or badge ID..." value={epicenterFilters.search} onChange={(e) => setEpicenterFilter('search', e.target.value)} />
                </div>
              </>
            )}

          </div>
          <div className="filter-clear-row">
            <button type="button" className="clear-all-btn" onClick={clearFilters}>✕ Clear All</button>
          </div>
        </>
      )}
    </div>
  )
}
