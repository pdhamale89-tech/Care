import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { countriesForRegions, managers, getWeeksForQuarter, REGIONS, vendors, weekEndingDates } from '../../data/mockGenerators.js'
import MultiSelectDropdown from '../common/MultiSelectDropdown.jsx'

const QUARTERS = ['FQ1', 'FQ2', 'FQ3', 'FQ4']
const CLASSIFICATIONS = ['FED', 'Global Sales', 'Consumer']
const STATUSES = ['Available', 'Unplanned Outage', 'Scheduled Off']

function weeksForQuarters(quarters) {
  const list = (quarters || []).filter((q) => q !== 'All')
  const source = list.length ? list : QUARTERS
  return [...new Set(source.flatMap((q) => getWeeksForQuarter(q)))]
}

export default function FilterBar() {
  const {
    currentTab, showFilters, activeRegions, setActiveRegions,
    ccoFilters, setCcoFilter, ccoView, setCcoView, outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    clearFilters,
  } = useApp()
  const [expanded, setExpanded] = useState(true)

  if (!showFilters) return null

  const countries = countriesForRegions(activeRegions)
  const isCco = currentTab === 'cco' || currentTab === 'whatIf'
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
            {[['daily', 'Daily'], ['weekly', 'Weekly'], ['quarterly', 'Quarterly']].map(([v, label]) => (
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
              <MultiSelectDropdown options={REGIONS} selected={activeRegions} onChange={setActiveRegions} />
            </div>

            {isCco && (
              <>
                <div className="filter-group">
                  <label>Sub Region / Country</label>
                  <MultiSelectDropdown options={countries} selected={ccoFilters.subRegion} onChange={(v) => setCcoFilter('subRegion', v)} />
                </div>
                <div className="filter-group">
                  <label>Fiscal Quarter</label>
                  <MultiSelectDropdown options={QUARTERS} selected={ccoFilters.quarter} onChange={(v) => setCcoFilter('quarter', v)} />
                </div>
                <div className="filter-group">
                  <label>Fiscal Week (52 Weeks Total)</label>
                  <MultiSelectDropdown options={weeksForQuarters(ccoFilters.quarter)} selected={ccoFilters.week} onChange={(v) => setCcoFilter('week', v)} allLabel="All Weeks" />
                </div>
                <div className="filter-group">
                  <label>Classification</label>
                  <MultiSelectDropdown options={CLASSIFICATIONS} selected={ccoFilters.classification} onChange={(v) => setCcoFilter('classification', v)} />
                </div>
              </>
            )}

            {isOutage && (
              <>
                <div className="filter-group">
                  <label>Sub Region / Country</label>
                  <MultiSelectDropdown options={countries} selected={outageFilters.country} onChange={(v) => setOutageFilter('country', v)} />
                </div>
                <div className="filter-group">
                  <label>Fiscal Quarter</label>
                  <MultiSelectDropdown options={QUARTERS} selected={outageFilters.quarter} onChange={(v) => setOutageFilter('quarter', v)} />
                </div>
                <div className="filter-group">
                  <label>Fiscal Week (52 Weeks Total)</label>
                  <MultiSelectDropdown options={weeksForQuarters(outageFilters.quarter)} selected={outageFilters.week} onChange={(v) => setOutageFilter('week', v)} allLabel="All Weeks" />
                </div>
                <div className="filter-group">
                  <label>Manager</label>
                  <MultiSelectDropdown options={managers} selected={outageFilters.manager} onChange={(v) => setOutageFilter('manager', v)} />
                </div>
                <div className="filter-group">
                  <label>Agent Status</label>
                  <MultiSelectDropdown options={STATUSES} selected={outageFilters.status} onChange={(v) => setOutageFilter('status', v)} />
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
                  <label>Week Ending</label>
                  <MultiSelectDropdown options={weekEndingDates} selected={epicenterFilters.weekEnding} onChange={(v) => setEpicenterFilter('weekEnding', v)} />
                </div>
                <div className="filter-group">
                  <label>Vendor</label>
                  <MultiSelectDropdown options={vendors} selected={epicenterFilters.vendor} onChange={(v) => setEpicenterFilter('vendor', v)} />
                </div>
                <div className="filter-group">
                  <label>Manager</label>
                  <MultiSelectDropdown options={managers} selected={epicenterFilters.manager} onChange={(v) => setEpicenterFilter('manager', v)} />
                </div>
                <div className="filter-group">
                  <label>DB/OSP</label>
                  <MultiSelectDropdown options={['DB', 'OSP']} selected={epicenterFilters.dbOsp} onChange={(v) => setEpicenterFilter('dbOsp', v)} />
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
