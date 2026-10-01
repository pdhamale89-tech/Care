import { useState } from 'react'
import { useApp } from '../../core/hooks/useApp.js'
import { countriesForRegions, managers, getWeeksForQuarter, REGIONS, vendors, weekEndingDates } from '../../modules/wfo/lib/mockGenerators.js'
import MultiSelectDropdown from '../components/MultiSelectDropdown.jsx'
import Icon from '../components/Icon.jsx'

const FISCAL_YEARS = ['FY26', 'FY27', 'FY28']
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
    ccoFilters, setCcoFilter, apjFilters, setApjFilter,
    ccoView, setCcoView, outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    clearFilters,
  } = useApp()
  const [expanded, setExpanded] = useState(true)

  if (!showFilters) return null

  const countries = countriesForRegions(activeRegions)
  const isApj = currentTab === 'apjPlanner'
  const isCco = currentTab === 'cco' || isApj
  // Weekly/Quarterly is a CCO Overview-only concept — APJ Workforce Planner has its
  // own Fiscal Quarter-driven period selector instead.
  const showViewToggle = currentTab === 'cco'
  const isOutage = currentTab === 'outage'
  const isEpicenter = currentTab === 'epiHc'
  // CCO Overview and APJ Workforce Planner show the same filter set (Fiscal
  // Year/Quarter/Week, Region, Sub Region, Classification) but each keeps its own
  // independent selections.
  const activeFilters = isApj ? apjFilters : ccoFilters
  const setActiveFilter = isApj ? setApjFilter : setCcoFilter

  const regionFilter = (
    <div className="filter-group">
      <label>Region</label>
      <MultiSelectDropdown options={REGIONS} selected={activeRegions} onChange={setActiveRegions} />
    </div>
  )

  return (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <div className="filter-panel-title" onClick={() => setExpanded((e) => !e)}>
          <span className="filter-panel-icon"><Icon name="search" size={14} /></span>Filters
          <span className={'filter-panel-caret' + (expanded ? '' : ' collapsed')}>▾</span>
        </div>
        {showViewToggle && (
          <div className="tabs" role="tablist" aria-label="View" style={{ margin: 0 }}>
            {[['weekly', 'Weekly'], ['quarterly', 'Quarterly']].map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={ccoView === v} className="tab" onClick={() => setCcoView(v)}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <>
          <div className="filter-grid">
            {!isCco && regionFilter}

            {isCco && (
              <>
                <div className="filter-group">
                  <label>Fiscal Year</label>
                  <MultiSelectDropdown options={FISCAL_YEARS} selected={activeFilters.fiscalYear} onChange={(v) => setActiveFilter('fiscalYear', v)} />
                </div>
                <div className="filter-group">
                  <label>Fiscal Quarter</label>
                  <MultiSelectDropdown options={QUARTERS} selected={activeFilters.quarter} onChange={(v) => setActiveFilter('quarter', v)} />
                </div>
                <div className="filter-group">
                  <label>Fiscal Week</label>
                  <MultiSelectDropdown options={weeksForQuarters(activeFilters.quarter)} selected={activeFilters.week} onChange={(v) => setActiveFilter('week', v)} allLabel="All Weeks" />
                </div>
                {regionFilter}
                <div className="filter-group">
                  <label>Sub Region / Country</label>
                  <MultiSelectDropdown options={countries} selected={activeFilters.subRegion} onChange={(v) => setActiveFilter('subRegion', v)} />
                </div>
                <div className="filter-group">
                  <label>Classification</label>
                  <MultiSelectDropdown options={CLASSIFICATIONS} selected={activeFilters.classification} onChange={(v) => setActiveFilter('classification', v)} />
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
                  <label>Fiscal Week</label>
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
