import { useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { useApp } from '../../../core/hooks/useApp.js'
import { getColors } from '../../../shared/themes/colors.js'
import { fmt, matchesMulti, summarizeActiveFilters } from '../lib/mockGenerators.js'
import { lineEndDataLabels } from '../lib/datalabels.js'
import { stackedBarConfig } from '../lib/chartConfigs.js'
import {
  CONTACT_TYPES, VARIANCE_BUCKETS, generateCareRows, byPeriod,
  attainmentByContactType, varianceBucketsByPeriod, computeCareKpis,
} from '../lib/careForecastData.js'
import MultiSelectDropdown from '../../../shared/components/MultiSelectDropdown.jsx'
import Modal from '../../../shared/components/Modal.jsx'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'
import DownloadBtn from '../../../shared/components/DownloadBtn.jsx'

// Care LOB forecast ledger, adapted from the standalone "Forecast Performance" tool's
// Care FC view (KpiGrid + CareComboCard + ForecastVsActualChart + HesCapacityReplacementCharts,
// each gated by that tool's own `isCareOnly`/`cfg.id === 'care'` branches). Only the Care
// line of business is reproduced here; every other LOB in that tool is out of scope.
// There's no live Care upload wired into Care SPOG, so rows are generated the same
// deterministic way every other mock table in this app is (see careForecastData.js).

function fmtSafe(v) {
  return v === null || v === undefined || !Number.isFinite(v) ? '—' : fmt(v)
}
function fmtSigned(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return (v > 0 ? '+' : '') + fmt(Math.round(v))
}
function fmtPctSigned(v, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return (v > 0 ? '+' : '') + (v * 100).toFixed(digits) + '%'
}
function fmtPctPlain(v, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return (v * 100).toFixed(digits) + '%'
}
function accClass(v) {
  if (v === null || v === undefined) return ''
  return v >= 0.9 ? 'outage-pct-ok' : v >= 0.8 ? 'outage-pct-warn' : 'outage-pct-bad'
}
function bucketColor(colors, i) {
  if (i === 0) return colors.accentGreen
  if (i === 1) return colors.accentOrange
  if (i === 2) return colors.accentRed + 'b3'
  return colors.accentRed
}
const DENSE_X_TICKS = { maxRotation: 45, minRotation: 0, font: { size: 9 }, autoSkip: true, maxTicksLimit: 16 }

function buildComboConfig(periods, colors) {
  const labels = periods.map((p) => p.label)
  return {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Actual', data: periods.map((p) => p.actual), backgroundColor: colors.accentBlue, borderRadius: 4, yAxisID: 'y', order: 2, datalabels: { display: false } },
        { type: 'bar', label: 'Forecast', data: periods.map((p) => p.forecast), backgroundColor: colors.border, borderRadius: 4, yAxisID: 'y', order: 2, datalabels: { display: false } },
        { type: 'line', label: 'Attainment %', data: periods.map((p) => (p.attainment === null ? null : p.attainment * 100)), borderColor: colors.accentGreen, backgroundColor: colors.accentGreen, yAxisID: 'y1', tension: 0.3, pointRadius: 3, borderWidth: 2, order: 1, datalabels: lineEndDataLabels('%', colors.accentGreen) },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { grid: { display: false }, ticks: DENSE_X_TICKS },
        y: { beginAtZero: true, grace: '20%' },
        y1: { type: 'linear', position: 'right', min: 0, grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + '%' } },
      },
    },
  }
}

function buildThresholdConfig(periods, colors) {
  const labels = periods.map((p) => p.label)
  return {
    data: {
      labels,
      datasets: [
        { label: 'Actual', data: periods.map((p) => p.actual), borderColor: colors.accentBlue, backgroundColor: colors.accentBlue, tension: 0.3, pointRadius: 2, borderWidth: 2 },
        { label: 'Forecast', data: periods.map((p) => p.forecast), borderColor: colors.accentPurple, backgroundColor: colors.accentPurple, tension: 0.3, pointRadius: 2, borderWidth: 2 },
        { label: 'Upper threshold (+10%)', data: periods.map((p) => (p.forecast === null ? null : p.forecast * 1.1)), borderColor: colors.accentRed, borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 },
        { label: 'Lower threshold (−10%)', data: periods.map((p) => (p.forecast === null ? null : p.forecast * 0.9)), borderColor: colors.accentGreen, borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { grid: { display: false }, ticks: DENSE_X_TICKS },
        y: { beginAtZero: true, grace: '15%' },
      },
    },
  }
}

function buildDeviationConfig(periods, colors) {
  const labels = periods.map((p) => p.label)
  return {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Actual', data: periods.map((p) => p.actual), backgroundColor: colors.accentBlue, borderRadius: 4, yAxisID: 'y', order: 2 },
        { type: 'bar', label: 'Forecast', data: periods.map((p) => p.forecast), backgroundColor: colors.border, borderRadius: 4, yAxisID: 'y', order: 2 },
        { type: 'line', label: 'Deviation %', data: periods.map((p) => (p.variancePct === null ? null : p.variancePct * 100)), borderColor: colors.accentOrange, backgroundColor: colors.accentOrange, yAxisID: 'y1', borderDash: [4, 3], tension: 0.3, pointRadius: 2, borderWidth: 2, order: 1 },
        { type: 'line', label: 'Upper threshold (+10%)', data: labels.map(() => 10), borderColor: colors.accentRed, borderDash: [5, 4], pointRadius: 0, borderWidth: 1, yAxisID: 'y1', order: 1 },
        { type: 'line', label: 'Lower threshold (−10%)', data: labels.map(() => -10), borderColor: colors.accentRed, borderDash: [5, 4], pointRadius: 0, borderWidth: 1, yAxisID: 'y1', order: 1 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { grid: { display: false }, ticks: DENSE_X_TICKS },
        y: { beginAtZero: true, grace: '15%' },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + '%' } },
      },
    },
  }
}

export default function ForecastVarianceLedger() {
  const { theme } = useApp()
  const colors = getColors(theme)
  const allRows = useMemo(() => generateCareRows(), [])
  const [contactTypeFilter, setContactTypeFilter] = useState(['All'])
  const [queueSearch, setQueueSearch] = useState('')
  const [grain, setGrain] = useState('month')
  const [queuePath, setQueuePath] = useState(null)
  const [drill, setDrill] = useState(null)

  const rows = useMemo(() => {
    const search = queueSearch.trim().toLowerCase()
    return allRows.filter((r) => {
      if (!matchesMulti(contactTypeFilter, r.contactType)) return false
      if (search && !r.queue.toLowerCase().includes(search)) return false
      return true
    })
  }, [allRows, contactTypeFilter, queueSearch])

  const scopedRows = useMemo(() => (queuePath ? rows.filter((r) => r.queue === queuePath) : rows), [rows, queuePath])

  const kpis = useMemo(() => computeCareKpis(rows), [rows])
  const periods = useMemo(() => byPeriod(rows, grain), [rows, grain])
  const scopedPeriods = useMemo(() => byPeriod(scopedRows, grain), [scopedRows, grain])
  const attainmentData = useMemo(() => attainmentByContactType(rows, grain), [rows, grain])
  const bucketPeriods = useMemo(() => varianceBucketsByPeriod(rows, grain), [rows, grain])

  const topQueues = useMemo(() => {
    const totals = new Map()
    for (const r of rows) totals.set(r.queue, (totals.get(r.queue) ?? 0) + (r.actual ?? 0))
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([q]) => q)
  }, [rows])

  const comboConfig = useMemo(() => buildComboConfig(periods, colors), [periods, colors])
  const thresholdConfig = useMemo(() => buildThresholdConfig(scopedPeriods, colors), [scopedPeriods, colors])
  const deviationConfig = useMemo(() => buildDeviationConfig(periods, colors), [periods, colors])
  const bucketConfig = useMemo(() => stackedBarConfig(
    bucketPeriods.map((p) => p.label),
    VARIANCE_BUCKETS.map((b, i) => ({ label: b, data: bucketPeriods.map((p) => Math.round(p.pct[b] * 1000) / 10), backgroundColor: bucketColor(colors, i), stack: 'b' })),
    '%',
  ), [bucketPeriods, colors])

  const varianceTableRows = useMemo(() => periods.map((p, i) => {
    const prev = periods[i - 1]
    const mom = prev && p.variance !== null && prev.variance !== null ? p.variance - prev.variance : null
    return { ...p, mom }
  }), [periods])

  const filtersUsed = summarizeActiveFilters([
    ['Contact Type', contactTypeFilter],
    ['Search', queueSearch ? [queueSearch] : []],
  ])

  const hasData = rows.length > 0

  return (
    <div className="tab-panel active">
      <div className="card" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
        <div className="card-header">
          <div className="card-title">Care Forecast Filters</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="tabs" role="tablist" aria-label="Grain" style={{ margin: 0 }}>
              <button type="button" role="tab" aria-selected={grain === 'week'} className="tab" onClick={() => setGrain('week')}>Weekly</button>
              <button type="button" role="tab" aria-selected={grain === 'month'} className="tab" onClick={() => setGrain('month')}>Monthly</button>
            </div>
            <DownloadBtn
              filename="care-forecast-ledger"
              source="Forecast Variance Ledger — Care"
              filtersUsed={filtersUsed}
              rows={[
                ['Queue', 'Contact Type', 'Week', 'Month', 'Actual', 'Forecast', 'Variance', 'Variance %', 'Within ±10%'],
                ...rows.map((r) => [r.queue, r.contactType, r.weekLabel, r.month, r.actual, r.forecast, Number(r.variance.toFixed(2)), r.variancePct === null ? '' : Number((r.variancePct * 100).toFixed(1)), r.within10 === null ? '' : r.within10 ? 'Yes' : 'No']),
              ]}
            />
          </div>
        </div>
        <div className="filter-grid" style={{ margin: '12px 0 0' }}>
          <div className="filter-group">
            <label>Contact Type</label>
            <MultiSelectDropdown options={CONTACT_TYPES} selected={contactTypeFilter} onChange={setContactTypeFilter} />
          </div>
          <div className="filter-group">
            <label>Search Queue</label>
            <input type="text" className="f-sel" placeholder="Type queue name..." value={queueSearch} onChange={(e) => setQueueSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No records match the selected filters.</div>
      ) : (
        <>
          <div className="kpi-grid stats-row" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
            <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setDrill('variance')}>
              <div className="kpi-label">Variance</div>
              <div className="kpi-value">{fmtSigned(kpis.totalVariance)}</div>
              <div className="kpi-sub">{fmtPctSigned(kpis.variancePct)} of forecast · click to drill down</div>
            </div>
            <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setDrill('within')}>
              <div className="kpi-label">Within Threshold (±10%)</div>
              <div className="kpi-value tone-g">{fmtSafe(kpis.within10Rows.length)}</div>
              <div className="kpi-sub">of {fmtSafe(kpis.measurableCount)} total ({fmtPctPlain(kpis.measurableCount ? kpis.within10Rows.length / kpis.measurableCount : null, 0)}) · click to drill down</div>
            </div>
            <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setDrill('outside')}>
              <div className="kpi-label">Outside Threshold (±10%)</div>
              <div className="kpi-value tone-r">{fmtSafe(kpis.outside10Rows.length)}</div>
              <div className="kpi-sub">of {fmtSafe(kpis.measurableCount)} total ({fmtPctPlain(kpis.measurableCount ? kpis.outside10Rows.length / kpis.measurableCount : null, 0)}) · click to drill down</div>
            </div>
          </div>

          <div className="section-div" style={{ marginTop: 0 }}>
            <h2>Actuals, Forecast &amp; Attainment <InfoBtn tip="<strong>Purpose</strong>Actual and Forecast volume per period, with Attainment (&Sigma;Actual &divide; &Sigma;Forecast) as a secondary-axis line." /></h2>
          </div>
          <div className="card" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
            <div className="kpi-grid" style={{ marginBottom: 12 }}>
              <div className="kpi-card"><div className="kpi-label">Actuals</div><div className="kpi-value">{fmtSafe(kpis.totalActual)}</div><div className="kpi-sub">Avg Weekly: {fmtSafe(kpis.avgWeeklyActual)}</div></div>
              <div className="kpi-card"><div className="kpi-label">Forecast</div><div className="kpi-value">{fmtSafe(kpis.totalForecast)}</div><div className="kpi-sub">Avg Weekly: {fmtSafe(kpis.avgWeeklyForecast)}</div></div>
              <div className="kpi-card"><div className="kpi-label">Attainment</div><div className="kpi-value tone-g">{fmtPctPlain(kpis.attainment, 2)}</div></div>
            </div>
            <div style={{ height: 280 }}><Bar data={comboConfig.data} options={comboConfig.options} /></div>
          </div>

          <div className="section-div">
            <h2>Forecast vs Actual {queuePath ? `— ${queuePath}` : ''} <InfoBtn tip="<strong>Purpose</strong>Volume comparison per period with &plusmn;10% forecast thresholds. Drill into a single queue below." /></h2>
          </div>
          <div className="card" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <button type="button" className={'btn btn-sm ' + (queuePath ? 'btn-neutral' : 'btn-primary')} onClick={() => setQueuePath(null)}>All Queues</button>
              {!queuePath && topQueues.map((q) => (
                <button key={q} type="button" className="btn btn-sm btn-neutral" onClick={() => setQueuePath(q)}>{q}</button>
              ))}
            </div>
            <div style={{ height: 280 }}><Line data={thresholdConfig.data} options={thresholdConfig.options} /></div>
          </div>

          <div className="section-div">
            <h2>Forecast Attainment by Contact Type <InfoBtn tip="<strong>Purpose</strong>Attainment (&Sigma;Actual &divide; &Sigma;Forecast) per Contact Type and period. Color bands: &ge;90% on target, &ge;80% watch, below 80% at risk." /></h2>
          </div>
          <div className="card" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
            <div className="tw scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Contact Type</th>
                    {attainmentData.periods.map((p) => <th key={p.label}>{p.label}</th>)}
                    <th>YTD / Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {attainmentData.table.map((row) => (
                    <tr key={row.type}>
                      <td style={{ textAlign: 'left' }}>{row.type}</td>
                      {row.cells.map((v, i) => <td key={i} className={accClass(v)}>{v === null ? '—' : fmtPctPlain(v, 1)}</td>)}
                      <td className={accClass(row.total)}><strong>{row.total === null ? '—' : fmtPctPlain(row.total, 1)}</strong></td>
                    </tr>
                  ))}
                  <tr className="tot-row">
                    <td style={{ textAlign: 'left' }}>Aggregate / Total</td>
                    {attainmentData.totalsRow.cells.map((v, i) => <td key={i} className={accClass(v)}>{v === null ? '—' : fmtPctPlain(v, 1)}</td>)}
                    <td className={accClass(attainmentData.totalsRow.total)}><strong>{attainmentData.totalsRow.total === null ? '—' : fmtPctPlain(attainmentData.totalsRow.total, 1)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-div">
            <h2>Variance Buckets <InfoBtn tip="<strong>Purpose</strong>Share of queue-weeks per period by absolute variance %, |Actual &minus; Forecast| &divide; Forecast." /></h2>
          </div>
          <div className="card" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
            <div style={{ height: 280 }}><Bar data={bucketConfig.data} options={bucketConfig.options} /></div>
          </div>

          <div className="section-div">
            <h2>Forecast vs Actual Deviation <InfoBtn tip="<strong>Purpose</strong>Actual and Forecast volume per period with Deviation % (&Sigma;Actual &minus; &Sigma;Forecast) &divide; &Sigma;Forecast on a secondary axis, against &plusmn;10% thresholds." /></h2>
          </div>
          <div className="card">
            <div style={{ height: 280 }}><Bar data={deviationConfig.data} options={deviationConfig.options} /></div>
          </div>

          <div className="section-div">
            <h2>Derived Metric Definitions</h2>
          </div>
          <div className="card">
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8, fontSize: '.8125rem', color: 'var(--text-secondary)' }}>
              <li><strong style={{ color: 'var(--text-primary)' }}>Variance</strong> = Actual − Forecast (positive = under-forecast)</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Variance %</strong> = (Actual − Forecast) ÷ Forecast</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Attainment</strong> = Actual ÷ Forecast (100% = perfectly on plan)</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Accuracy</strong> = 1 − |Forecast − Actual| ÷ Forecast — drives the attainment color bands and variance buckets above</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Within ±10%</strong> = queue-weeks where Variance % is between −10% and +10% of Forecast</li>
            </ul>
          </div>
        </>
      )}

      <Modal open={drill === 'variance'} onClose={() => setDrill(null)} title="Net variance & variance % drill down">
        <div className="tw scroll">
          <table>
            <thead><tr><th>Period</th><th>Net Variance</th><th>Variance %</th><th>MoM Variance</th></tr></thead>
            <tbody>
              {varianceTableRows.map((row) => (
                <tr key={row.label}>
                  <td style={{ textAlign: 'left' }}>{row.label}</td>
                  <td>{fmtSigned(row.variance)}</td>
                  <td>{fmtPctSigned(row.variancePct)}</td>
                  <td>{row.mom === null ? '—' : fmtSigned(row.mom)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal open={drill === 'within'} onClose={() => setDrill(null)} title={`Within Threshold (±10%) — ${kpis.within10Rows.length} queue-weeks`}>
        <div className="tw scroll">
          <table>
            <thead><tr><th>Queue</th><th>Contact Type</th><th>Period</th><th>Actual</th><th>Forecast</th><th>Variance</th><th>Variance %</th></tr></thead>
            <tbody>
              {kpis.within10Rows.map((r) => (
                <tr key={r.queue + r.week}>
                  <td style={{ textAlign: 'left' }}>{r.queue}</td>
                  <td style={{ textAlign: 'left' }}>{r.contactType}</td>
                  <td>{r.weekLabel}</td>
                  <td>{fmt(r.actual)}</td>
                  <td>{fmt(r.forecast)}</td>
                  <td>{fmtSigned(r.variance)}</td>
                  <td>{fmtPctSigned(r.variancePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal open={drill === 'outside'} onClose={() => setDrill(null)} title={`Outside Threshold (±10%) — ${kpis.outside10Rows.length} queue-weeks`}>
        <div className="tw scroll">
          <table>
            <thead><tr><th>Queue</th><th>Contact Type</th><th>Period</th><th>Actual</th><th>Forecast</th><th>Variance</th><th>Variance %</th></tr></thead>
            <tbody>
              {kpis.outside10Rows.map((r) => (
                <tr key={r.queue + r.week}>
                  <td style={{ textAlign: 'left' }}>{r.queue}</td>
                  <td style={{ textAlign: 'left' }}>{r.contactType}</td>
                  <td>{r.weekLabel}</td>
                  <td>{fmt(r.actual)}</td>
                  <td>{fmt(r.forecast)}</td>
                  <td>{fmtSigned(r.variance)}</td>
                  <td>{fmtPctSigned(r.variancePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
