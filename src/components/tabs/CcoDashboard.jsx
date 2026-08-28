import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import {
  fmt, pct, varClass, arrow, genKpiValue, hashSeed, getWeeksForQuarter,
  WEEK_DAYS, issueLabels,
} from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels, lineEndDataLabels, stackedBarDataLabels } from '../../charts/datalabels.js'
import DownloadBtn from '../common/DownloadBtn.jsx'
import Modal from '../common/Modal.jsx'
import InfoBtn from '../common/InfoBtn.jsx'
import ForecastAdherenceMap from './ForecastAdherenceMap.jsx'
import { issueTypeBarConfig } from '../../charts/chartConfigs.js'

const METRIC_CHART_TIPS = {
  contacts: 'Contacts Offered, Actual vs Forecast, by period.',
  orders: 'Orders processed, Actual vs Forecast, by period.',
  caseRate: 'Case Rate (%), Actual vs Forecast, by period.',
  cpsr: 'Contacts Per Service Request, Actual vs Forecast, by period.',
  tcd: 'Total Contact Duration, Actual vs Forecast, by period.',
  cases: 'Cases handled, Actual vs Forecast, by period.',
  activities: 'Activities logged, Actual vs Forecast, by period.',
  apc: 'Activities Per Case (decimal), Actual only, by period.',
  icw: 'ICW volume, Actual only, by period.',
  ccpd: 'Cases Closed per Day, Actual only, by period.',
}

const ISSUE_CHART_TIPS = {
  issue1: 'Case volume (Actual), broken down by issue type.',
  issue2: 'Activity volume (Actual), broken down by issue type.',
  issue3: 'Activities Per Case (Actual), broken down by issue type.',
  issue4: 'TCD (Actual), broken down by issue type.',
  issue5: 'Case Rate (%, Actual), broken down by issue type.',
  issue6: 'Ci1 (%, Actual), broken down by issue type.',
}

const VIEW_CONFIG = {
  daily: { title: 'Daily Performance Table', sub: 'Day-level performance (Sat–Fri week)' },
  weekly: { title: 'Weekly Performance Table', sub: 'Fiscal week-level performance' },
  quarterly: { title: 'Quarterly Performance Table', sub: 'Quarter-level aggregated performance' },
}

const METRIC_COLS = [
  { key: 'contacts', label: 'Contacts Offered', base: 2200, unit: '', hf: true, decimals: 0 },
  { key: 'orders', label: 'Orders', base: 1150, unit: '', hf: true, decimals: 0 },
  { key: 'caseRate', label: 'Case Rate', base: 12.5, unit: '%', hf: true, decimals: 1 },
  { key: 'cpsr', label: 'CPSR', base: 4.2, unit: '', hf: true, decimals: 1 },
  { key: 'sla', label: 'Overall SLA', base: 91, unit: '%', hf: false, decimals: 1 },
  { key: 'tcd', label: 'TCD', base: 48000, unit: '', hf: true, decimals: 0 },
]

const EXTRA_METRIC_CHARTS = [
  { key: 'cases', label: 'Cases', base: 3200, unit: '', hf: true, decimals: 0 },
  { key: 'activities', label: 'Activities', base: 16000, unit: '', hf: true, decimals: 0 },
  { key: 'apc', label: 'APC', base: 4.8, unit: '', hf: false, decimals: 1 },
  { key: 'icw', label: 'ICW', base: 850, unit: '', hf: false, decimals: 0 },
  { key: 'ccpd', label: 'CCpD', base: 42, unit: '', hf: false, decimals: 0 },
]

// APC / ICW / CCpD are all "Actual only" metrics — shown as one card with a toggle
// instead of three separate cards.
const ACTUAL_TOGGLE_KEYS = ['apc', 'icw', 'ccpd']

const CHANNELS = ['Voice', 'Email', 'Chat', 'W2C']
const CHANNEL_BASES_1 = [6500, 4200, 3200, 1500]
const TCD_CHANNELS = ['Voice', 'Email', 'Chat']
const TCD_CHANNEL_BASES = [9500, 7400, 8600]
const CHANNEL_SLA_BASES = [92, 88, 90, 85]

function normalizeWeights(bases) {
  const total = bases.reduce((a, b) => a + b, 0)
  return bases.map((b) => b / total)
}

// Metrics that support a "by Channel" trend drill-down from their Key Metrics Summary card.
// `additive` profiles split the metric's total across channels (weights sum to 1, e.g. volumes).
// Non-additive (rate/ratio) profiles keep each channel near the overall value (weights average ~1).
const CHANNEL_TREND_PROFILES = {
  contacts: { channels: CHANNELS, weights: normalizeWeights(CHANNEL_BASES_1) },
  orders: { channels: CHANNELS, weights: normalizeWeights(CHANNEL_BASES_1) },
  tcd: { channels: TCD_CHANNELS, weights: normalizeWeights(TCD_CHANNEL_BASES) },
  caseRate: { channels: CHANNELS, weights: [1.08, 0.95, 1.02, 0.90] },
  cpsr: { channels: CHANNELS, weights: [1.05, 0.92, 1.08, 0.95] },
}
const ISSUE_CHARTS = [
  { id: 'issue1', title: 'Cases', base: 900, unit: '' },
  { id: 'issue2', title: 'Activities', base: 1400, unit: '' },
  { id: 'issue3', title: 'APC', base: 300, unit: '' },
  { id: 'issue4', title: 'TCD', base: 60, unit: '' },
  { id: 'issue5', title: 'Case Rate', base: 15, unit: '' },
  { id: 'issue6', title: 'Ci1', base: 20, unit: '%' },
]

function getPeriodsForView(view, quarters, weeks) {
  const qList = (quarters || []).filter((q) => q !== 'All')
  const activeQuarters = qList.length ? qList : ['FQ1', 'FQ2', 'FQ3', 'FQ4']
  const allWeeks = activeQuarters.flatMap((q) => getWeeksForQuarter(q))
  const wList = (weeks || []).filter((w) => w !== 'All')

  if (view === 'daily') {
    const weekPool = wList.length ? wList : [allWeeks[0]]
    return weekPool.flatMap((wk) => WEEK_DAYS.map((d) => `${wk} - ${d}`))
  }
  if (view === 'weekly') return wList.length ? wList : allWeeks
  return activeQuarters
}

function shortPeriodLabel(p) {
  const parts = p.split(' - ')
  return parts.length > 1 ? parts[1] : p
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

function heatCellStyle(pct, colors) {
  const rgb = hexToRgb(colors.accentBlue)
  const alpha = 0.12 + pct * 0.78
  return { background: `rgba(${rgb}, ${alpha})`, color: pct > 0.55 ? '#fff' : colors.textPrimary }
}

function buildMetricComparisonConfig(col, labels, actual, forecast, colors) {
  if (!col.hf) {
    return {
      data: { labels, datasets: [{ label: 'Actual', data: actual, backgroundColor: colors.accentBlue, borderRadius: 4, datalabels: barDataLabels(col.unit, colors.accentBlue) }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: col.unit === '%' ? { min: 75, max: 100 } : { beginAtZero: true } },
      },
    }
  }
  const accuracy = actual.map((a, i) => {
    const f = forecast[i]
    return f === 0 ? 100 : Math.max(0, Math.min(100, Math.round((100 - Math.abs((a - f) / f) * 100) * 10) / 10))
  })
  return {
    data: {
      labels,
      datasets: [
        { label: 'Actual', data: actual, backgroundColor: colors.accentBlue, borderRadius: 4, order: 1, datalabels: barDataLabels(col.unit, colors.accentBlue) },
        { label: 'Forecast', data: forecast, backgroundColor: colors.border, borderRadius: 4, order: 1, datalabels: barDataLabels(col.unit, colors.textSecondary) },
        { type: 'line', label: 'Accuracy %', data: accuracy, borderColor: colors.accentPurple, backgroundColor: colors.accentPurple, yAxisID: 'y1', tension: 0.3, pointRadius: 3, borderWidth: 2, order: 2, datalabels: lineEndDataLabels('%', colors.accentPurple) },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        // Extra headroom keeps bar tops (and their labels) clear of the Accuracy line.
        y: { beginAtZero: col.key !== 'caseRate', grace: '25%' },
        // `type: 'linear'` is required here — Chart.js only infers a scale's type
        // automatically for the default 'x'/'y' ids; a non-default id like 'y1'
        // silently falls back to a category scale without it, which is why the
        // line/points/labels weren't rendering correctly before.
        y1: { type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + '%' } },
      },
    },
  }
}

export default function CcoDashboard({ view }) {
  const { theme, activeRegions, ccoFilters } = useApp()
  const colors = getColors(theme)
  const cfg = VIEW_CONFIG[view]
  const { subRegion, quarter, week, classification } = ccoFilters
  const [slaModalOpen, setSlaModalOpen] = useState(false)
  const [channelModalKey, setChannelModalKey] = useState(null)
  const [actualToggleKey, setActualToggleKey] = useState('apc')
  const [heatmapDrill, setHeatmapDrill] = useState(null)

  const seed = useMemo(
    () => hashSeed(subRegion.join(',') + quarter.join(',') + week.join(',') + classification.join(',') + activeRegions.join(',') + view),
    [subRegion, quarter, week, classification, activeRegions, view],
  )
  const periods = useMemo(() => getPeriodsForView(view, quarter, week), [view, quarter, week])

  const keyMetrics = useMemo(() => {
    const li = periods.length - 1
    const metrics = METRIC_COLS.map((c, ci) => {
      const { actual, forecast } = genKpiValue(c.base, seed + li * 7 + ci * 3, c.decimals)
      const variance = actual - forecast
      return { ...c, actual, forecast, variance, vp: pct(actual, forecast), cls: varClass(variance) }
    })
    const crw = Math.round(genKpiValue(130, seed + 800).actual)
    const headcount = Math.round(genKpiValue(65, seed + 900).actual)
    return { metrics, crw, headcount }
  }, [periods, seed])

  const channelSlaTrendChart = useMemo(() => {
    const labels = periods.map(shortPeriodLabel)
    const seriesColors = [colors.accentBlue, colors.accentGreen, colors.accentOrange, colors.accentRed]
    return {
      data: {
        labels,
        datasets: CHANNELS.map((c, ci) => ({
          label: c,
          data: periods.map((_, i) => genKpiValue(CHANNEL_SLA_BASES[ci], seed + i * 13 + ci * 11 + 300, 1).actual),
          backgroundColor: seriesColors[ci],
          borderRadius: 4,
          datalabels: barDataLabels('%', seriesColors[ci]),
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } } },
      },
    }
  }, [periods, seed, colors])

  const channelTrendChart = useMemo(() => {
    if (!channelModalKey) return null
    const ci = METRIC_COLS.findIndex((c) => c.key === channelModalKey)
    const col = METRIC_COLS[ci]
    const profile = CHANNEL_TREND_PROFILES[channelModalKey]
    const labels = periods.map(shortPeriodLabel)
    const seriesColors = [colors.accentBlue, colors.accentGreen, colors.accentOrange, colors.accentRed]
    const factor = Math.pow(10, col.decimals)
    const datasets = profile.channels.flatMap((ch, chi) => {
      const color = seriesColors[chi]
      const actualData = []
      const forecastData = []
      periods.forEach((_, i) => {
        const { actual, forecast } = genKpiValue(col.base, seed + i * 7 + ci * 3, col.decimals)
        const w = profile.weights[chi]
        actualData.push(Math.round(actual * w * factor) / factor)
        forecastData.push(Math.round(forecast * w * factor) / factor)
      })
      return [
        { label: `${ch} Actual`, data: actualData, backgroundColor: color, stack: 'actual', datalabels: stackedBarDataLabels(col.unit) },
        { label: `${ch} Forecast`, data: forecastData, backgroundColor: color + '80', stack: 'forecast', datalabels: stackedBarDataLabels(col.unit) },
      ]
    })
    return {
      label: col.label,
      unit: col.unit,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
        scales: {
          x: { stacked: true, ticks: { font: { size: 9 } } },
          y: { stacked: true, beginAtZero: col.key !== 'caseRate' },
        },
      },
    }
  }, [channelModalKey, periods, seed, colors])

  const metricCharts = useMemo(
    () => {
      const shortLabels = periods.map(shortPeriodLabel)
      return [...METRIC_COLS, ...EXTRA_METRIC_CHARTS]
        .map((c, ci) => {
          const actual = periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3, c.decimals).actual)
          const forecast = periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3, c.decimals).forecast)
          return {
            key: c.key,
            title: c.hf ? `${c.label} — Actual vs Forecast` : `${c.label} — Actual`,
            config: buildMetricComparisonConfig(c, shortLabels, actual, forecast, colors),
          }
        })
        .filter((c) => c.key !== 'sla' && !ACTUAL_TOGGLE_KEYS.includes(c.key))
    },
    [periods, seed, colors],
  )

  const actualToggleChart = useMemo(() => {
    const shortLabels = periods.map(shortPeriodLabel)
    const combined = [...METRIC_COLS, ...EXTRA_METRIC_CHARTS]
    const ci = combined.findIndex((c) => c.key === actualToggleKey)
    const col = combined[ci]
    const actual = periods.map((_, i) => genKpiValue(col.base, seed + i * 7 + ci * 3, col.decimals).actual)
    const forecast = periods.map((_, i) => genKpiValue(col.base, seed + i * 7 + ci * 3, col.decimals).forecast)
    return { label: col.label, config: buildMetricComparisonConfig(col, shortLabels, actual, forecast, colors) }
  }, [actualToggleKey, periods, seed, colors])

  const table1Rows = useMemo(
    () => CHANNELS.map((c, i) => {
      const { actual, forecast } = genKpiValue(CHANNEL_BASES_1[i], seed + i + 70)
      const variance = actual - forecast
      return { channel: c, actual, forecast, variance, vp: pct(actual, forecast), cls: varClass(variance) }
    }),
    [seed],
  )

  const table3Rows = useMemo(
    () => TCD_CHANNELS.map((c, i) => {
      const raw = genKpiValue(TCD_CHANNEL_BASES[i], seed + i + 90)
      const actual = Math.round(raw.actual)
      const forecast = Math.round(raw.forecast)
      const variance = actual - forecast
      return { channel: c, actual, forecast, variance, vp: pct(actual, forecast), cls: varClass(variance) }
    }),
    [seed],
  )

  const issueCharts = useMemo(
    () => ISSUE_CHARTS.map(({ id, title, base, unit }) => {
      const actual = issueLabels.map((_, i) => Math.round(base * (0.8 + ((Math.sin((seed + i) * 2.7) + 1) / 2) * 0.5)))
      return { id, title, unit, actual, config: issueTypeBarConfig(issueLabels, actual, unit, colors) }
    }),
    [seed, colors],
  )

  const heatmapPeriodLabels = useMemo(() => periods.map(shortPeriodLabel), [periods])

  const issueTypeHeatmap = useMemo(
    () => issueCharts.map((c) => {
      const min = Math.min(...c.actual)
      const max = Math.max(...c.actual)
      return {
        id: c.id,
        label: c.title,
        unit: c.unit,
        cells: c.actual.map((v) => ({ value: v, pct: max === min ? 0.5 : (v - min) / (max - min) })),
      }
    }),
    [issueCharts],
  )

  const heatmapDrillData = useMemo(() => {
    if (!heatmapDrill) return null
    const ci = ISSUE_CHARTS.findIndex((c) => c.id === heatmapDrill.metricId)
    const col = ISSUE_CHARTS[ci]
    const rows = issueLabels.map((label, ii) => {
      const values = periods.map((_, i) => genKpiValue(col.base, seed + i * 7 + ci * 3 + ii * 41 + 500).actual)
      const min = Math.min(...values)
      const max = Math.max(...values)
      return { label, cells: values.map((v) => ({ value: v, pct: max === min ? 0.5 : (v - min) / (max - min) })) }
    })
    return { metricLabel: col.title, unit: col.unit, rows }
  }, [heatmapDrill, periods, seed])

  const backlog = useMemo(() => {
    const assigned = genKpiValue(2800, seed + 401).actual
    const unassigned = genKpiValue(650, seed + 402).actual
    const total = Math.round(assigned + unassigned)
    return {
      assigned: Math.round(assigned),
      unassigned: Math.round(unassigned),
      assignedPct: ((assigned / total) * 100).toFixed(1),
      unassignedPct: ((unassigned / total) * 100).toFixed(1),
    }
  }, [seed])

  return (
    <div className="tab-panel active">
      <div className="section-div">
        <h2>Key Metrics Summary</h2>
      </div>
      <div className="kpi-grid">
        {keyMetrics.metrics.map((m) => {
          if (m.key === 'sla') {
            return (
              <div
                className="kpi-card clickable"
                key={m.key}
                onClick={() => setSlaModalOpen(true)}
                title="Click to see SLA by Channel trend"
              >
                <div className="kpi-label">{m.label}</div>
                <div className="kpi-value">{fmt(m.actual)}{m.unit}</div>
                <div className="kpi-sub">Click for channel trend</div>
              </div>
            )
          }
          if (CHANNEL_TREND_PROFILES[m.key]) {
            return (
              <div
                className="kpi-card clickable"
                key={m.key}
                onClick={() => setChannelModalKey(m.key)}
                title={`Click to see ${m.label} by Channel trend`}
              >
                <div className="kpi-label">{m.label}</div>
                <div className="kpi-value">{fmt(m.actual)}{m.unit}</div>
                <div className="kpi-sub">Forecast: {fmt(m.forecast)}{m.unit}</div>
                <div className="kpi-sub">Click for channel trend</div>
              </div>
            )
          }
          return (
            <div className="kpi-card" key={m.key}>
              <div className="kpi-label">{m.label}</div>
              <div className="kpi-value">{fmt(m.actual)}{m.unit}</div>
              {m.hf && (
                <>
                  <div className="kpi-sub">Forecast: {fmt(m.forecast)}{m.unit}</div>
                  <div className="kpi-sub">{arrow(m.variance)} {fmt(Math.abs(m.vp))}% variance</div>
                </>
              )}
            </div>
          )
        })}
        <div className="kpi-card">
          <div className="kpi-label">CRW</div>
          <div className="kpi-value">{fmt(keyMetrics.crw)}</div>
          <div className="kpi-sub">Actual only</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Headcount</div>
          <div className="kpi-value">{fmt(keyMetrics.headcount)}</div>
          <div className="kpi-sub">Actual only</div>
        </div>
      </div>

      <div className="section-div">
        <h2>Overall SLA</h2>
      </div>
      <ForecastAdherenceMap />

      <div className="section-div">
        <h2>Metric Comparison — Actual vs Forecast</h2>
      </div>
      <div className="s-grid">
        {metricCharts.map((c) => (
          <div className="card" key={c.key}>
            <div className="card-header">
              <div className="card-title">
                {c.title} <InfoBtn tip={`<strong>Purpose</strong>${METRIC_CHART_TIPS[c.key] || ''}`} />
              </div>
            </div>
            <div className="chart-container">
              <Bar data={c.config.data} options={c.config.options} />
            </div>
          </div>
        ))}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {actualToggleChart.label} — Actual <InfoBtn tip={`<strong>Purpose</strong>${METRIC_CHART_TIPS[actualToggleKey] || ''}`} />
            </div>
          </div>
          <div className="plan-sel" style={{ marginBottom: 8 }}>
            {ACTUAL_TOGGLE_KEYS.map((k) => (
              <button key={k} type="button" className={'plan-btn' + (actualToggleKey === k ? ' active' : '')} onClick={() => setActualToggleKey(k)}>
                {EXTRA_METRIC_CHARTS.find((c) => c.key === k).label}
              </button>
            ))}
          </div>
          <div className="chart-container">
            <Bar data={actualToggleChart.config.data} options={actualToggleChart.config.options} />
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>Contacts Offered by Channel</h2>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            Channel Volume <InfoBtn tip="<strong>Purpose</strong>Contacts offered per channel (Voice, Email, Chat, W2C), Actual vs Forecast." />
          </div>
          <DownloadBtn filename="cco-channel-table" rows={[['Channel', 'Actual', 'Forecast', 'Variance', 'Variance %'], ...table1Rows.map((r) => [r.channel, r.actual, r.forecast, r.variance, r.vp.toFixed(1) + '%'])]} />
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Channel</th><th>Actual</th><th>Forecast</th><th>Variance</th><th>Var %</th></tr></thead>
            <tbody>
              {table1Rows.map((r) => (
                <tr key={r.channel}>
                  <td>{r.channel}</td>
                  <td>{fmt(r.actual)}</td>
                  <td>{fmt(r.forecast)}</td>
                  <td><span className={'badge ' + r.cls}>{arrow(r.variance)} {fmt(Math.abs(r.variance))}</span></td>
                  <td><span className={'badge ' + r.cls}>{fmt(Math.abs(r.vp))}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-div">
        <h2>TCD Breakdown by Contact Type</h2>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            Contact Type Duration <InfoBtn tip="<strong>Purpose</strong>Total Contact Duration per channel (Voice, Email, Chat), Actual vs Forecast." />
          </div>
          <DownloadBtn filename="cco-tcd-table" rows={[['Channel', 'Actual', 'Forecast', 'Variance', 'Var %'], ...table3Rows.map((r) => [r.channel, r.actual, r.forecast, r.variance, r.vp.toFixed(1) + '%'])]} />
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Channel</th><th>Actual</th><th>Forecast</th><th>Variance</th><th>Var %</th></tr></thead>
            <tbody>
              {table3Rows.map((r) => (
                <tr key={r.channel}>
                  <td>{r.channel}</td>
                  <td>{fmt(r.actual)}</td>
                  <td>{fmt(r.forecast)}</td>
                  <td><span className={'badge ' + r.cls}>{arrow(r.variance)} {fmt(Math.abs(r.variance))}</span></td>
                  <td><span className={'badge ' + r.cls}>{fmt(Math.abs(r.vp))}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-div">
        <h2>Issue Type Analysis</h2>
      </div>
      <div className="s-grid thirds">
        {issueCharts.slice(0, 3).map((c) => (
          <div className="card" key={c.id}>
            <div className="card-header">
              <div className="card-title">
                {c.title} <InfoBtn tip={`<strong>Purpose</strong>${ISSUE_CHART_TIPS[c.id] || ''}`} />
              </div>
            </div>
            <div className="chart-container">
              <Bar data={c.config.data} options={c.config.options} />
            </div>
          </div>
        ))}
      </div>
      <div className="s-grid thirds">
        {issueCharts.slice(3).map((c) => (
          <div className="card" key={c.id}>
            <div className="card-header">
              <div className="card-title">
                {c.title} <InfoBtn tip={`<strong>Purpose</strong>${ISSUE_CHART_TIPS[c.id] || ''}`} />
              </div>
            </div>
            <div className="chart-container">
              <Bar data={c.config.data} options={c.config.options} />
            </div>
          </div>
        ))}
      </div>
      <div className="s-grid full">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {heatmapDrill && (
                <button type="button" className="heatmap-back-btn" onClick={() => setHeatmapDrill(null)}>← Back</button>
              )}
              {heatmapDrill
                ? `${heatmapDrillData.metricLabel} by Issue Type — ${cfg.title.replace(' Performance Table', '')}`
                : 'Issue Type Metrics'}
              {' '}
              <InfoBtn
                tip={heatmapDrill
                  ? `<strong>Purpose</strong>${heatmapDrillData.metricLabel} for every issue type, broken down by period (${view} view). Use the Daily / Weekly / Quarterly buttons above to change granularity.`
                  : '<strong>Purpose</strong>Actual values for Cases, Activities, APC, TCD, Case Rate and Ci1 across all 9 issue types. Use the Drill Down button on a row to see that metric broken down by issue type and period.'}
              />
            </div>
          </div>
          <div className="heatmap-wrap">
            {heatmapDrill ? (
              <table className="heatmap-tbl">
                <thead>
                  <tr>
                    <th></th>
                    {heatmapPeriodLabels.map((l, i) => <th key={i}>{l}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmapDrillData.rows.map((row) => (
                    <tr key={row.label}>
                      <td className="heatmap-rowlbl">{row.label}</td>
                      {row.cells.map((cell, i) => (
                        <td key={i} className="heatmap-cell" style={heatCellStyle(cell.pct, colors)}>
                          {fmt(cell.value)}{heatmapDrillData.unit}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="heatmap-tbl">
                <thead>
                  <tr>
                    <th></th>
                    {issueLabels.map((l) => <th key={l}>{l}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {issueTypeHeatmap.map((row) => (
                    <tr key={row.id}>
                      <td className="heatmap-rowlbl">{row.label}</td>
                      {row.cells.map((cell, i) => (
                        <td key={i} className="heatmap-cell" style={heatCellStyle(cell.pct, colors)}>
                          {fmt(cell.value)}{row.unit}
                        </td>
                      ))}
                      <td className="heatmap-drill-cell">
                        <button
                          type="button"
                          className="heatmap-drill-btn"
                          onClick={() => setHeatmapDrill({ metricId: row.id })}
                          title={`Drill down: ${row.label} by issue type and period`}
                        >
                          Drill Down ▸
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="heatmap-legend">
            <span>Low</span>
            <div className="heatmap-legend-bar" style={{ background: `linear-gradient(90deg, rgba(${hexToRgb(colors.accentBlue)}, .12), rgba(${hexToRgb(colors.accentBlue)}, .9))` }}></div>
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>Backlog Analysis</h2>
      </div>
      <div className="card">
        <div className="backlog-summary-grid">
          <div className="backlog-box assigned">
            <div className="val">{fmt(backlog.assigned)}</div>
            <div className="lbl">Assigned ({backlog.assignedPct}%)</div>
          </div>
          <div className="backlog-box unassigned">
            <div className="val">{fmt(backlog.unassigned)}</div>
            <div className="lbl">Unassigned ({backlog.unassignedPct}%)</div>
          </div>
        </div>
      </div>

      <Modal
        open={slaModalOpen}
        onClose={() => setSlaModalOpen(false)}
        title={<>SLA by Channel — Trend Detail <InfoBtn onDark tip="<strong>Purpose</strong>SLA % by channel (Voice, Email, Chat, W2C) across the selected period range." /></>}
      >
        <div className="chart-container" style={{ height: 280 }}>
          <Bar data={channelSlaTrendChart.data} options={channelSlaTrendChart.options} />
        </div>
      </Modal>

      <Modal
        open={!!channelModalKey}
        onClose={() => setChannelModalKey(null)}
        title={channelTrendChart && (
          <>
            {channelTrendChart.label} by Channel — Trend Detail
            {' '}
            <InfoBtn onDark tip={`<strong>Purpose</strong>${channelTrendChart.label} Actual vs Forecast by channel, ${view} view — split from the same period-level numbers used across this dashboard.`} />
          </>
        )}
      >
        {channelTrendChart && (
          <div className="chart-container" style={{ height: 300 }}>
            <Bar data={channelTrendChart.data} options={channelTrendChart.options} />
          </div>
        )}
      </Modal>
    </div>
  )
}
