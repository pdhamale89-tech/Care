import { useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { useApp } from '../../../core/hooks/useApp.js'
import { getColors } from '../../../shared/themes/colors.js'
import {
  activeQuartersFromFilter, buildCountryList, buildFilteredData,
  calcAllCountries, calcCountry, applyCasesDriver, applyTcdDriver, applyHcDriver, f0, f1, f2, fp,
} from '../lib/apjWorkforceData.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'
import Icon from '../../../shared/components/Icon.jsx'
import { barDataLabels, lineDataLabels } from '../lib/datalabels.js'

// Ported from a standalone reference tool ("APJ Workforce Planner") supplied as a
// finished HTML file, restyled to match Care's own DDS look and generalized beyond its
// original fixed APJ-only country list — Region and Sub Region/Country now genuinely
// narrow which countries this tool covers, the same way every other tab's filters work
// (see buildCountryList in apjWorkforceData.js). Sample data is generated via the
// shared Filters panel (Fiscal Year, Fiscal Quarter, Fiscal Week, Region, Sub Region,
// Classification) exactly like every other tab's mock data — changing any of them
// reseeds the numbers shown here. The source tool's own Excel import and its separate
// Start Quarter/FY + top section-tab navigation are dropped: Fiscal Quarter now drives
// which quarter(s) are shown, and simple back/forward buttons replace the top tab bar
// (the Data Input table already has its own View Results/What-If buttons).

function safeNumber(raw) {
  if (raw === '' || raw === '-' || /\.$/.test(raw)) return undefined
  const n = Number(raw)
  return Number.isNaN(n) ? undefined : n
}

// "All" (or empty) means unfiltered, same convention as every other filter in the app.
function filterLabel(arr) {
  return (!arr || arr.length === 0 || arr.includes('All')) ? 'All' : arr.join(', ')
}

function PickerTabs({ options, value, onChange, ariaLabel }) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel} style={{ marginBottom: 14 }}>
      {options.map((opt) => (
        <button key={opt.value} type="button" role="tab" aria-selected={value === opt.value} className="tab" onClick={() => onChange(opt.value)}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const QUICK_SCENARIOS = [
  { key: 'growth', label: 'High Growth (+30% Orders)', mods: { orders: 30 }, text: 'High Growth Scenario', desc: 'Orders increase by 30% — What staffing is needed?' },
  { key: 'efficiency', label: 'Efficiency (+20% CRW)', mods: { crw: 20 }, text: 'Efficiency Gain Scenario', desc: 'CRW productivity improves by 20% — HC reduction potential' },
  { key: 'crisis', label: 'Crisis (+40% CR, +30% CPSR)', mods: { caserate: 40, cpsr: 30 }, text: 'Support Crisis Scenario', desc: 'Case rate +40%, CPSR +30% — Emergency staffing needs' },
  { key: 'optimistic', label: 'Best Case (+20% Ord, +15% CRW)', mods: { orders: 20, crw: 15 }, text: 'Best Case Scenario', desc: 'Orders +20% with +15% productivity — Balanced growth' },
  { key: 'pessimistic', label: 'Worst Case (+40% Ord, +25% CR)', mods: { orders: 40, caserate: 25, cpsr: 20 }, text: 'Worst Case Scenario', desc: 'Orders +40%, CR +25%, CPSR +20% — Maximum HC pressure' },
]
const DEFAULT_MODS = { orders: 0, caserate: 0, cpsr: 0, crw: 0, cases: 0, tcd: 0, headcount: 0 }

// Per-control quick-preset steps for the Scenario Builder cards — Orders uses a slightly
// different top-end preset (+20%) than the other five controls (+25%), matching the
// reference design.
const SCENARIO_CONTROLS = [
  { field: 'orders', label: 'Orders Change', presets: [-20, -10, 0, 10, 20, 50] },
  { field: 'caserate', label: 'Case Rate Change', presets: [-20, -10, 0, 10, 25, 50] },
  { field: 'cpsr', label: 'CPSR Change', presets: [-20, -10, 0, 10, 25, 50] },
  { field: 'crw', label: 'CRW (Productivity) Change', presets: [-20, -10, 0, 10, 25, 50] },
  { field: 'cases', label: 'Cases Change', presets: [-20, -10, 0, 10, 25, 50] },
  { field: 'tcd', label: 'TCD Change', presets: [-20, -10, 0, 10, 25, 50] },
]

function exportCsv(data, quarters, mods, countries, scopeCountryId) {
  let csv = 'Workforce Capacity Plan\n\n'
  quarters.forEach((qKey) => {
    const all = calcAllCountries(data, qKey, undefined, countries)
    const t = all.totals
    csv += `\n${qKey}\nCountry,GS Ord,CS Ord,Total,Cases,CR,TCD,CPSR,CRW,HC\n`
    countries.forEach((c) => {
      const r = all.countries[c.id]
      csv += `${c.name},${r.gsO},${r.csO},${r.totO},${r.totCs.toFixed(2)},${(r.cr * 100).toFixed(2)}%,${r.totTCD.toFixed(2)},${r.cpsr.toFixed(2)},${r.crw},${r.hc}\n`
    })
    csv += `TOTAL,${t.gsO},${t.csO},${t.totO},${t.totCs.toFixed(2)},${(t.cr * 100).toFixed(2)}%,${t.totTCD.toFixed(2)},${t.cpsr.toFixed(2)},,${t.hc}\n`
  })
  if (mods.orders || mods.caserate || mods.cpsr || mods.crw) {
    const scopeLabel = scopeCountryId && scopeCountryId !== 'ALL' ? countries.find((c) => c.id === scopeCountryId)?.name : 'All Countries'
    csv += `\n\nWHAT-IF SCENARIO (applied to: ${scopeLabel})\nOrders: ${mods.orders > 0 ? '+' : ''}${mods.orders}%  Case Rate: ${mods.caserate > 0 ? '+' : ''}${mods.caserate}%  CPSR: ${mods.cpsr > 0 ? '+' : ''}${mods.cpsr}%  CRW: ${mods.crw > 0 ? '+' : ''}${mods.crw}%\n`
    quarters.forEach((qKey) => {
      const all = calcAllCountries(data, qKey, mods, countries, scopeCountryId)
      const base = calcAllCountries(data, qKey, undefined, countries)
      csv += `\n${qKey} (SCENARIO)\nCountry,Scen Orders,Scen Cases,Scen HC,Base HC,Delta\n`
      countries.forEach((c) => {
        const r = all.countries[c.id]
        const br = base.countries[c.id]
        csv += `${c.name},${r.totO},${r.totCs.toFixed(2)},${r.hc},${br.hc},${r.hc - br.hc}\n`
      })
    })
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'Workforce_Plan.csv'
  a.click()
}

function DeltaCell({ base, scenario }) {
  const diff = scenario - base
  const pct = base === 0 ? 0 : (diff / base * 100)
  if (diff === 0) return <span style={{ color: 'var(--text-muted)' }}>0 (0.0%)</span>
  const cls = diff > 0 ? 'pos' : 'neg'
  const sign = diff > 0 ? '+' : ''
  return <span className={'badge ' + cls}>{sign}{f0(diff)} ({sign}{pct.toFixed(1)}%)</span>
}

function NavRow({ back, forward }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
      {back ? <button type="button" className="btn btn-sm btn-neutral" onClick={back.onClick}>{back.label}</button> : <span />}
      {forward ? <button type="button" className="btn btn-sm btn-primary" onClick={forward.onClick}>{forward.label}</button> : <span />}
    </div>
  )
}

export default function ApjWorkforcePlanner() {
  const { theme, activeRegions, apjFilters } = useApp()
  const colors = getColors(theme)
  const [activeTab, setActiveTab] = useState('input')
  // Orders & Targets data view — Forecast is today's editable table; Actual shows the
  // same table for now (columns will diverge from Forecast later).
  const [dataView, setDataView] = useState('forecast')
  const [selReg, setSelReg] = useState('ALL')
  const [showDet, setShowDet] = useState(false)
  const [mods, setMods] = useState(DEFAULT_MODS)
  const [scenario, setScenario] = useState(null)
  const [sbCollapsed, setSbCollapsed] = useState(false)
  const [savedAnalyses, setSavedAnalyses] = useState([])
  // Which country (or 'ALL') the current Scenario Builder inputs apply to — captured at
  // the moment the user actually edits a slider/preset/quick-scenario (not just whenever
  // they browse the Region/Country picker), so switching the picker to look at a
  // different country never silently re-broadcasts an existing scenario to it, and
  // switching to "All Countries" never re-broadcasts it to every country either.
  const [scenarioScope, setScenarioScope] = useState('ALL')

  // Fiscal Quarter filter narrows which quarters are shown (same "All = unfiltered"
  // convention as CCO Overview/What-If). Region + Sub Region/Country genuinely narrow
  // which countries this tool covers (same countriesForRegions/matchesMulti utilities
  // every other tab uses) — Region=All spans every region in Care's taxonomy, not just
  // APJ. Falls back to "All Countries" if the previously-picked country drops out of the
  // filtered set, without losing the selection in case the filter changes back.
  const activeQuarters = useMemo(() => activeQuartersFromFilter(apjFilters.quarter), [apjFilters.quarter])
  const countries = useMemo(() => buildCountryList(activeRegions, apjFilters.subRegion), [activeRegions, apjFilters.subRegion])
  const safeSelReg = countries.some((c) => c.id === selReg) ? selReg : 'ALL'
  const regionOptions = [{ value: 'ALL', label: 'All Countries' }, ...countries.map((c) => ({ value: c.id, label: c.name }))]

  const seedInputs = useMemo(() => ({
    activeRegions, subRegion: apjFilters.subRegion, week: apjFilters.week,
    classification: apjFilters.classification, fiscalYear: apjFilters.fiscalYear,
  }), [activeRegions, apjFilters.subRegion, apjFilters.week, apjFilters.classification, apjFilters.fiscalYear])
  const filterKey = JSON.stringify({ activeQuarters, seedInputs, countryIds: countries.map((c) => c.id) })

  const [data, setData] = useState(() => buildFilteredData(activeQuarters, seedInputs, countries))
  const [dataKey, setDataKey] = useState(filterKey)
  // `countries` (and activeQuarters) update immediately within this render via useMemo,
  // but `data` state only catches up on the *next* render once setData below commits —
  // for this one render they'd be inconsistent (data still keyed by the old country/
  // quarter set) if we read `data` directly, causing calcAllCountries to look up a
  // country that isn't in it yet. currentData is the render-consistent value to use
  // everywhere below instead of the (possibly stale-for-one-render) `data` state.
  const currentData = filterKey === dataKey ? data : buildFilteredData(activeQuarters, seedInputs, countries)
  if (filterKey !== dataKey) {
    setData(currentData)
    setDataKey(filterKey)
  }

  // No manual quarter picker any more — Fiscal Quarter (Filters panel) is the single
  // source of truth for which quarter Results/What-If show; picking one quarter there
  // narrows activeQuarters to it, "All" falls back to the first fiscal quarter.
  const qk = activeQuarters[0]

  const selectedFiltersLabel = [
    filterLabel(apjFilters.fiscalYear), filterLabel(apjFilters.quarter), filterLabel(apjFilters.week),
    filterLabel(activeRegions), filterLabel(apjFilters.subRegion), filterLabel(apjFilters.classification),
  ].join('_')

  function updOrd(cid, field, raw) {
    const n = safeNumber(raw)
    if (n === undefined || n < 0) return
    const num = Math.round(n)
    setData((prev) => ({
      ...prev,
      [cid]: { ...prev[cid], quarters: { ...prev[cid].quarters, [qk]: { ...prev[cid].quarters[qk], [field]: num } } },
    }))
  }
  function updPar(cid, field, raw) {
    const n = safeNumber(raw)
    if (n === undefined || n < 0) return
    const val = (field === 'gsRate' || field === 'csRate') ? n / 100 : n
    setData((prev) => ({ ...prev, [cid]: { ...prev[cid], params: { ...prev[cid].params, [field]: val } } }))
  }

  // Bidirectional driver edits (Case Rate/Cases/TCD/Headcount) — each recomputes that
  // country's pre-edit snapshot fresh from currentData via calcCountry (the same pure
  // function every other computed value in this component is derived from) and hands
  // off to the matching pure reverse-calc helper in apjWorkforceData.js, the single
  // source of truth for the driver/reverse-calc formulas. Only the metric being typed
  // into is the driver for that one edit; nothing here chains into another setData
  // call, so there is no risk of a circular recalculation.
  function updCaseRatePct(cid, raw) {
    const n = safeNumber(raw)
    if (n === undefined || n < 0) return
    const country = countries.find((c) => c.id === cid)
    const current = calcCountry(currentData, country, qk, undefined)
    const newTotalCases = (n / 100) * current.totO
    setData((prev) => ({ ...prev, [cid]: { ...prev[cid], params: applyCasesDriver(country, current, prev[cid].params, newTotalCases) } }))
  }
  function updCases(cid, raw) {
    const n = safeNumber(raw)
    if (n === undefined || n < 0) return
    const country = countries.find((c) => c.id === cid)
    const current = calcCountry(currentData, country, qk, undefined)
    setData((prev) => ({ ...prev, [cid]: { ...prev[cid], params: applyCasesDriver(country, current, prev[cid].params, n) } }))
  }
  function updTcd(cid, raw) {
    const n = safeNumber(raw)
    if (n === undefined || n < 0) return
    const country = countries.find((c) => c.id === cid)
    const current = calcCountry(currentData, country, qk, undefined)
    setData((prev) => ({ ...prev, [cid]: { ...prev[cid], params: applyTcdDriver(current, prev[cid].params, n) } }))
  }
  function updHc(cid, raw) {
    const n = safeNumber(raw)
    if (n === undefined || n < 0) return
    const country = countries.find((c) => c.id === cid)
    const current = calcCountry(currentData, country, qk, undefined)
    setData((prev) => ({ ...prev, [cid]: { ...prev[cid], params: applyHcDriver(current, prev[cid].params, n) } }))
  }

  function resetToSample() {
    if (!window.confirm('Reset all Data Input values back to the sample dataset for the current filters?')) return
    setData(buildFilteredData(activeQuarters, seedInputs, countries))
  }

  function setWI(field, val) {
    setMods((prev) => ({ ...prev, [field]: val }))
    setScenarioScope(safeSelReg)
  }
  function resetWI() {
    setMods(DEFAULT_MODS)
    setScenario(null)
    setScenarioScope('ALL')
  }
  function applyScenario(key) {
    const s = QUICK_SCENARIOS.find((x) => x.key === key)
    setMods({ ...DEFAULT_MODS, ...s.mods })
    setScenario({ text: s.text, desc: s.desc })
    setScenarioScope(safeSelReg)
  }

  const allForQ = useMemo(() => calcAllCountries(currentData, qk, undefined, countries), [currentData, qk, countries])
  const dSel = safeSelReg === 'ALL' ? allForQ.totals : allForQ.countries[safeSelReg]

  const trendSeries = useMemo(() => {
    const labels = activeQuarters
    const tO = [], tC = [], tT = [], tH = []
    activeQuarters.forEach((q) => {
      const a = calcAllCountries(currentData, q, undefined, countries)
      const d = safeSelReg === 'ALL' ? a.totals : a.countries[safeSelReg]
      tO.push(d.totO); tC.push(d.totCs); tT.push(d.totTCD); tH.push(d.hc)
    })
    return { labels, tO, tC, tT, tH }
  }, [currentData, activeQuarters, countries, safeSelReg])

  const wiBase = useMemo(() => calcAllCountries(currentData, qk, undefined, countries), [currentData, qk, countries])
  // The scenario built in Scenario Builder applies only to scenarioScope — the country
  // (or 'ALL') that was selected at the moment the sliders were last touched — not
  // whatever the Region/Country picker happens to show right now. So every other
  // country is computed at its plain baseline, and merely browsing the picker to look
  // at a different country (or "All Countries") never re-broadcasts an existing
  // scenario onto countries it wasn't built for.
  const wiScenario = useMemo(() => calcAllCountries(currentData, qk, mods, countries, scenarioScope), [currentData, qk, mods, countries, scenarioScope])
  const wiBaseSel = safeSelReg === 'ALL' ? wiBase.totals : wiBase.countries[safeSelReg]
  const wiScenSel = safeSelReg === 'ALL' ? wiScenario.totals : wiScenario.countries[safeSelReg]

  const impactMetrics = [
    { label: 'Total Orders', bv: wiBaseSel.totO, sv: wiScenSel.totO },
    { label: 'Total Cases', bv: wiBaseSel.totCs, sv: wiScenSel.totCs },
    { label: 'Total Contacts', bv: wiBaseSel.totTCD, sv: wiScenSel.totTCD },
    { label: 'Case Rate', bv: wiBaseSel.cr * 100, sv: wiScenSel.cr * 100, fmt: 'pct' },
    { label: 'Avg CPSR', bv: wiBaseSel.cpsr, sv: wiScenSel.cpsr, fmt: 'dec' },
    { label: 'HC Required', bv: wiBaseSel.hc, sv: wiScenSel.hc },
  ]

  // Saves a snapshot of the current scenario — scope (country/All Countries), quarter,
  // the Scenario Builder inputs, and the resulting baseline→scenario impact numbers — so
  // it can be compared later without needing to recreate the same slider inputs.
  function saveAnalysis() {
    const scopeName = safeSelReg === 'ALL' ? 'All Countries' : (countries.find((c) => c.id === safeSelReg)?.name || safeSelReg)
    setSavedAnalyses((prev) => [
      { id: Date.now(), savedAt: new Date().toLocaleString(), scope: scopeName, quarter: qk, mods: { ...mods }, metrics: impactMetrics },
      ...prev,
    ])
  }
  function removeAnalysis(id) {
    setSavedAnalyses((prev) => prev.filter((a) => a.id !== id))
  }

  const wiTrend = useMemo(() => {
    const baseQ = [], scenQ = []
    activeQuarters.forEach((q) => {
      const bAll = calcAllCountries(currentData, q, undefined, countries)
      const sAll = calcAllCountries(currentData, q, mods, countries, scenarioScope)
      const b = safeSelReg === 'ALL' ? bAll.totals : bAll.countries[safeSelReg]
      const s = safeSelReg === 'ALL' ? sAll.totals : sAll.countries[safeSelReg]
      baseQ.push(b.hc); scenQ.push(s.hc)
    })
    return { labels: activeQuarters, baseQ, scenQ }
  }, [currentData, activeQuarters, countries, safeSelReg, mods, scenarioScope])

  const barOpt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grace: '10%' } } }
  const lineOptLegend = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grace: '10%' } } }

  // Shared by both the Forecast and Actual views of Orders & Targets — identical for
  // now (Actual's columns will diverge from Forecast's later), kept in one place so the
  // table markup isn't duplicated between the two.
  function renderOrdersTable() {
    return (
      <div className="tw" style={{ padding: '0 18px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Country</th>
              <th>GS Orders</th><th>CS Orders</th><th>Total</th>
              <th>GS Rate %</th><th>CS Rate %</th>
              <th>Case Rate % <InfoBtn tip="<strong>Bidirectional</strong>Type a blended Case Rate directly — Total Cases is back-derived (Orders unchanged) and the GS/CS Rate % split is scaled proportionally to match." /></th>
              <th>Cases <InfoBtn tip="<strong>Bidirectional</strong>Type Total Cases directly — Case Rate reverse-calculates from it (Orders unchanged)." /></th>
              <th>CPSR</th>
              <th>TCD <InfoBtn tip="<strong>Bidirectional</strong>Type Total Contacts (TCD) directly — CPSR reverse-calculates from it (Cases and Case Rate unchanged)." /></th>
              <th>CRW</th>
              <th>Headcount <InfoBtn tip="<strong>Bidirectional</strong>Type Headcount directly — CRW reverse-calculates from it (TCD, Cases and Case Rate unchanged)." /></th>
            </tr>
          </thead>
          <tbody>
            {countries.length === 0 && (
              <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No APJ countries match the current Sub Region/Country filter selection.</td></tr>
            )}
            {countries.map((c) => {
              const o = currentData[c.id].quarters[qk] || { gs: 0, cs: 0 }
              const p = currentData[c.id].params
              const gv = Math.round(o.gs || 0)
              const cv = c.hasCS ? Math.round(o.cs || 0) : 0
              const r = allForQ.countries[c.id]
              return (
                <tr key={c.id}>
                  <td style={{ textAlign: 'left' }}>
                    <span className="pill-tag" style={{ marginRight: 8 }}>{c.cc}</span>{c.name}{!c.hasCS && <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}> (GS only)</span>}
                  </td>
                  <td><input className="wis-num-input" style={{ width: 72 }} type="number" step={1} min={0} value={gv} onChange={(e) => updOrd(c.id, 'gs', e.target.value)} /></td>
                  <td>{c.hasCS ? <input className="wis-num-input" style={{ width: 72 }} type="number" step={1} min={0} value={cv} onChange={(e) => updOrd(c.id, 'cs', e.target.value)} /> : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                  <td><strong>{f0(gv + cv)}</strong></td>
                  <td><input className="wis-num-input" style={{ width: 56 }} type="number" step={0.01} min={0} value={p.gsRate ? Number((p.gsRate * 100).toFixed(3)) : ''} onChange={(e) => updPar(c.id, 'gsRate', e.target.value)} /></td>
                  <td>{c.hasCS ? <input className="wis-num-input" style={{ width: 56 }} type="number" step={0.01} min={0} value={p.csRate ? Number((p.csRate * 100).toFixed(3)) : ''} onChange={(e) => updPar(c.id, 'csRate', e.target.value)} /> : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                  <td><input className="wis-num-input" style={{ width: 60 }} type="number" step={0.01} min={0} value={r.cr ? Number((r.cr * 100).toFixed(3)) : ''} onChange={(e) => updCaseRatePct(c.id, e.target.value)} /></td>
                  <td><input className="wis-num-input" style={{ width: 72 }} type="number" step={1} min={0} value={Math.round(r.totCs)} onChange={(e) => updCases(c.id, e.target.value)} /></td>
                  <td><input className="wis-num-input" style={{ width: 56 }} type="number" step={0.01} min={0} value={p.cpsr || ''} onChange={(e) => updPar(c.id, 'cpsr', e.target.value)} /></td>
                  <td><input className="wis-num-input" style={{ width: 72 }} type="number" step={1} min={0} value={Math.round(r.totTCD)} onChange={(e) => updTcd(c.id, e.target.value)} /></td>
                  <td><input className="wis-num-input" style={{ width: 56 }} type="number" step={1} min={0} value={p.crw || ''} onChange={(e) => updPar(c.id, 'crw', e.target.value)} /></td>
                  <td><input className="wis-num-input" style={{ width: 56 }} type="number" step={1} min={0} value={r.hc} onChange={(e) => updHc(c.id, e.target.value)} /></td>
                </tr>
              )
            })}
            {countries.length > 0 && (
              <tr className="tot-row">
                <td style={{ textAlign: 'left' }}>GRAND TOTAL</td>
                <td>{f0(countries.reduce((s, c) => s + (currentData[c.id].quarters[qk]?.gs || 0), 0))}</td>
                <td>{f0(countries.reduce((s, c) => s + (currentData[c.id].quarters[qk]?.cs || 0), 0))}</td>
                <td>{f0(countries.reduce((s, c) => s + (currentData[c.id].quarters[qk]?.gs || 0) + (currentData[c.id].quarters[qk]?.cs || 0), 0))}</td>
                <td colSpan={2}></td>
                <td>{fp(allForQ.totals.cr)}</td>
                <td>{f0(allForQ.totals.totCs)}</td>
                <td>{f2(allForQ.totals.cpsr)}</td>
                <td>{f0(allForQ.totals.totTCD)}</td>
                <td>—</td>
                <td>{f0(allForQ.totals.hc)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="tab-panel active">
      {activeTab === 'input' && (
        <>
          <div className="section-div">
            <h2>Orders & Targets <InfoBtn tip="<strong>Purpose</strong>Editable GS/CS order volumes and target rates (Case Rate, CPSR, CRW) per country and quarter, seeded from the Filters panel above. Drives every downstream calculation in Results and What-If." /></h2>
          </div>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-sm btn-neutral" onClick={() => setActiveTab('results')}>View Results →</button>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setActiveTab('whatif')}>What-If Analysis →</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-sm btn-neutral" onClick={() => exportCsv(currentData, activeQuarters, mods, countries, scenarioScope)}>Export CSV</button>
                <button type="button" className="clear-all-btn" onClick={resetToSample}>✕ Reset to Sample Data</button>
              </div>
            </div>

            <div style={{ padding: '14px 18px 0', fontSize: '.8125rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Data Filter By: </strong>{selectedFiltersLabel}
            </div>

            <div style={{ padding: '14px 18px 0' }}>
              <PickerTabs
                options={[{ value: 'actual', label: 'Actual' }, { value: 'forecast', label: 'Forecast' }]}
                value={dataView} onChange={setDataView} ariaLabel="Data View"
              />
            </div>

            {/* Actual and Forecast render the same table for now — dataView is wired
                up so the two can show different columns once Actual's data is defined. */}
            {renderOrdersTable()}
          </div>
        </>
      )}

      {activeTab === 'results' && (
        <>
          <NavRow back={{ label: '← Data Input', onClick: () => setActiveTab('input') }} forward={{ label: 'What-If Analysis →', onClick: () => setActiveTab('whatif') }} />
          <PickerTabs options={regionOptions} value={safeSelReg} onChange={setSelReg} ariaLabel="Region" />

          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-label">Total Orders</div><div className="kpi-value">{f0(dSel.totO)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Case Rate</div><div className="kpi-value">{(dSel.cr * 100).toFixed(1)}%</div></div>
            <div className="kpi-card"><div className="kpi-label">Total Cases</div><div className="kpi-value">{f0(dSel.totCs)}</div></div>
            <div className="kpi-card"><div className="kpi-label">CPSR</div><div className="kpi-value">{f2(dSel.cpsr)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Total Contacts</div><div className="kpi-value">{f0(dSel.totTCD)}</div></div>
            <div className="kpi-card"><div className="kpi-label">HC Required</div><div className="kpi-value">{f0(dSel.hc)}</div></div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">{safeSelReg === 'ALL' ? 'Executive Summary' : countries.find((x) => x.id === safeSelReg).name + ' Summary'}</div>
              <button type="button" className={'btn btn-sm ' + (showDet ? 'btn-primary' : 'btn-neutral')} onClick={() => setShowDet((d) => !d)}>{showDet ? 'Summary' : 'Detailed'}</button>
            </div>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Country</th>
                    <th>GS Ord</th><th>CS Ord</th><th>Total</th>
                    {showDet && <><th>GS Cases</th><th>CS Cases</th></>}
                    <th>Cases</th><th>CR</th><th>TCD</th><th>CPSR</th><th>CRW</th><th>HC</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.length === 0 && (
                    <tr><td colSpan={showDet ? 11 : 9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No APJ countries match the current Sub Region/Country filter selection.</td></tr>
                  )}
                  {(safeSelReg === 'ALL' ? countries : [countries.find((x) => x.id === safeSelReg)]).map((c) => {
                    const r = allForQ.countries[c.id]
                    return (
                      <tr key={c.id}>
                        <td style={{ textAlign: 'left' }}><span className="pill-tag" style={{ marginRight: 8 }}>{c.cc}</span>{c.name}</td>
                        <td>{f0(r.gsO)}</td><td>{c.hasCS ? f0(r.csO) : '—'}</td><td><strong>{f0(r.totO)}</strong></td>
                        {showDet && <><td>{f0(r.gsCs)}</td><td>{c.hasCS ? f0(r.csCs) : '—'}</td></>}
                        <td><strong>{f0(r.totCs)}</strong></td><td>{fp(r.cr)}</td><td>{f0(r.totTCD)}</td><td>{f2(r.cpsr)}</td><td>{f1(r.crw)}</td>
                        <td><strong>{f0(r.hc)}</strong></td>
                      </tr>
                    )
                  })}
                  {safeSelReg === 'ALL' && countries.length > 0 && (
                    <tr className="tot-row">
                      <td style={{ textAlign: 'left' }}>GRAND TOTAL</td>
                      <td>{f0(allForQ.totals.gsO)}</td><td>{f0(allForQ.totals.csO)}</td><td>{f0(allForQ.totals.totO)}</td>
                      {showDet && <><td>{f0(allForQ.totals.gsCs)}</td><td>{f0(allForQ.totals.csCs)}</td></>}
                      <td>{f0(allForQ.totals.totCs)}</td><td>{fp(allForQ.totals.cr)}</td><td>{f0(allForQ.totals.totTCD)}</td><td>{f2(allForQ.totals.cpsr)}</td><td>—</td>
                      <td>{f0(allForQ.totals.hc)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="s-grid">
            <div className="card">
              <div className="card-header"><div className="card-title">Orders Trend</div></div>
              <div className="chart-container">
                <Bar data={{ labels: trendSeries.labels, datasets: [{ data: trendSeries.tO, backgroundColor: colors.accentBlue, borderRadius: 4, datalabels: barDataLabels('', colors.accentBlue) }] }} options={barOpt} />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Cases Trend</div></div>
              <div className="chart-container">
                <Line data={{ labels: trendSeries.labels, datasets: [{ data: trendSeries.tC, borderColor: colors.accentGreen, backgroundColor: colors.accentGreen, fill: false, tension: .3, borderWidth: 2, pointRadius: 3, datalabels: lineDataLabels('', colors.accentGreen) }] }} options={barOpt} />
              </div>
            </div>
          </div>
          <div className="s-grid">
            <div className="card">
              <div className="card-header"><div className="card-title">Contacts Trend</div></div>
              <div className="chart-container">
                <Line data={{ labels: trendSeries.labels, datasets: [{ data: trendSeries.tT, borderColor: colors.accentPurple, backgroundColor: colors.accentPurple, fill: false, tension: .3, borderWidth: 2, pointRadius: 3, datalabels: lineDataLabels('', colors.accentPurple) }] }} options={barOpt} />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Headcount Trend</div></div>
              <div className="chart-container">
                <Bar data={{ labels: trendSeries.labels, datasets: [{ data: trendSeries.tH, backgroundColor: colors.accentOrange, borderRadius: 4, datalabels: barDataLabels('', colors.accentOrange) }] }} options={barOpt} />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'whatif' && (
        <>
          <NavRow back={{ label: '← Data Input', onClick: () => setActiveTab('input') }} forward={{ label: '← Results', onClick: () => setActiveTab('results') }} />
          <PickerTabs options={regionOptions} value={safeSelReg} onChange={setSelReg} ariaLabel="Region" />

          <div className={'wis-layout' + (sbCollapsed ? ' collapsed' : '')}>
            <aside className="wis-sidebar">
              <div className="wis-sidebar-head">
                {!sbCollapsed && (
                  <div className="wis-sidebar-title">
                    <span>Scenario Builder</span>
                    <InfoBtn tip="<strong>Purpose</strong>Orders, Case Rate, CPSR and CRW drive Cases &rarr; TCD &rarr; Headcount in sequence. Cases Change, TCD Change and Headcount Change are manual overrides layered on top of that chain at each stage (e.g. a known one-off volume bump beyond what Orders/Case Rate alone would predict), and cascade forward to the metrics after them.<br/><br/><strong>Scope</strong>These inputs apply only to the country (or All Countries) selected above at the moment you adjust them — every other country stays at its baseline, even if you browse to view it or switch to All Countries afterward." />
                  </div>
                )}
                <button
                  type="button" className="wis-sidebar-toggle"
                  onClick={() => setSbCollapsed((c) => !c)}
                  aria-label={sbCollapsed ? 'Expand Scenario Builder' : 'Collapse Scenario Builder'}
                  title={sbCollapsed ? 'Expand Scenario Builder' : 'Collapse Scenario Builder'}
                >
                  <Icon name="chevronLeft" size={16} style={{ transform: sbCollapsed ? 'rotate(180deg)' : 'none' }} />
                </button>
              </div>

              {!sbCollapsed && (
                <div className="wis-sidebar-body">
                  <button type="button" className="wis-sb-save" onClick={saveAnalysis}>Save Analysis</button>
                  <button type="button" className="wis-sb-reset" onClick={resetWI}>Reset All to Baseline</button>

                  <div className="wis-sb-quick">
                    <div className="wis-sb-quick-title">Quick Scenarios</div>
                    {QUICK_SCENARIOS.map((s) => (
                      <button type="button" key={s.key} className="wis-sb-quick-btn" onClick={() => applyScenario(s.key)}>{s.label}</button>
                    ))}
                    {scenario && (
                      <div className="ai-story" style={{ marginTop: 10 }}>
                        <div><div className="ai-story-title">{scenario.text}</div><div className="ai-story-text">{scenario.desc}</div></div>
                      </div>
                    )}
                  </div>

                  {SCENARIO_CONTROLS.map((g) => (
                    <div className="wis-sb-card" key={g.field}>
                      <div className="wis-sb-card-head">
                        <span className="lbl">{g.label}</span>
                        <span className="wis-sb-badge">
                          <span className="wis-num-wrap">
                            <input
                              type="number" className="wis-num-input" min={-50} max={100} step={1}
                              value={mods[g.field]}
                              onChange={(e) => { const n = safeNumber(e.target.value); if (n !== undefined) setWI(g.field, Math.min(100, Math.max(-50, Math.round(n)))) }}
                              onBlur={(e) => { e.target.value = String(mods[g.field]) }}
                            />%
                          </span>
                        </span>
                      </div>
                      <input type="range" min={-50} max={100} step={1} value={mods[g.field]} onChange={(e) => setWI(g.field, Number(e.target.value))} />
                      <div className="wis-sb-range"><span>-50%</span><span>0%</span><span>+100%</span></div>
                      <div className="wis-sb-presets">
                        {g.presets.map((p) => (
                          <button
                            type="button" key={p}
                            className={'wis-sb-preset' + (mods[g.field] === p ? ' active' : '')}
                            onClick={() => setWI(g.field, p)}
                          >
                            {p === 0 ? 'Base' : (p > 0 ? '+' : '') + p + '%'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>

            <div className="wis-main">
              <div className="section-div" style={{ marginTop: 0 }}>
                <h2>Projected Impact</h2>
              </div>
              <div className="kpi-grid">
                {impactMetrics.map((m) => {
                  const diff = m.sv - m.bv
                  const changed = Math.abs(diff) > 1e-9
                  const tone = diff >= 0 ? 'tone-g' : 'tone-r'
                  const deltaCls = diff >= 0 ? 'up' : 'down'
                  const pctChange = m.bv === 0 ? 0 : Math.abs((diff / m.bv) * 100)
                  let bvF, svF
                  if (m.fmt === 'pct') { bvF = m.bv.toFixed(1) + '%'; svF = m.sv.toFixed(1) + '%' }
                  else if (m.fmt === 'dec') { bvF = f2(m.bv); svF = f2(m.sv) }
                  else { bvF = f0(m.bv); svF = f0(m.sv) }
                  return (
                    <div className="kpi-card" key={m.label}>
                      <div className="kpi-label">{m.label}</div>
                      <div className="kpi-value">
                        {bvF}
                        {changed && <>{' '}<span className="kpi-value-arrow">→</span>{' '}<span className={'kpi-value-new ' + tone}>{svF}</span></>}
                      </div>
                      <div className="kpi-sub">Baseline: {bvF}</div>
                      <div className={'kpi-sub kpi-delta ' + deltaCls}>{diff >= 0 ? '▲' : '▼'} {pctChange.toFixed(1)}% change</div>
                    </div>
                  )
                })}
              </div>

              {savedAnalyses.length > 0 && (
                <div className="card">
                  <div className="card-header"><div className="card-title">Saved Analyses</div></div>
                  <div className="tw">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Saved At</th><th style={{ textAlign: 'left' }}>Scope</th><th>Quarter</th>
                          <th>Orders</th><th>Cases</th><th>HC Required</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedAnalyses.map((a) => {
                          const orders = a.metrics.find((m) => m.label === 'Total Orders')
                          const cases = a.metrics.find((m) => m.label === 'Total Cases')
                          const hc = a.metrics.find((m) => m.label === 'HC Required')
                          return (
                            <tr key={a.id}>
                              <td style={{ textAlign: 'left' }}>{a.savedAt}</td>
                              <td style={{ textAlign: 'left' }}>{a.scope}</td>
                              <td>{a.quarter}</td>
                              <td>{f0(orders.bv)} → <strong>{f0(orders.sv)}</strong></td>
                              <td>{f0(cases.bv)} → <strong>{f0(cases.sv)}</strong></td>
                              <td>{f0(hc.bv)} → <strong>{f0(hc.sv)}</strong></td>
                              <td><button type="button" className="clear-all-btn" onClick={() => removeAnalysis(a.id)}>✕ Remove</button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-header"><div className="card-title">Baseline vs Scenario Comparison</div></div>
                <div className="tw">
                  <table>
                    <thead>
                      <tr><th style={{ textAlign: 'left' }}>Country</th><th>Base Ord</th><th>Scen Ord</th><th>&Delta; Ord</th><th>Base Cases</th><th>Scen Cases</th><th>&Delta; Cases</th><th>Base HC</th><th>Scen HC</th><th>&Delta; HC</th></tr>
                    </thead>
                    <tbody>
                      {countries.length === 0 && (
                        <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No APJ countries match the current Sub Region/Country filter selection.</td></tr>
                      )}
                      {(safeSelReg === 'ALL' ? countries : [countries.find((x) => x.id === safeSelReg)]).map((c) => {
                        const br = wiBase.countries[c.id]
                        const sr = wiScenario.countries[c.id]
                        return (
                          <tr key={c.id}>
                            <td style={{ textAlign: 'left' }}><span className="pill-tag" style={{ marginRight: 8 }}>{c.cc}</span>{c.name}</td>
                            <td>{f0(br.totO)}</td><td>{f0(sr.totO)}</td><td><DeltaCell base={br.totO} scenario={sr.totO} /></td>
                            <td>{f0(br.totCs)}</td><td>{f0(sr.totCs)}</td><td><DeltaCell base={br.totCs} scenario={sr.totCs} /></td>
                            <td>{f0(br.hc)}</td><td><strong>{f0(sr.hc)}</strong></td><td><DeltaCell base={br.hc} scenario={sr.hc} /></td>
                          </tr>
                        )
                      })}
                      {safeSelReg === 'ALL' && countries.length > 0 && (
                        <tr className="tot-row">
                          <td style={{ textAlign: 'left' }}>GRAND TOTAL</td>
                          <td>{f0(wiBase.totals.totO)}</td><td>{f0(wiScenario.totals.totO)}</td><td><DeltaCell base={wiBase.totals.totO} scenario={wiScenario.totals.totO} /></td>
                          <td>{f0(wiBase.totals.totCs)}</td><td>{f0(wiScenario.totals.totCs)}</td><td><DeltaCell base={wiBase.totals.totCs} scenario={wiScenario.totals.totCs} /></td>
                          <td>{f0(wiBase.totals.hc)}</td><td><strong>{f0(wiScenario.totals.hc)}</strong></td><td><DeltaCell base={wiBase.totals.hc} scenario={wiScenario.totals.hc} /></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="s-grid">
                <div className="card">
                  <div className="card-header"><div className="card-title">HC Comparison</div></div>
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: safeSelReg === 'ALL' ? countries.map((c) => c.cc) : [countries.find((x) => x.id === safeSelReg).cc],
                        datasets: [
                          { label: 'Baseline', data: safeSelReg === 'ALL' ? countries.map((c) => wiBase.countries[c.id].hc) : [wiBase.countries[safeSelReg].hc], backgroundColor: theme === 'dark' ? 'rgba(164,184,205,.35)' : 'rgba(115,115,115,.25)', borderRadius: 4, datalabels: barDataLabels('', colors.textSecondary) },
                          { label: 'Scenario', data: safeSelReg === 'ALL' ? countries.map((c) => wiScenario.countries[c.id].hc) : [wiScenario.countries[safeSelReg].hc], backgroundColor: colors.accentBlue, borderRadius: 4, datalabels: barDataLabels('', colors.accentBlue) },
                        ],
                      }}
                      options={lineOptLegend}
                    />
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">Quarterly HC Trend</div></div>
                  <div className="chart-container">
                    <Line
                      data={{
                        labels: wiTrend.labels,
                        datasets: [
                          { label: 'Baseline HC', data: wiTrend.baseQ, borderColor: colors.textSecondary, backgroundColor: colors.textSecondary, borderDash: [5, 3], borderWidth: 2, tension: .3, pointRadius: 2, datalabels: lineDataLabels('', colors.textSecondary) },
                          { label: 'Scenario HC', data: wiTrend.scenQ, borderColor: colors.accentOrange, backgroundColor: colors.accentOrange, borderWidth: 2, tension: .3, pointRadius: 3, datalabels: lineDataLabels('', colors.accentOrange) },
                        ],
                      }}
                      options={lineOptLegend}
                    />
                  </div>
                </div>
              </div>

              <div className="s-grid full">
                <div className="card">
                  <div className="card-header"><div className="card-title">Change % by Metric</div></div>
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: SCENARIO_CONTROLS.map((g) => g.label.replace(' (Productivity)', '').replace(' Change', '')),
                        datasets: [{
                          data: SCENARIO_CONTROLS.map((g) => mods[g.field]),
                          backgroundColor: SCENARIO_CONTROLS.map((g) => (mods[g.field] > 0 ? colors.accentGreen : mods[g.field] < 0 ? colors.accentRed : colors.textSecondary)),
                          borderRadius: 4,
                          datalabels: barDataLabels('%', colors.textPrimary),
                        }],
                      }}
                      options={{
                        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                        scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, grace: '20%' } },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
