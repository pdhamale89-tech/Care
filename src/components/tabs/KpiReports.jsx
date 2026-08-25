import { Fragment, useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import {
  fmt, genKpiValue, hashSeed, getWeeksForQuarter, WEEK_DAYS, getIntradayIntervals,
} from '../../data/mockGenerators.js'
import DownloadBtn from '../common/DownloadBtn.jsx'

const KPI_VIEW_CONFIG = {
  voice: { title: 'Voice Queue KPI', subtitle: 'Voice queue performance — SLA, AHT, Occupancy, Handled/Offered' },
  digital: { title: 'Chat and Email KPI', subtitle: 'Chat & Email queue performance — SLA, AHT, Occupancy, Handled/Offered' },
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

export default function KpiReports({ kView }) {
  const { kpiFilters, kpiTimeView, activeRegion } = useApp()
  const cfg = KPI_VIEW_CONFIG[kView]
  const { country, quarter, week, queue } = kpiFilters
  const isIntraday = kView === 'intraday'

  const seed = useMemo(
    () => hashSeed(country + quarter + week + queue + activeRegion + kView + kpiTimeView),
    [country, quarter, week, queue, activeRegion, kView, kpiTimeView],
  )
  const periods = useMemo(() => getKpiPeriods(kpiTimeView, quarter, week), [kpiTimeView, quarter, week])
  const baseOffered = kView === 'voice' ? 900 : 600

  const tableTitle = {
    daily: `Daily — ${quarter}, ${week === 'All' ? getWeeksForQuarter(quarter)[0] : week}`,
    weekly: `Weekly — ${quarter}`,
    quarterly: 'Quarterly',
  }[kpiTimeView]

  const tableCols = [
    { key: 'offered', label: 'Offered', base: baseOffered, unit: '' },
    { key: 'handled', label: 'Handled', base: baseOffered * 0.96, unit: '' },
    { key: 'sla', label: 'SLA%', base: 90, unit: '%' },
    { key: 'aht', label: 'AHT', base: 8.5, unit: '' },
    { key: 'occupancy', label: 'Occ%', base: 82, unit: '%' },
    { key: 'break', label: 'Break', base: 45, unit: '' },
    { key: 'training', label: 'Train', base: 30, unit: '' },
    { key: 'adherence', label: 'Adh%', base: 88, unit: '' },
  ]

  const tableRows = useMemo(
    () => periods.map((p, i) => ({
      period: p,
      cells: tableCols.map((c, ci) => genKpiValue(c.base, seed + i * 7 + ci * 3)),
    })),
    [periods, seed],
  )

  const intervals = useMemo(() => getIntradayIntervals(), [])
  const intradayRows = useMemo(
    () => intervals.map((t, i) => {
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

  return (
    <div className="tab-panel active">
      <div className="section-div">
        <h2>{cfg.title}</h2>
        <p>{cfg.subtitle}</p>
      </div>

      {!isIntraday && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">{tableTitle}</div>
            <DownloadBtn
              filename={`kpi-${kView}-table`}
              rows={[
                ['Period', ...tableCols.flatMap((c) => [c.label + ' (Actual)', c.label + ' (Forecast)'])],
                ...tableRows.map((row) => [row.period, ...row.cells.flatMap((cell) => [cell.actual, cell.forecast])]),
              ]}
            />
          </div>
          <div className="tw scroll">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  {tableCols.map((c) => (
                    <Fragment key={c.key}>
                      <th>{c.label}(A)</th>
                      <th>{c.label}(F)</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    {row.cells.map((c, ci) => (
                      <Fragment key={tableCols[ci].key}>
                        <td>{fmt(c.actual)}{tableCols[ci].unit}</td>
                        <td className="fcst-cell">{fmt(c.forecast)}{tableCols[ci].unit}</td>
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isIntraday && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Intraday Intervals (30-min)</div>
            <DownloadBtn
              filename="kpi-intraday-table"
              rows={[
                ['Interval', 'Offered', 'Handled', 'SLA%', 'AHT', 'Agents Required', 'Agents Staffed', 'Occupancy %'],
                ...intradayRows.map((r) => [r.t, r.offered, r.handled, r.sla, r.aht, r.required, r.staffed, r.occ]),
              ]}
            />
          </div>
          <div className="tw scroll">
            <table>
              <thead>
                <tr><th>Interval</th><th>Offered</th><th>Handled</th><th>SLA%</th><th>AHT</th><th>Req</th><th>Staff</th><th>Occ%</th></tr>
              </thead>
              <tbody>
                {intradayRows.map((r) => (
                  <tr key={r.t}>
                    <td>{r.t}</td>
                    <td>{fmt(r.offered)}</td>
                    <td>{fmt(r.handled)}</td>
                    <td>{r.sla}%</td>
                    <td>{r.aht}</td>
                    <td>{r.required}</td>
                    <td>{r.staffed}</td>
                    <td>{r.occ}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
