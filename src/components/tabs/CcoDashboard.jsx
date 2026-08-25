import { Fragment, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import {
  fmt, pct, varClass, arrow, genKpiValue, hashSeed, getWeeksForQuarter,
  WEEK_DAYS, issueLabels,
} from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels } from '../../charts/datalabels.js'
import DownloadBtn from '../common/DownloadBtn.jsx'
import Modal from '../common/Modal.jsx'
import { issueComboConfig } from '../../charts/chartConfigs.js'

const VIEW_CONFIG = {
  daily: { title: 'Daily Performance Table', sub: 'Day-level performance (Sat–Fri week)' },
  weekly: { title: 'Weekly Performance Table', sub: 'Fiscal week-level performance' },
  quarterly: { title: 'Quarterly Performance Table', sub: 'Quarter-level aggregated performance' },
}

const METRIC_COLS = [
  { key: 'contacts', label: 'Contacts Offered', base: 2200, unit: '', hf: true },
  { key: 'orders', label: 'Orders', base: 1150, unit: '', hf: true },
  { key: 'caseRate', label: 'Case Rate', base: 12.5, unit: '%', hf: true },
  { key: 'cpsr', label: 'CPSR', base: 4.2, unit: '', hf: true },
  { key: 'sla', label: 'Overall SLA', base: 91, unit: '%', hf: false },
  { key: 'tcd', label: 'TCD', base: 48000, unit: '', hf: true },
]

const EXTRA_METRIC_CHARTS = [
  { key: 'cases', label: 'Cases', base: 3200, unit: '', hf: true },
  { key: 'activities', label: 'Activities', base: 16000, unit: '', hf: true },
  { key: 'apc', label: 'APC', base: 4.8, unit: '', hf: false },
  { key: 'icw', label: 'ICW', base: 850, unit: '', hf: false },
  { key: 'ccpd', label: 'CCpD', base: 42, unit: '', hf: false },
]

const CHANNELS = ['Voice', 'Email', 'Chat', 'W2C']
const CHANNEL_BASES_1 = [6500, 4200, 3200, 1500]
const TCD_CHANNELS = ['Voice', 'Email', 'Chat']
const TCD_CHANNEL_BASES = [9500, 7400, 8600]
const CHANNEL_SLA_BASES = [92, 88, 90, 85]
const ISSUE_CHARTS = [
  { id: 'issue1', title: 'Cases by Issue Type', base: 900, unit: '' },
  { id: 'issue2', title: 'Activities by Issue Type', base: 1400, unit: '' },
  { id: 'issue3', title: 'APC by Issue Type', base: 300, unit: '' },
  { id: 'issue4', title: 'TTC by Issue Type', base: 60, unit: '' },
  { id: 'issue5', title: 'Case Rate by Issue Type', base: 15, unit: '' },
  { id: 'issue6', title: 'Ci1 by Issue Type', base: 20, unit: '%' },
]

function getPeriodsForView(view, quarter, week) {
  if (view === 'daily') {
    const wk = week === 'All' ? getWeeksForQuarter(quarter)[0] : week
    return WEEK_DAYS.map((d) => `${wk} - ${d}`)
  }
  if (view === 'weekly') return getWeeksForQuarter(quarter)
  return ['FQ1', 'FQ2', 'FQ3', 'FQ4']
}

function shortPeriodLabel(p) {
  const parts = p.split(' - ')
  return parts.length > 1 ? parts[1] : p
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
  return {
    data: {
      labels,
      datasets: [
        { label: 'Actual', data: actual, backgroundColor: colors.accentBlue, borderRadius: 4, datalabels: barDataLabels(col.unit, colors.accentBlue) },
        { label: 'Forecast', data: forecast, backgroundColor: colors.border, borderRadius: 4, datalabels: barDataLabels(col.unit, colors.textSecondary) },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: col.key !== 'caseRate' } } },
  }
}

export default function CcoDashboard({ view }) {
  const { theme, activeRegion, ccoFilters } = useApp()
  const colors = getColors(theme)
  const cfg = VIEW_CONFIG[view]
  const { subRegion, quarter, week, classification } = ccoFilters
  const [slaModalOpen, setSlaModalOpen] = useState(false)

  const seed = useMemo(
    () => hashSeed(subRegion + quarter + week + classification + activeRegion + view),
    [subRegion, quarter, week, classification, activeRegion, view],
  )
  const periods = useMemo(() => getPeriodsForView(view, quarter, week), [view, quarter, week])

  const tableTitle = {
    daily: `Daily View — ${quarter}, Week ${week === 'All' ? getWeeksForQuarter(quarter)[0] : week} (Sat–Fri)`,
    weekly: `Weekly View — ${quarter} (13 Weeks)`,
    quarterly: 'Quarterly View — Full Fiscal Year (52 Weeks)',
  }[view]

  const keyMetrics = useMemo(() => {
    const li = periods.length - 1
    const metrics = METRIC_COLS.map((c, ci) => {
      const { actual, forecast } = genKpiValue(c.base, seed + li * 7 + ci * 3)
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
          data: periods.map((_, i) => genKpiValue(CHANNEL_SLA_BASES[ci], seed + i * 13 + ci * 11 + 300).actual),
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

  const tableRows = useMemo(
    () => periods.map((p, i) => ({
      period: p,
      cells: METRIC_COLS.map((c, ci) => genKpiValue(c.base, seed + i * 7 + ci * 3)),
    })),
    [periods, seed],
  )

  const metricCharts = useMemo(
    () => {
      const shortLabels = periods.map(shortPeriodLabel)
      return [...METRIC_COLS, ...EXTRA_METRIC_CHARTS]
        .map((c, ci) => {
          const actual = periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3).actual)
          const forecast = periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3).forecast)
          return {
            key: c.key,
            title: c.hf ? `${c.label} — Actual vs Forecast` : `${c.label} — Actual`,
            config: buildMetricComparisonConfig(c, shortLabels, actual, forecast, colors),
          }
        })
        .filter((c) => c.key !== 'sla')
    },
    [periods, seed, colors],
  )

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
      const forecast = issueLabels.map((_, i) => Math.round(base * (0.9 + i * 0.01)))
      const variance = actual.map((a, i) => a - forecast[i])
      return { id, title, config: issueComboConfig(issueLabels, actual, forecast, variance, unit, colors) }
    }),
    [seed, colors],
  )

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
        <h2>{cfg.title}</h2>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">{tableTitle}</div>
          <DownloadBtn
            filename={`cco-${view}-table`}
            rows={[
              ['Period', ...METRIC_COLS.flatMap((c) => (c.hf ? [c.label + ' (Actual)', c.label + ' (Forecast)'] : [c.label + ' (Actual)']))],
              ...tableRows.map((row) => [row.period, ...row.cells.flatMap((cell, ci) => (METRIC_COLS[ci].hf ? [cell.actual, cell.forecast] : [cell.actual]))]),
            ]}
          />
        </div>
        <div className="tw scroll">
          <table>
            <thead>
              <tr>
                <th rowSpan={2}>Period</th>
                <th colSpan={2}>Contacts Offered</th>
                <th colSpan={2}>Orders</th>
                <th colSpan={2}>Case Rate</th>
                <th colSpan={2}>CPSR</th>
                <th>Overall SLA</th>
                <th colSpan={2}>TCD</th>
              </tr>
              <tr>
                <th>Actual</th><th>Forecast</th>
                <th>Actual</th><th>Forecast</th>
                <th>Actual</th><th>Forecast</th>
                <th>Actual</th><th>Forecast</th>
                <th>Actual</th>
                <th>Actual</th><th>Forecast</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  {row.cells.map((cell, ci) => (
                    <Fragment key={METRIC_COLS[ci].key}>
                      <td>{fmt(cell.actual)}{METRIC_COLS[ci].unit}</td>
                      {METRIC_COLS[ci].hf && <td className="fcst-cell">{fmt(cell.forecast)}{METRIC_COLS[ci].unit}</td>}
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-div">
        <h2>Metric Comparison — Actual vs Forecast</h2>
      </div>
      <div className="s-grid">
        {metricCharts.map((c) => (
          <div className="card" key={c.key}>
            <div className="card-header"><div className="card-title">{c.title}</div></div>
            <div className="chart-container">
              <Bar data={c.config.data} options={c.config.options} />
            </div>
          </div>
        ))}
      </div>

      <div className="section-div">
        <h2>Contacts Offered by Channel</h2>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Channel Volume</div>
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
          <div className="card-title">Contact Type Duration</div>
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
            <div className="card-header"><div className="card-title">{c.title}</div></div>
            <div className="chart-container">
              <Bar data={c.config.data} options={c.config.options} />
            </div>
          </div>
        ))}
      </div>
      <div className="s-grid thirds">
        {issueCharts.slice(3).map((c) => (
          <div className="card" key={c.id}>
            <div className="card-header"><div className="card-title">{c.title}</div></div>
            <div className="chart-container">
              <Bar data={c.config.data} options={c.config.options} />
            </div>
          </div>
        ))}
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

      <Modal open={slaModalOpen} onClose={() => setSlaModalOpen(false)} title="SLA by Channel — Trend Detail">
        <div className="chart-container" style={{ height: 280 }}>
          <Bar data={channelSlaTrendChart.data} options={channelSlaTrendChart.options} />
        </div>
      </Modal>
    </div>
  )
}
