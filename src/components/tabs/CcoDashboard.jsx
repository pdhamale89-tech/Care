import { Fragment, useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import {
  fmt, pct, varClass, arrow, genKpiValue, hashSeed, getWeeksForQuarter,
  WEEK_DAYS, issueLabels,
} from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels, lineDataLabels } from '../../charts/datalabels.js'
import DownloadBtn from '../common/DownloadBtn.jsx'
import Modal from '../common/Modal.jsx'
import { issueComboConfig } from '../../charts/chartConfigs.js'

const VIEW_CONFIG = {
  daily: { title: 'Daily Performance Table', sub: 'Day-level performance (Sat–Fri week)' },
  weekly: { title: 'Weekly Performance Table', sub: 'Fiscal week-level performance' },
  monthly: { title: 'Monthly Performance Table', sub: 'Month-level aggregated performance' },
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

const CHANNELS = ['Voice', 'Email', 'Chat', 'W2C']
const CHANNEL_BASES_1 = [6500, 4200, 3200, 1500]
const CHANNEL_BASES_3 = [9.2, 6.1, 5.4, 7.8]
const CHANNEL_SLA_BASES = [92, 88, 90, 85]
const ISSUE_CHARTS = [
  { id: 'issue1', title: 'Cases by Issue Type', base: 900 },
  { id: 'issue2', title: 'Activities by Issue Type', base: 1400 },
  { id: 'issue3', title: 'APC by Issue Type', base: 300 },
  { id: 'issue4', title: 'TTC by Issue Type', base: 60 },
  { id: 'issue5', title: 'Case Rate by Issue Type', base: 15 },
]

function getPeriodsForView(view, quarter, week) {
  if (view === 'daily') {
    const wk = week === 'All' ? getWeeksForQuarter(quarter)[0] : week
    return WEEK_DAYS.map((d) => `${wk} - ${d}`)
  }
  if (view === 'weekly') return getWeeksForQuarter(quarter)
  if (view === 'monthly') return Array.from({ length: 12 }, (_, i) => 'FM' + String(i + 1).padStart(2, '0'))
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
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { min: 75, max: 100 } } },
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
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: col.key !== 'caseRate' } } },
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
    monthly: 'Monthly View — Full Fiscal Year (12 Months)',
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

  const overallSla = useMemo(() => {
    const actual = genKpiValue(91, seed + 999).actual
    return { actual, met: actual >= 90 }
  }, [seed])

  const channelSlaTrendChart = useMemo(() => {
    const labels = periods.map(shortPeriodLabel)
    const seriesColors = [colors.accentBlue, colors.accentGreen, colors.accentOrange, colors.accentRed]
    return {
      data: {
        labels,
        datasets: CHANNELS.map((c, ci) => ({
          label: c,
          data: periods.map((_, i) => genKpiValue(CHANNEL_SLA_BASES[ci], seed + i * 13 + ci * 11 + 300).actual),
          borderColor: seriesColors[ci],
          backgroundColor: seriesColors[ci] + '1a',
          tension: 0.35,
          pointRadius: 3,
          datalabels: lineDataLabels('%', seriesColors[ci]),
        })),
      },
      options: {
        responsive: true,
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
      return METRIC_COLS.map((c, ci) => {
        const actual = periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3).actual)
        const forecast = periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3).forecast)
        return {
          key: c.key,
          title: c.hf ? `${c.label} — Actual vs Forecast` : `${c.label} — Actual`,
          config: buildMetricComparisonConfig(c, shortLabels, actual, forecast, colors),
        }
      })
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
    () => CHANNELS.map((c, i) => {
      const { actual, forecast } = genKpiValue(CHANNEL_BASES_3[i], seed + i + 90)
      const variance = actual - forecast
      return { channel: c, actual, forecast, variance, vp: pct(actual, forecast), cls: varClass(variance) }
    }),
    [seed],
  )

  const issueCharts = useMemo(
    () => ISSUE_CHARTS.map(({ id, title, base }) => {
      const actual = issueLabels.map((_, i) => Math.round(base * (0.8 + ((Math.sin((seed + i) * 2.7) + 1) / 2) * 0.5)))
      const forecast = issueLabels.map((_, i) => Math.round(base * (0.9 + i * 0.01)))
      const variance = actual.map((a, i) => a - forecast[i])
      return { id, title, config: issueComboConfig(issueLabels, actual, forecast, variance, '', colors) }
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
      <div className="kpi-mini-grid">
        {keyMetrics.metrics.map((m) => (
          <div className="kpi-mini-card" key={m.key}>
            <div className="kpi-mini-title">{m.label}</div>
            <div className="kpi-mini-value">{fmt(m.actual)}{m.unit}</div>
            {m.hf && (
              <>
                <div className="kpi-mini-forecast">Forecast: {fmt(m.forecast)}{m.unit}</div>
                <div className="kpi-mini-sub"><span className={'badge ' + m.cls}>{arrow(m.variance)} {fmt(Math.abs(m.vp))}% variance</span></div>
              </>
            )}
          </div>
        ))}
        <div className="kpi-mini-card">
          <div className="kpi-mini-title">CRW</div>
          <div className="kpi-mini-value">{fmt(keyMetrics.crw)}</div>
          <div className="kpi-mini-sub">Actual only</div>
        </div>
        <div className="kpi-mini-card">
          <div className="kpi-mini-title">Headcount</div>
          <div className="kpi-mini-value">{fmt(keyMetrics.headcount)}</div>
          <div className="kpi-mini-sub">Actual only</div>
        </div>
      </div>

      <div className="section-div">
        <h2>Overall SLA (Actual)</h2>
      </div>
      <div className="kpi-mini-grid">
        <div
          className="kpi-mini-card sla-card clickable"
          style={{ maxWidth: 300 }}
          onClick={() => setSlaModalOpen(true)}
          title="Click to see SLA by Channel trend"
        >
          <div className="kpi-mini-title">Overall SLA</div>
          <div className={'kpi-mini-value ' + (overallSla.met ? 'sla-met' : 'sla-miss')} style={{ fontSize: 32 }}>{fmt(overallSla.actual)}%</div>
          <div className="kpi-mini-sub">Actual across all channels · Click for channel trend</div>
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
                  <td>{fmt(r.actual)} min</td>
                  <td>{fmt(r.forecast)} min</td>
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
      <div className="s-grid">
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
          <Line data={channelSlaTrendChart.data} options={channelSlaTrendChart.options} />
        </div>
      </Modal>
    </div>
  )
}
