import { useMemo } from 'react'
import { fmt } from '../lib/mockGenerators.js'
import { computeWeeklyPlanActual } from '../lib/weeklyPlanActual.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'

export default function WeeklyPlanActualTable({ regions, quarter, region, onRegionChange }) {
  const { quarterLabel, weeks, rows } = useMemo(() => computeWeeklyPlanActual(region, quarter), [region, quarter])

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          Weekly Plan vs Actual <InfoBtn tip={`<strong>Purpose</strong>Plan (Forecast), Actual, and Actual/Plan % for every fiscal week in ${quarterLabel}, plus quarter-to-date and quarter totals. Select a region in the table's top-left corner — the Workload and Headcount waterfalls below follow the same selection. QTD and the quarter total are computed the same way here since this mock dataset doesn't model a mid-quarter cutoff.`} />
        </div>
      </div>
      <div className="tw scroll">
        <table className="mtx-tbl wpa-tbl">
          <thead>
            <tr>
              <th className="wpa-region-hdr" colSpan={2}>
                <select className="wpa-region-select" value={region} onChange={(e) => onRegionChange(e.target.value)}>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </th>
              {weeks.map((w) => <th key={w}>{w.replace('FW', 'W')}</th>)}
              <th>QTD</th>
              <th>{quarterLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={'plan-' + r.key} className="wpa-row-plan">
                {i === 0 && <th className="wpa-group-label" rowSpan={rows.length}>PLAN</th>}
                <th>{r.label}</th>
                {r.plan.map((v, wi) => <td key={wi}>{fmt(v)}{r.unit}</td>)}
                <td>{fmt(r.planQtd)}{r.unit}</td>
                <td>{fmt(r.planQtd)}{r.unit}</td>
              </tr>
            ))}
            {rows.map((r, i) => (
              <tr key={'actual-' + r.key} className="wpa-row-actual">
                {i === 0 && <th className="wpa-group-label" rowSpan={rows.length}>ACTUAL</th>}
                <th>{r.label}</th>
                {r.actual.map((v, wi) => <td key={wi}>{fmt(v)}{r.unit}</td>)}
                <td>{fmt(r.actualQtd)}{r.unit}</td>
                <td>{fmt(r.actualQtd)}{r.unit}</td>
              </tr>
            ))}
            {rows.map((r, i) => (
              <tr key={'pct-' + r.key} className="wpa-row-pct">
                {i === 0 && <th className="wpa-group-label" rowSpan={rows.length}>%</th>}
                <th>{r.label}</th>
                {r.pctVals.map((v, wi) => <td key={wi} className={v >= 100 ? 'mtx-pos' : 'mtx-neg'}>{v}%</td>)}
                <td className={r.pctQtd >= 100 ? 'mtx-pos' : 'mtx-neg'}>{r.pctQtd}%</td>
                <td className={r.pctQtd >= 100 ? 'mtx-pos' : 'mtx-neg'}>{r.pctQtd}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
