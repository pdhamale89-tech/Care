import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { fmt, genKpiValue, hashSeed, getWeeksForQuarter, WEEK_DAYS } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import InfoBtn from '../common/InfoBtn.jsx'

// Same metric set + generation formula as CCO Overview's Metric Comparison section,
// duplicated here so this preview stays numerically identical without touching the live tab.
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
const ALL_METRICS = [...METRIC_COLS, ...EXTRA_METRIC_CHARTS].filter((c) => c.key !== 'sla')

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

// Diverging: blue = ahead of forecast, red = behind, gray = on target. Matches the
// app's existing accentBlue/accentRed pair used everywhere else for pos/neg variance.
function divergingCellStyle(variancePct, colors) {
  const clamped = Math.max(-25, Math.min(25, variancePct))
  const t = Math.abs(clamped) / 25
  const rgb = clamped >= 0 ? hexToRgb(colors.accentBlue) : hexToRgb(colors.accentRed)
  const alpha = 0.08 + t * 0.72
  return { background: `rgba(${rgb}, ${alpha})`, color: t > 0.5 ? '#fff' : colors.textPrimary }
}

function Sparkline({ values, color, mutedColor, width = 110, height = 28 }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * (width - 6) + 3
    const y = height - 3 - ((v - min) / range) * (height - 6)
    return [x, y]
  })
  const path = pts.map((p) => p.join(',')).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} className="spark-svg">
      <polyline points={path} fill="none" stroke={mutedColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3.5" fill={color} stroke="var(--bg-card)" strokeWidth="2" />
    </svg>
  )
}

export default function MetricComparisonPreview() {
  const { theme, activeRegions, ccoFilters, ccoView, setCcoView } = useApp()
  const colors = getColors(theme)
  const { subRegion, quarter, week, classification } = ccoFilters
  const [section, setSection] = useState('all')

  const seed = useMemo(
    () => hashSeed(subRegion.join(',') + quarter.join(',') + week.join(',') + classification.join(',') + activeRegions.join(',') + ccoView),
    [subRegion, quarter, week, classification, activeRegions, ccoView],
  )
  const periods = useMemo(() => getPeriodsForView(ccoView, quarter, week), [ccoView, quarter, week])
  const periodLabels = useMemo(() => periods.map(shortPeriodLabel), [periods])

  // One row per metric: full actual/forecast series across every period, plus the latest snapshot.
  const metricSeries = useMemo(
    () => ALL_METRICS.map((c, ci) => {
      const actual = periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3, c.decimals).actual)
      const forecast = periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3, c.decimals).forecast)
      const li = actual.length - 1
      const variancePct = forecast[li] === 0 ? 0 : ((actual[li] - forecast[li]) / forecast[li]) * 100
      return { ...c, actual, forecast, variancePct }
    }),
    [periods, seed],
  )

  const trendCharts = useMemo(
    () => metricSeries.map((m) => ({
      key: m.key,
      label: m.label,
      config: {
        data: {
          labels: periodLabels,
          datasets: [
            { label: 'Actual', data: m.actual, borderColor: colors.accentBlue, backgroundColor: colors.accentBlue + '1a', fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2 },
            ...(m.hf ? [{ label: 'Forecast', data: m.forecast, borderColor: colors.textSecondary, borderDash: [4, 3], borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 }] : []),
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
          scales: { x: { ticks: { font: { size: 9 } } }, y: { beginAtZero: m.key !== 'caseRate' } },
        },
      },
    })),
    [metricSeries, periodLabels, colors],
  )

  return (
    <div className="tab-panel active">
      <div className="ai-story">
        <div className="ai-icon-box">🧪</div>
        <div>
          <div className="ai-story-title">Preview — not live in CCO Overview</div>
          <div className="ai-story-text">
            Three ways to present the Metric Comparison — Actual vs Forecast data (same numbers, same Daily/Weekly/Quarterly
            button below). Compare them here; tell me which one (or mix) to bring into CCO Overview.
          </div>
        </div>
      </div>

      <div className="period-bar" style={{ marginBottom: 14 }}>
        {[['daily', 'Daily'], ['weekly', 'Weekly'], ['quarterly', 'Quarterly']].map(([v, label]) => (
          <button key={v} type="button" className={'p-btn' + (ccoView === v ? ' active' : '')} onClick={() => setCcoView(v)}>{label}</button>
        ))}
      </div>

      <div className="plan-sel" style={{ marginBottom: 14 }}>
        {[['all', 'All 3 options'], ['tiles', 'A · Stat tiles'], ['heatmap', 'B · Variance heatmap'], ['trend', 'C · Trend lines']].map(([v, label]) => (
          <button key={v} type="button" className={'plan-btn' + (section === v ? ' active' : '')} onClick={() => setSection(v)}>{label}</button>
        ))}
      </div>

      {(section === 'all' || section === 'tiles') && (
        <>
          <div className="section-div">
            <h2>
              A · Stat Tiles <InfoBtn tip="<strong>Purpose</strong>Headline value + variance + trend sparkline per metric, for a quick at-a-glance scan." />
            </h2>
            <p>One compact tile per metric: latest Actual, variance vs Forecast, and a sparkline of its trend across every period shown.</p>
          </div>
          <div className="mc-tile-grid">
            {metricSeries.map((m) => {
              const li = m.actual.length - 1
              const pos = m.variancePct >= 0
              return (
                <div className="mc-tile" key={m.key} title={`Actual ${fmt(m.actual[li])}${m.unit} · Forecast ${fmt(m.forecast[li])}${m.unit}`}>
                  <div className="mc-tile-label">{m.label}</div>
                  <div className="mc-tile-value">{fmt(m.actual[li])}{m.unit}</div>
                  {m.hf && (
                    <div className={'mc-tile-delta ' + (pos ? 'pos' : 'neg')}>
                      {pos ? '▲' : '▼'} {fmt(Math.abs(m.variancePct))}% vs forecast
                    </div>
                  )}
                  <Sparkline values={m.actual} color={colors.accentBlue} mutedColor={colors.border} />
                </div>
              )
            })}
          </div>
        </>
      )}

      {(section === 'all' || section === 'heatmap') && (
        <>
          <div className="section-div">
            <h2>
              B · Variance Heatmap <InfoBtn tip="<strong>Purpose</strong>All metrics x all periods in one grid — cell shade shows how far Actual sits from Forecast that period, so trends and outliers surface without opening 10 separate charts." />
            </h2>
            <p>Multi-dimensional view: every metric (rows) across every period (columns) at once. Blue = ahead of forecast, red = behind, gray = on target.</p>
          </div>
          <div className="card">
            <div className="heatmap-wrap">
              <table className="heatmap-tbl">
                <thead>
                  <tr>
                    <th></th>
                    {periodLabels.map((l, i) => <th key={i}>{l}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {metricSeries.map((m) => (
                    <tr key={m.key}>
                      <td className="heatmap-rowlbl">{m.label}</td>
                      {m.actual.map((v, i) => {
                        const f = m.forecast[i]
                        const vp = f === 0 ? 0 : ((v - f) / f) * 100
                        return (
                          <td key={i} className="heatmap-cell" style={divergingCellStyle(vp, colors)} title={`${m.label} · ${periodLabels[i]}\nActual ${fmt(v)}${m.unit} · Forecast ${fmt(f)}${m.unit} · ${vp >= 0 ? '+' : ''}${vp.toFixed(1)}%`}>
                            {fmt(v)}{m.unit}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="heatmap-legend">
              <span>Behind forecast</span>
              <div className="heatmap-legend-bar" style={{ background: `linear-gradient(90deg, rgba(${hexToRgb(colors.accentRed)}, .7), ${colors.border}, rgba(${hexToRgb(colors.accentBlue)}, .7))` }}></div>
              <span>Ahead of forecast</span>
            </div>
          </div>
        </>
      )}

      {(section === 'all' || section === 'trend') && (
        <>
          <div className="section-div">
            <h2>
              C · Trend Lines <InfoBtn tip="<strong>Purpose</strong>Actual as a solid filled line, Forecast as a dashed baseline — reads the shape of the trend, not just bar heights." />
            </h2>
            <p>Same small-multiples layout as today's Metric Comparison, restyled as line + forecast baseline instead of paired bars.</p>
          </div>
          <div className="s-grid thirds">
            {trendCharts.map((c) => (
              <div className="card" key={c.key}>
                <div className="card-header"><div className="card-title">{c.label}</div></div>
                <div className="chart-container">
                  <Line data={c.config.data} options={c.config.options} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
