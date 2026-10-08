import { useMemo, useState } from 'react'
import { useApp } from '../../../core/hooks/useApp.js'
import { hashSeed, genKpiValue, pct, varClass, arrow, fmt, getWeeksForQuarter, summarizeActiveFilters } from '../lib/mockGenerators.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'
import DownloadBtn from '../../../shared/components/DownloadBtn.jsx'

// Same metric set/base values CCO Overview charts as "Actual vs Forecast" (the `hf`
// metrics there) — kept as its own small local copy rather than imported from
// CcoDashboard.jsx so the two files stay independent and this one doesn't trip the
// react(only-export-components) Fast-Refresh lint rule.
const METRIC_COLS = [
  { key: 'contacts', label: 'Contacts Offered', base: 2200, unit: '', decimals: 0 },
  { key: 'orders', label: 'Orders', base: 1150, unit: '', decimals: 0 },
  { key: 'cases', label: 'Cases', base: 3200, unit: '', decimals: 0 },
  { key: 'caseRate', label: 'Case Rate', base: 12.5, unit: '%', decimals: 1 },
  { key: 'cpsr', label: 'CPSR', base: 4.2, unit: '', decimals: 1 },
  { key: 'tcd', label: 'TCD', base: 48000, unit: '', decimals: 0 },
]

const STATUS_OPTIONS = [
  ['all', 'All'],
  ['onTarget', 'On Target'],
  ['minor', 'Minor Variance'],
  ['significant', 'Significant Variance'],
]

function statusFor(vp) {
  const a = Math.abs(vp)
  if (a <= 3) return { id: 'onTarget', label: 'On Target', cls: 'available' }
  if (a <= 8) return { id: 'minor', label: 'Minor Variance', cls: 'scheduled-off' }
  return { id: 'significant', label: 'Significant Variance', cls: 'unplanned' }
}

function getPeriodsForView(view, quarters, weeks) {
  const qList = (quarters || []).filter((q) => q !== 'All')
  const activeQuarters = qList.length ? qList : ['FQ1', 'FQ2', 'FQ3', 'FQ4']
  const allWeeks = activeQuarters.flatMap((q) => getWeeksForQuarter(q))
  const wList = (weeks || []).filter((w) => w !== 'All')
  if (view === 'weekly') return wList.length ? wList : allWeeks
  return activeQuarters
}

export default function ForecastVarianceLedger() {
  const { activeRegions, ccoFilters, ccoView } = useApp()
  const { subRegion, quarter, week, classification, fiscalYear } = ccoFilters
  const [metricFilter, setMetricFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const seed = useMemo(
    () => hashSeed(subRegion.join(',') + quarter.join(',') + week.join(',') + classification.join(',') + activeRegions.join(',') + ccoView + fiscalYear.join(',')),
    [subRegion, quarter, week, classification, activeRegions, ccoView, fiscalYear],
  )
  const periods = useMemo(() => getPeriodsForView(ccoView, quarter, week), [ccoView, quarter, week])

  const rows = useMemo(() => {
    const out = []
    periods.forEach((period, i) => {
      METRIC_COLS.forEach((c, ci) => {
        const { actual, forecast } = genKpiValue(c.base, seed + i * 7 + ci * 3, c.decimals)
        const variance = actual - forecast
        const vp = pct(actual, forecast)
        out.push({ id: `${period}-${c.key}`, period, metric: c, actual, forecast, variance, vp, status: statusFor(vp) })
      })
    })
    return out
  }, [periods, seed])

  const filteredRows = useMemo(() => rows
    .filter((r) => metricFilter === 'all' || r.metric.key === metricFilter)
    .filter((r) => statusFilter === 'all' || r.status.id === statusFilter),
  [rows, metricFilter, statusFilter])

  const summary = useMemo(() => {
    const total = rows.length
    const onTarget = rows.filter((r) => r.status.id === 'onTarget').length
    const minor = rows.filter((r) => r.status.id === 'minor').length
    const significant = rows.filter((r) => r.status.id === 'significant').length
    const avgAbsVp = total ? rows.reduce((s, r) => s + Math.abs(r.vp), 0) / total : 0
    return { total, onTarget, minor, significant, avgAbsVp }
  }, [rows])

  const exportFiltersUsed = summarizeActiveFilters([
    ['Fiscal Year', fiscalYear], ['Quarter', quarter], ['Week', week],
    ['Region', activeRegions], ['Sub Region', subRegion], ['Classification', classification],
    ['Metric', metricFilter === 'all' ? [] : [METRIC_COLS.find((c) => c.key === metricFilter)?.label]],
    ['Status', statusFilter === 'all' ? [] : [STATUS_OPTIONS.find(([id]) => id === statusFilter)?.[1]]],
  ])

  return (
    <div className="tab-panel active">
      <div className="kpi-grid stats-row">
        <div className="kpi-card"><div className="kpi-label">Total Entries</div><div className="kpi-value">{summary.total}</div></div>
        <div className="kpi-card"><div className="kpi-label">On Target</div><div className="kpi-value tone-g">{summary.onTarget}</div></div>
        <div className="kpi-card"><div className="kpi-label">Minor Variance</div><div className="kpi-value">{summary.minor}</div></div>
        <div className="kpi-card"><div className="kpi-label">Significant Variance</div><div className="kpi-value tone-r">{summary.significant}</div></div>
        <div className="kpi-card"><div className="kpi-label">Avg Variance</div><div className="kpi-value">{fmt(summary.avgAbsVp)}%</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            Variance Records <InfoBtn tip="<strong>Purpose</strong>Chronological Actual vs Forecast record per metric and period, for the current filter scope. Status thresholds: On Target ≤3% variance, Minor Variance 3–8%, Significant Variance &gt;8%." />
          </div>
          <DownloadBtn
            filename="forecast-variance-ledger"
            source="Forecast Variance Ledger"
            filtersUsed={exportFiltersUsed}
            rows={[
              ['Period', 'Metric', 'Actual', 'Forecast', 'Variance', 'Variance %', 'Status'],
              ...filteredRows.map((r) => [r.period, r.metric.label, r.actual, r.forecast, Number(r.variance.toFixed(2)), Number(r.vp.toFixed(1)), r.status.label]),
            ]}
          />
        </div>

        <div className="filter-grid" style={{ margin: '12px 0' }}>
          <div className="filter-group">
            <label>Metric</label>
            <select className="f-sel" value={metricFilter} onChange={(e) => setMetricFilter(e.target.value)}>
              <option value="all">All</option>
              {METRIC_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select className="f-sel" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="tw scroll">
          <table>
            <thead>
              <tr><th>Period</th><th>Metric</th><th>Actual</th><th>Forecast</th><th>Variance</th><th>Variance %</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No records match the selected filters.</td></tr>
              )}
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.period}</td>
                  <td>{r.metric.label}</td>
                  <td>{fmt(r.actual)}{r.metric.unit}</td>
                  <td>{fmt(r.forecast)}{r.metric.unit}</td>
                  <td><span className={'badge ' + varClass(r.variance)}>{arrow(r.variance)} {fmt(Math.abs(r.variance))}{r.metric.unit}</span></td>
                  <td>{fmt(Math.abs(r.vp))}%</td>
                  <td><span className={'status-pill ' + r.status.cls}>{r.status.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
