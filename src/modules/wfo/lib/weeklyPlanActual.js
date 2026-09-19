import { genKpiValue, hashSeed, getWeeksForQuarter } from './mockGenerators.js'

export const TABLE_METRICS = [
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

// Same PLAN/ACTUAL generation the Weekly Plan vs Actual table uses, factored out so
// other views (e.g. the Workload/Headcount waterfall charts) stay numerically
// consistent with what the table shows for the same region + quarter.
export function computeWeeklyPlanActual(region, quarter) {
  const quarterLabel = quarter || 'FQ1'
  const weeks = getWeeksForQuarter(quarterLabel)
  const seed = hashSeed(region + quarterLabel + 'weeklyPlanActual')
  const rows = TABLE_METRICS.map((m, mi) => {
    const plan = weeks.map((_, i) => genKpiValue(m.base, seed + i * 7 + mi * 3, m.decimals).forecast)
    const actual = weeks.map((_, i) => genKpiValue(m.base, seed + i * 7 + mi * 3, m.decimals).actual)
    const pctVals = plan.map((p, i) => (p === 0 ? 0 : Math.round((actual[i] / p) * 100)))
    const planQtd = aggregate(plan, m.agg, m.decimals)
    const actualQtd = aggregate(actual, m.agg, m.decimals)
    const pctQtd = planQtd === 0 ? 0 : Math.round((actualQtd / planQtd) * 100)
    return { ...m, plan, actual, pctVals, planQtd, actualQtd, pctQtd }
  })
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
  return { quarterLabel, weeks, rows, byKey }
}
