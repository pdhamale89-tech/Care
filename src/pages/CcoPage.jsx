import { Fragment, useMemo, useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  fmt, pct, varClass, arrow, genKpiValue, hashSeed, getWeeksForQuarter,
  getMetricCols, metricLabels, WEEK_DAYS, issueLabels, VALUE_SCALE,
} from '../data/mockGenerators.js'
import SparklineCard from '../charts/SparklineCard.jsx'
import SlaGaugeChart from '../charts/SlaGaugeChart.jsx'
import { actualForecastConfig, dualLineConfig, donutConfig, issueComboConfig } from '../charts/chartConfigs.js'

const VIEW_CONFIG = {
  daily: { title: 'Daily CCO Dashboard', subtitle: 'Day-level performance (Sat–Fri week), filtered by fiscal week & quarter', sectionTitle: 'Daily Performance Table' },
  weekly: { title: 'Weekly CCO Dashboard', subtitle: 'Fiscal week-level performance, filtered by fiscal quarter', sectionTitle: 'Weekly Performance Table' },
  quarterly: { title: 'Qtrly CCO Dashboard', subtitle: 'Quarter-level aggregated performance, filtered by fiscal week', sectionTitle: 'Quarterly Performance Table' },
}

const CHANNELS = ['Voice', 'Email', 'Chat', 'W2C']
const CHANNEL_BASES_1 = [6500, 4200, 3200, 1500]
const CHANNEL_BASES_3 = [9.2, 6.1, 5.4, 7.8]
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
  return ['FQ1', 'FQ2', 'FQ3', 'FQ4']
}

export default function CcoPage({ view, activeRegion, filters }) {
  const [metricKey, setMetricKey] = useState('contacts')
  const cfg = VIEW_CONFIG[view]
  const { subRegion, quarter, week, classification } = filters

  const seed = useMemo(
    () => hashSeed(subRegion + quarter + week + classification + activeRegion + view),
    [subRegion, quarter, week, classification, activeRegion, view],
  )
  const periods = useMemo(() => getPeriodsForView(view, quarter, week), [view, quarter, week])
  const cols = useMemo(() => getMetricCols(), [])

  const tableTitle = {
    daily: `Daily View — ${quarter}, Week ${week === 'All' ? getWeeksForQuarter(quarter)[0] : week} (Sat–Fri)`,
    weekly: `Weekly View — ${quarter} (13 Weeks)`,
    quarterly: 'Quarterly View — Full Fiscal Year (52 Weeks)',
  }[view]

  const tableRows = useMemo(
    () =>
      periods.map((p, i) => ({
        period: p,
        cells: cols.map((c, ci) => genKpiValue(c.base, seed + i * 7 + ci * 3)),
      })),
    [periods, cols, seed],
  )

  const sparklines = useMemo(
    () =>
      cols.map((c, ci) => ({
        key: c.key,
        unit: c.unit,
        series: periods.map((_, i) => genKpiValue(c.base, seed + i * 7 + ci * 3).actual),
      })),
    [cols, periods, seed],
  )

  const gaugeActual = useMemo(() => genKpiValue(91, seed + 500).actual, [seed])

  const explorerCfg = cols.find((c) => c.key === metricKey)
  const explorerChart = useMemo(() => {
    const actual = periods.map((_, i) => genKpiValue(explorerCfg.base, seed + i * 7).actual)
    const forecast = periods.map((_, i) => genKpiValue(explorerCfg.base, seed + i * 7).forecast)
    return actualForecastConfig(periods, actual, forecast, `${metricLabels[metricKey]} — Actual (bars) vs Forecast (line)`)
  }, [periods, seed, explorerCfg, metricKey])

  const timeChart = useMemo(() => {
    const actual = periods.map((_, i) => Math.round(2200 * VALUE_SCALE * (0.85 + ((Math.sin((seed + i) * 2.3) + 1) / 2) * 0.3)))
    const forecast = periods.map((_, i) => Math.round(2200 * VALUE_SCALE * (0.95 + i * 0.01)))
    return dualLineConfig(
      periods,
      { label: 'Actual', data: actual, color: '#0076CE', fill: true },
      { label: 'Forecast', data: forecast, color: '#5A5F68', dashed: true },
    )
  }, [periods, seed])

  const table1Rows = useMemo(
    () =>
      CHANNELS.map((c, i) => {
        const { actual, forecast } = genKpiValue(CHANNEL_BASES_1[i], seed + i + 70)
        const variance = actual - forecast
        return { channel: c, actual, forecast, variance, vp: pct(actual, forecast), cls: varClass(variance) }
      }),
    [seed],
  )

  const channelComboChart = useMemo(
    () => actualForecastConfig(CHANNELS, table1Rows.map((r) => r.actual), table1Rows.map((r) => r.forecast)),
    [table1Rows],
  )
  const channelShareChart = useMemo(
    () => donutConfig(CHANNELS, table1Rows.map((r) => r.actual), ['#0076CE', '#1E8E3E', '#F29900', '#5A5F68']),
    [table1Rows],
  )

  const table3Rows = useMemo(
    () =>
      CHANNELS.map((c, i) => {
        const { actual, forecast } = genKpiValue(CHANNEL_BASES_3[i], seed + i + 90)
        const variance = actual - forecast
        return { channel: c, actual, forecast, variance, vp: pct(actual, forecast), cls: varClass(variance) }
      }),
    [seed],
  )

  const issueCharts = useMemo(
    () =>
      ISSUE_CHARTS.map(({ id, title, base }) => {
        const actual = issueLabels.map((_, i) => Math.round(base * VALUE_SCALE * (0.8 + ((Math.sin((seed + i) * 2.7) + 1) / 2) * 0.5)))
        const forecast = issueLabels.map((_, i) => Math.round(base * VALUE_SCALE * (0.9 + i * 0.01)))
        const variance = actual.map((a, i) => a - forecast[i])
        return { id, title, config: issueComboConfig(issueLabels, actual, forecast, variance) }
      }),
    [seed],
  )

  const backlog = useMemo(() => {
    const opening = genKpiValue(3100, seed + 201).actual
    const newCases = genKpiValue(1200, seed + 202).actual
    const closed = genKpiValue(1150, seed + 203).actual
    const ending = Math.round(opening + newCases - closed)
    const weeks = Array.from({ length: 13 }, (_, i) => 'FW' + String(i + 1).padStart(2, '0'))
    const actual = weeks.map((_, i) => Math.round(ending * (0.85 + ((Math.sin((seed + i) * 1.9) + 1) / 2) * 0.3)))
    const forecast = weeks.map((_, i) => Math.round(ending * (0.95 + i * 0.005)))
    return {
      metrics: [
        { label: 'Opening Backlog', val: opening },
        { label: 'New Cases', val: newCases },
        { label: 'Closed Cases', val: closed },
        { label: 'Ending Backlog', val: ending },
      ],
      chart: dualLineConfig(
        weeks,
        { label: 'Actual', data: actual, color: '#0076CE', fill: true },
        { label: 'Forecast', data: forecast, color: '#5A5F68', dashed: true },
      ),
    }
  }, [seed])

  return (
    <main>
      <div className="dashboard-title">{cfg.title}</div>
      <div className="dashboard-subtitle">{cfg.subtitle}</div>

      <div className="section-title is-first">Quick Trend Snapshot</div>
      <div className="kpi-mini-grid">
        {sparklines.map((s) => (
          <SparklineCard key={s.key} title={metricLabels[s.key]} unit={s.unit} series={s.series} />
        ))}
      </div>

      <div className="section-title">{cfg.sectionTitle}</div>
      <div className="card">
        <h3>{tableTitle}</h3>
        <div className="scroll-table">
          <table>
            <thead>
              <tr>
                <th rowSpan={2}>Period</th>
                <th colSpan={2}>Contacts Offered</th>
                <th colSpan={2}>Orders</th>
                <th colSpan={2}>Case Rate</th>
                <th colSpan={2}>CPSR</th>
                <th colSpan={2}>Overall SLA</th>
                <th colSpan={2}>TCD</th>
              </tr>
              <tr>
                {cols.map((c) => (
                  <Fragment key={c.key}>
                    <th>Actual</th>
                    <th>Forecast</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  {row.cells.map((cell, ci) => (
                    <Fragment key={cols[ci].key}>
                      <td>{fmt(cell.actual)}{cols[ci].unit}</td>
                      <td className="fcst-cell">{fmt(cell.forecast)}{cols[ci].unit}</td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>Overall SLA — Actual vs Target</h3>
          <SlaGaugeChart actual={gaugeActual} target={95} />
        </div>
        <div className="card">
          <h3>Metric Trend Explorer</h3>
          <div className="filter-group" style={{ marginBottom: 14, maxWidth: 280 }}>
            <label>Select Metric</label>
            <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
              {cols.map((c) => (
                <option key={c.key} value={c.key}>{metricLabels[c.key]}</option>
              ))}
            </select>
          </div>
          <Bar data={explorerChart.data} options={explorerChart.options} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Trend — Contacts Offered (Actual vs Forecast)</h3>
        <Line data={timeChart.data} options={timeChart.options} />
      </div>

      <div className="section-title">Table 1: Contacts Offered by Channel</div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Channel</th><th>Actual</th><th>Forecast</th><th>Variance</th><th>Variance %</th></tr>
          </thead>
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

      <div className="section-title">Channel Mix Visuals</div>
      <div className="grid-2">
        <div className="card">
          <h3>Contacts Offered by Channel (Actual vs Forecast)</h3>
          <Bar data={channelComboChart.data} options={channelComboChart.options} />
        </div>
        <div className="card">
          <h3>Channel Share of Total Contacts</h3>
          <Doughnut data={channelShareChart.data} options={channelShareChart.options} />
        </div>
      </div>

      <div className="section-title">Table 3: TCD Breakdown by Contact Type</div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Channel</th><th>Actual</th><th>Forecast</th><th>Variance</th><th>Var %</th></tr>
          </thead>
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

      <div className="section-title">Issue Type Analysis</div>
      <div className="grid-3">
        {issueCharts.slice(0, 3).map((c) => (
          <div className="card" key={c.id}>
            <h3>{c.title}</h3>
            <Bar data={c.config.data} options={c.config.options} />
          </div>
        ))}
      </div>
      <div className="grid-2" style={{ marginTop: 20 }}>
        {issueCharts.slice(3).map((c) => (
          <div className="card" key={c.id}>
            <h3>{c.title}</h3>
            <Bar data={c.config.data} options={c.config.options} />
          </div>
        ))}
      </div>

      <div className="section-title">Backlog Analysis</div>
      <div className="card">
        <div className="backlog-metrics">
          {backlog.metrics.map((m) => (
            <div className="backlog-item" key={m.label}>
              <div className="val">{fmt(m.val)}</div>
              <div className="lbl">{m.label}</div>
            </div>
          ))}
        </div>
        <h3>13-Week Backlog Trend — Actual vs Forecast</h3>
        <Line data={backlog.chart.data} options={backlog.chart.options} />
      </div>
    </main>
  )
}
