import { useMemo, useState } from 'react'
import { genKpiValue, hashSeed, getWeeksForQuarter, fmt } from '../lib/mockGenerators.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'

const TABLE_METRICS = [
  { key: 'orders', label: 'Orders', base: 1150, decimals: 0, unit: '', agg: 'sum' },
  { key: 'cases', label: 'Cases', base: 3200, decimals: 0, unit: '', agg: 'sum' },
  { key: 'caseRate', label: 'Case Rate', base: 12.5, decimals: 1, unit: '%', agg: 'avg' },
  { key: 'contacts', label: 'Contacts', base: 2200, decimals: 0, unit: '', agg: 'sum' },
  { key: 'cpsr', label: 'CpSR', base: 4.2, decimals: 1, unit: '', agg: 'avg' },
  { key: 'crw', label: 'CRW', base: 130, decimals: 0, unit: '', agg: 'avg' },
  { key: 'hc', label: 'HC', base: 65, decimals: 0, unit: '', agg: 'avg' },
]

function roundTo(v, decimals) {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

function aggregate(values, mode, decimals) {
  const sum = values.reduce((a, b) => a + b, 0)
  return roundTo(mode === 'sum' ? sum : sum / values.length, decimals)
}

export default function WeeklyPlanActualTable({ regions, quarter }) {
  const [tableRegion, setTableRegion] = useState(regions[0] || 'APJC')
  const quarterLabel = quarter || 'FQ1'
  const weeks = useMemo(() => getWeeksForQuarter(quarterLabel), [quarterLabel])
  const seed = useMemo(() => hashSeed(tableRegion + quarterLabel + 'weeklyPlanActual'), [tableRegion, quarterLabel])

  const rows = useMemo(() => TABLE_METRICS.map((m, mi) => {
    const plan = weeks.map((_, i) => genKpiValue(m.base, seed + i * 7 + mi * 3, m.decimals).forecast)
    const actual = weeks.map((_, i) => genKpiValue(m.base, seed + i * 7 + mi * 3, m.decimals).actual)
    const pctVals = plan.map((p, i) => (p === 0 ? 0 : Math.round((actual[i] / p) * 100)))
    const planQtd = aggregate(plan, m.agg, m.decimals)
    const actualQtd = aggregate(actual, m.agg, m.decimals)
    const pctQtd = planQtd === 0 ? 0 : Math.round((actualQtd / planQtd) * 100)
    return { ...m, plan, actual, pctVals, planQtd, actualQtd, pctQtd }
  }), [weeks, seed])

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          Weekly Plan vs Actual <InfoBtn tip={`<strong>Purpose</strong>Plan (Forecast), Actual, and Actual/Plan % for every fiscal week in ${quarterLabel}, plus quarter-to-date and quarter totals. Select a region in the table's top-left corner. QTD and the quarter total are computed the same way here since this mock dataset doesn't model a mid-quarter cutoff.`} />
        </div>
      </div>
      <div className="tw scroll">
        <table className="mtx-tbl wpa-tbl">
          <thead>
            <tr>
              <th className="wpa-region-hdr" colSpan={2}>
                <select className="wpa-region-select" value={tableRegion} onChange={(e) => setTableRegion(e.target.value)}>
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
