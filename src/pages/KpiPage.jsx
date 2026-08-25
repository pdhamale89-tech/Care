import { useMemo, useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  fmt, pct, varClass, arrow, genKpiValue, hashSeed, getWeeksForQuarter,
  WEEK_DAYS, getIntradayIntervals,
} from '../data/mockGenerators.js'
import { dualLineConfig, donutConfig, dualAxisBarLineConfig } from '../charts/chartConfigs.js'

const KPI_VIEW_CONFIG = {
  voice: { title: 'Voice Queue KPI', subtitle: 'Voice queue performance — SLA, AHT, Occupancy, Handled/Offered, Agent Time Distribution' },
  digital: { title: 'Chat and Email KPI', subtitle: 'Chat & Email queue performance — SLA, AHT, Occupancy, Handled/Offered, Agent Time Distribution' },
  intraday: { title: 'Intraday Performance', subtitle: 'Real-time interval-level performance for the selected day' },
}

function getKpiPeriods(timeView, quarter, week) {
  if (timeView === 'daily') {
    const wk = week === 'All' ? getWeeksForQuarter(quarter)[0] : week
    return WEEK_DAYS.map((d) => `${wk} - ${d}`)
  }
  if (timeView === 'weekly') return getWeeksForQuarter(quarter)
  return ['FQ1', 'FQ2', 'FQ3', 'FQ4']
}

export default function KpiPage({ kView, activeRegion, filters }) {
  const [version, setVersion] = useState('Actual')
  const [timeView, setTimeView] = useState('daily')
  const cfg = KPI_VIEW_CONFIG[kView]
  const { country, quarter, week, queue } = filters

  const seed = useMemo(
    () => hashSeed(country + quarter + week + queue + activeRegion + kView + timeView),
    [country, quarter, week, queue, activeRegion, kView, timeView],
  )
  const periods = useMemo(() => getKpiPeriods(timeView, quarter, week), [timeView, quarter, week])
  const baseOffered = kView === 'voice' ? 900 : 600

  const overviewDefs = [
    { label: 'SLA', base: 90, unit: '%' },
    { label: 'AHT', base: 8.5, unit: 'min' },
    { label: 'Offered', base: kView === 'voice' ? 6500 : 4200, unit: '' },
    { label: 'Handled', base: kView === 'voice' ? 6300 : 4050, unit: '' },
    { label: 'Occupancy', base: 82, unit: '%' },
    { label: 'Break Time', base: 45, unit: 'min' },
    { label: 'Training Time', base: 30, unit: 'min' },
    { label: 'Adherence', base: 88, unit: '%' },
  ]
  const overview = useMemo(
    () =>
      overviewDefs.map((d, i) => {
        const { actual, forecast } = genKpiValue(d.base, seed + i * 5)
        const variance = actual - forecast
        const val = version === 'Actual' ? actual : version === 'Forecast' ? forecast : variance
        return { ...d, val, variance, cls: varClass(variance) }
      }),
    [seed, version],
  )

  const tableTitle = {
    daily: `Daily View — ${quarter}, Week ${week === 'All' ? getWeeksForQuarter(quarter)[0] : week} (Sat–Fri)`,
    weekly: `Weekly View — ${quarter} (13 Weeks)`,
    quarterly: 'Quarterly View — Full Fiscal Year (52 Weeks)',
  }[timeView]

  const tableCols = [
    { key: 'offered', base: baseOffered },
    { key: 'handled', base: baseOffered * 0.96 },
    { key: 'sla', base: 90, unit: '%' },
    { key: 'aht', base: 8.5, unit: 'min' },
    { key: 'occupancy', base: 82, unit: '%' },
    { key: 'break', base: 45, unit: 'min' },
    { key: 'training', base: 30, unit: 'min' },
    { key: 'adherence', base: 88, unit: '%' },
  ]
  const tableRows = useMemo(
    () =>
      periods.map((p, i) => ({
        period: p,
        cells: tableCols.map((c, ci) => {
          const { actual, forecast } = genKpiValue(c.base, seed + i * 7 + ci * 3)
          const variance = actual - forecast
          const vp = pct(actual, forecast)
          return { actual, forecast, variance, vp, unit: c.unit || '', cls: varClass(variance) }
        }),
      })),
    [periods, seed],
  )

  const trendChart = useMemo(() => {
    const offered = periods.map((_, i) => Math.round(baseOffered * (0.85 + ((Math.sin((seed + i) * 2.3) + 1) / 2) * 0.3)))
    const handled = offered.map((o) => Math.round(o * 0.95))
    return dualLineConfig(
      periods,
      { label: 'Offered', data: offered, color: '#0076CE', fill: true },
      { label: 'Handled', data: handled, color: '#1E8E3E', dashed: true },
    )
  }, [periods, seed, baseOffered])

  const timeDistChart = useMemo(() => {
    const labels = ['Handled Time', 'Break', 'Training', 'Meetings', 'Idle/Available', 'Admin Work']
    const bases = [320, 45, 30, 20, 50, 15]
    const data = bases.map((b, i) => Math.round(b * (0.85 + ((Math.sin((seed + i) * 3.1) + 1) / 2) * 0.3)))
    return donutConfig(labels, data, ['#0076CE', '#F29900', '#5AB0EA', '#9AA1AC', '#1E8E3E', '#2B2E34'])
  }, [seed])

  const slaAhtChart = useMemo(() => {
    const sla = periods.map((_, i) => Math.round(85 + ((Math.sin((seed + i) * 2.1) + 1) / 2) * 12))
    const aht = periods.map((_, i) => Math.round((7 + ((Math.sin((seed + i) * 1.7) + 1) / 2) * 3) * 10) / 10)
    return dualAxisBarLineConfig(periods, { label: 'SLA %', data: sla, color: '#0076CE' }, { label: 'AHT (min)', data: aht, color: '#D93025' })
  }, [periods, seed])

  const intervals = useMemo(() => getIntradayIntervals(), [])
  const intradayRows = useMemo(
    () =>
      intervals.map((t, i) => {
        const offeredBase = 60 + Math.sin(i / 3) * 25
        const { actual: offered } = genKpiValue(offeredBase, seed + i * 3)
        const handled = Math.round(offered * 0.94)
        const sla = Math.round(80 + ((Math.sin((seed + i) * 1.9) + 1) / 2) * 18)
        const aht = Math.round((7 + ((Math.sin((seed + i) * 2.3) + 1) / 2) * 3) * 10) / 10
        const required = Math.round(offered / 12)
        const staffed = Math.round(required * (0.9 + ((Math.sin((seed + i) * 1.3) + 1) / 2) * 0.25))
        const occ = Math.min(100, Math.round((offered / (staffed * 12)) * 100))
        return { t, offered, handled, sla, aht, required, staffed, occ }
      }),
    [intervals, seed],
  )

  const intradayStaffChart = useMemo(() => {
    const required = intervals.map((_, i) => Math.round((60 + Math.sin(i / 3) * 25) / 12))
    const staffed = required.map((r, i) => Math.round(r * (0.9 + ((Math.sin((seed + i) * 1.3) + 1) / 2) * 0.25)))
    return dualLineConfig(
      intervals,
      { label: 'Required', data: required, color: '#D93025' },
      { label: 'Staffed', data: staffed, color: '#0076CE', fill: true },
    )
  }, [intervals, seed])

  const intradayVolumeChart = useMemo(() => {
    const offered = intervals.map((_, i) => Math.round(60 + Math.sin(i / 3) * 25))
    const handled = offered.map((o) => Math.round(o * 0.94))
    return {
      data: { labels: intervals, datasets: [
        { label: 'Offered', data: offered, backgroundColor: '#0076CE' },
        { label: 'Handled', data: handled, backgroundColor: '#1E8E3E' },
      ] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    }
  }, [intervals])

  const isIntraday = kView === 'intraday'

  return (
    <main>
      <div className="dashboard-title">{cfg.title}</div>
      <div className="dashboard-subtitle">{cfg.subtitle}</div>

      <div className="pill-toggle">
        {['Actual', 'Forecast', 'Variance'].map((v) => (
          <button key={v} className={version === v ? 'active' : ''} onClick={() => setVersion(v)}>{v}</button>
        ))}
      </div>

      {!isIntraday && (
        <div className="time-tabs">
          {[['daily', 'Daily View'], ['weekly', 'Weekly View'], ['quarterly', 'Quarterly View']].map(([v, label]) => (
            <button key={v} className={timeView === v ? 'active' : ''} onClick={() => setTimeView(v)}>{label}</button>
          ))}
        </div>
      )}

      <div className="section-title is-first">Queue Overview</div>
      <div className="kpi-mini-grid">
        {overview.map((d) => (
          <div className="kpi-mini-card" key={d.label}>
            <div className="kpi-mini-title">{d.label}</div>
            <div className="kpi-mini-value">{fmt(d.val)}{d.unit}</div>
            <div className={'kpi-mini-sub ' + d.cls}>{arrow(d.variance)} {fmt(Math.abs(d.variance))}{d.unit} vs FCST</div>
          </div>
        ))}
      </div>

      {!isIntraday && (
        <>
          <div className="section-title">Queue Performance Table</div>
          <div className="card">
            <h3>{tableTitle}</h3>
            <div className="scroll-table">
              <table>
                <thead>
                  <tr>
                    <th>Period</th><th>Offered</th><th>Handled</th><th>SLA %</th><th>AHT (min)</th>
                    <th>Occupancy %</th><th>Break (min)</th><th>Training (min)</th><th>Adherence %</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.period}>
                      <td>{row.period}</td>
                      {row.cells.map((c, ci) => (
                        <td key={ci}>
                          {version === 'Actual' && `${fmt(c.actual)}${c.unit}`}
                          {version === 'Forecast' && `${fmt(c.forecast)}${c.unit}`}
                          {version === 'Variance' && (
                            <span className={'badge ' + c.cls}>{arrow(c.variance)} {fmt(Math.abs(c.variance))}{c.unit} ({fmt(Math.abs(c.vp))}%)</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <h3>Offered vs Handled Trend ({version})</h3>
            <Line data={trendChart.data} options={trendChart.options} />
          </div>
        </>
      )}

      <div className="section-title">Agent Time Distribution on Queue</div>
      <div className="grid-2">
        <div className="card">
          <h3>Time Allocation (Avg. Minutes / Agent / Day)</h3>
          <Doughnut data={timeDistChart.data} options={timeDistChart.options} />
        </div>
        {!isIntraday && (
          <div className="card">
            <h3>SLA vs AHT Correlation</h3>
            <Bar data={slaAhtChart.data} options={slaAhtChart.options} />
          </div>
        )}
      </div>

      {isIntraday && (
        <>
          <div className="section-title">Intraday Interval Table (30-min Intervals)</div>
          <div className="card">
            <div className="scroll-table">
              <table>
                <thead>
                  <tr>
                    <th>Interval</th><th>Offered</th><th>Handled</th><th>SLA %</th><th>AHT (min)</th>
                    <th>Agents Required</th><th>Agents Staffed</th><th>Occupancy %</th>
                  </tr>
                </thead>
                <tbody>
                  {intradayRows.map((r) => (
                    <tr key={r.t}>
                      <td>{r.t}</td>
                      <td>{fmt(r.offered)}</td>
                      <td>{fmt(r.handled)}</td>
                      <td>{r.sla}%</td>
                      <td>{r.aht} min</td>
                      <td>{r.required}</td>
                      <td>{r.staffed}</td>
                      <td>{r.occ}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Intraday Staffing vs Requirement</h3>
            <Line data={intradayStaffChart.data} options={intradayStaffChart.options} />
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Intraday Offered vs Handled</h3>
            <Bar data={intradayVolumeChart.data} options={intradayVolumeChart.options} />
          </div>
        </>
      )}
    </main>
  )
}
