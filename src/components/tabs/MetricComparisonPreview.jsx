import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { fmt, genKpiValue, hashSeed, getWeeksForQuarter, WEEK_DAYS } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels } from '../../charts/datalabels.js'
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

export default function MetricComparisonPreview() {
  const { theme, activeRegions, ccoFilters, ccoView, setCcoView } = useApp()
  const colors = getColors(theme)
  const { subRegion, quarter, week, classification } = ccoFilters

  const seed = useMemo(
    () => hashSeed(subRegion.join(',') + quarter.join(',') + week.join(',') + classification.join(',') + activeRegions.join(',') + ccoView),
    [subRegion, quarter, week, classification, activeRegions, ccoView],
  )
  const periods = useMemo(() => getPeriodsForView(ccoView, quarter, week), [ccoView, quarter, week])

  // Latest-period Actual vs Forecast snapshot per metric — same numbers CCO Overview shows.
  const metrics = useMemo(() => {
    const li = periods.length - 1
    return ALL_METRICS.map((c, ci) => {
      const { actual, forecast } = genKpiValue(c.base, seed + li * 7 + ci * 3, c.decimals)
      const variancePct = forecast === 0 ? 0 : ((actual - forecast) / forecast) * 100
      return { ...c, actual, forecast, variancePct }
    })
  }, [periods, seed])

  const ranked = useMemo(() => [...metrics].sort((a, b) => b.variancePct - a.variancePct), [metrics])

  const summary = useMemo(() => {
    const ahead = metrics.filter((m) => m.variancePct >= 0).length
    const best = ranked[0]
    const worst = ranked[ranked.length - 1]
    return { ahead, total: metrics.length, best, worst }
  }, [metrics, ranked])

  const rankedChart = useMemo(() => {
    const labels = ranked.map((m) => m.label)
    const data = ranked.map((m) => Math.round(m.variancePct * 10) / 10)
    const backgroundColor = ranked.map((m) => (m.variancePct >= 0 ? colors.accentGreen : colors.accentRed))
    return {
      data: { labels, datasets: [{ label: 'Variance vs Forecast', data, backgroundColor, borderRadius: 4, datalabels: barDataLabels('%', colors.textPrimary) }] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { callback: (v) => v + '%' } }, y: { ticks: { font: { size: 10 } } } },
      },
    }
  }, [ranked, colors])

  return (
    <div className="tab-panel active">
      <div className="ai-story">
        <div className="ai-icon-box">📈</div>
        <div>
          <div className="ai-story-title">Preview — not live in CCO Overview</div>
          <div className="ai-story-text">
            {summary.ahead} of {summary.total} metrics are ahead of forecast this {ccoView === 'daily' ? 'day' : ccoView === 'weekly' ? 'week' : 'quarter'}.
            {summary.best && <> {summary.best.label} leads at {summary.best.variancePct >= 0 ? '+' : ''}{fmt(summary.best.variancePct)}%.</>}
            {summary.worst && <> {summary.worst.label} lags furthest at {fmt(summary.worst.variancePct)}%.</>}
          </div>
        </div>
      </div>

      <div className="period-bar" style={{ marginBottom: 14 }}>
        {[['daily', 'Daily'], ['weekly', 'Weekly'], ['quarterly', 'Quarterly']].map(([v, label]) => (
          <button key={v} type="button" className={'p-btn' + (ccoView === v ? ' active' : '')} onClick={() => setCcoView(v)}>{label}</button>
        ))}
      </div>

      <div className="kpi-grid">
        {metrics.map((m) => (
          <div className="kpi-card" key={m.key}>
            <div className="kpi-label">{m.label}</div>
            <div className="kpi-value">{fmt(m.actual)}{m.unit}</div>
            <div className="kpi-sub">{m.variancePct >= 0 ? '▲' : '▼'} {fmt(Math.abs(m.variancePct))}% vs forecast</div>
          </div>
        ))}
      </div>

      <div className="section-div">
        <h2>
          Performance vs Forecast <InfoBtn tip="<strong>Purpose</strong>Every metric's variance against forecast, ranked best to worst, in one glance." />
        </h2>
      </div>
      <div className="card">
        <div className="chart-container" style={{ height: Math.max(280, ranked.length * 34) }}>
          <Bar data={rankedChart.data} options={rankedChart.options} />
        </div>
      </div>
    </div>
  )
}
