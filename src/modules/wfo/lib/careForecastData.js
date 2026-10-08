import { hashSeed, genKpiValue } from './mockGenerators.js'

// Care LOB forecast ledger — adapted from the standalone "Forecast Performance"
// tool's Care FC sheet shape (Combined Queue Name / Contact_Type / QWK / Year-Qtr /
// Actual Offered / FCST Offered). There's no live Care upload wired into Care SPOG
// yet, so rows are generated deterministically the same way every other mock table
// in this app is (hashSeed + genKpiValue), rather than inventing a second data style.
export const CONTACT_TYPES = ['Phone', 'Chat', 'Email', 'Web Self-Service', 'Social']

const QUEUE_DEFS = [
  { queue: 'Consumer Phone - AMER', contactType: 'Phone', base: 2400 },
  { queue: 'Consumer Phone - EMEA', contactType: 'Phone', base: 1800 },
  { queue: 'Consumer Phone - APJ', contactType: 'Phone', base: 1500 },
  { queue: 'Business Phone - AMER', contactType: 'Phone', base: 1200 },
  { queue: 'Consumer Chat - AMER', contactType: 'Chat', base: 1600 },
  { queue: 'Consumer Chat - EMEA', contactType: 'Chat', base: 1100 },
  { queue: 'Business Chat - AMER', contactType: 'Chat', base: 700 },
  { queue: 'Consumer Email - Global', contactType: 'Email', base: 900 },
  { queue: 'Business Email - Global', contactType: 'Email', base: 650 },
  { queue: 'Web Self-Service - Global', contactType: 'Web Self-Service', base: 2100 },
  { queue: 'Social Care - Global', contactType: 'Social', base: 450 },
]

export const QUEUES = QUEUE_DEFS.map((q) => q.queue)

const FISCAL_YEAR_LABEL = 'FY26'
const WEEKS_PER_QUARTER = 13
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const QUARTER_MONTHS = {
  Q1: ['Feb', 'Mar', 'Apr'],
  Q2: ['May', 'Jun', 'Jul'],
  Q3: ['Aug', 'Sep', 'Oct'],
  Q4: ['Nov', 'Dec', 'Jan'],
}

export const VARIANCE_BUCKETS = ['Within ±10%', '±10–20%', '±20–30%', '>±30%']

function deriveRow(row) {
  const variance = row.actual - row.forecast
  const variancePct = row.forecast > 0 ? variance / row.forecast : null
  const attainment = row.forecast > 0 ? row.actual / row.forecast : null
  const accuracy = row.forecast > 0 ? Math.max(0, 1 - Math.abs(row.actual - row.forecast) / row.forecast) : null
  const within10 = variancePct === null ? null : Math.abs(variancePct) <= 0.1
  return { ...row, variance, variancePct, attainment, accuracy, within10 }
}

/** Deterministically generates one full fiscal year (4 quarters x 13 weeks) of
 * Care queue-week rows across every queue in QUEUE_DEFS. */
export function generateCareRows() {
  const rows = []
  QUARTERS.forEach((q, qi) => {
    for (let w = 1; w <= WEEKS_PER_QUARTER; w++) {
      const weekIndex = qi * WEEKS_PER_QUARTER + w
      const week = 2600 + weekIndex
      const weekLabel = `${FISCAL_YEAR_LABEL}-W${String(weekIndex).padStart(2, '0')}`
      const monthIdx = Math.min(2, Math.floor((w - 1) / 4.334))
      const month = `${FISCAL_YEAR_LABEL} ${QUARTER_MONTHS[q][monthIdx]}`
      const monthSort = qi * 3 + monthIdx
      const quarter = `${FISCAL_YEAR_LABEL} ${q}`
      QUEUE_DEFS.forEach((qd, qdi) => {
        const seed = hashSeed(qd.queue) + weekIndex * 7 + qdi * 3
        const { actual, forecast } = genKpiValue(qd.base, seed, 0)
        rows.push(deriveRow({
          queue: qd.queue, contactType: qd.contactType, week, weekLabel, month, monthSort, quarter, actual, forecast,
        }))
      })
    }
  })
  return rows
}

export function bucketOf(row) {
  if (row.accuracy === null) return null
  const e = 1 - row.accuracy
  if (e <= 0.1) return VARIANCE_BUCKETS[0]
  if (e <= 0.2) return VARIANCE_BUCKETS[1]
  if (e <= 0.3) return VARIANCE_BUCKETS[2]
  return VARIANCE_BUCKETS[3]
}

function sum(values) {
  const present = values.filter((v) => v !== null && Number.isFinite(v))
  return present.length ? present.reduce((a, b) => a + b, 0) : null
}

function aggregate(rows) {
  const actual = sum(rows.map((r) => r.actual))
  const forecast = sum(rows.map((r) => r.forecast))
  const variance = actual !== null && forecast !== null ? actual - forecast : null
  const variancePct = variance !== null && forecast > 0 ? variance / forecast : null
  const attainment = actual !== null && forecast !== null && forecast > 0 ? actual / forecast : null
  const accuracy = actual !== null && forecast !== null && forecast > 0 ? Math.max(0, 1 - Math.abs(actual - forecast) / forecast) : null
  return { actual, forecast, variance, variancePct, attainment, accuracy }
}

/** Aggregates rows into weekly or monthly periods, sorted chronologically. */
export function byPeriod(rows, grain) {
  const groups = new Map()
  for (const r of rows) {
    const key = grain === 'week' ? r.weekLabel : r.month
    const sort = grain === 'week' ? r.week : r.monthSort
    const g = groups.get(key) ?? { sort, rows: [] }
    g.rows.push(r)
    groups.set(key, g)
  }
  return Array.from(groups.entries())
    .map(([label, g]) => ({ label, sort: g.sort, ...aggregate(g.rows), count: g.rows.length }))
    .sort((a, b) => a.sort - b.sort)
}

/** Attainment (ΣActual ÷ ΣForecast) per Contact Type, per period — table + chart source. */
export function attainmentByContactType(rows, grain) {
  const types = CONTACT_TYPES.filter((t) => rows.some((r) => r.contactType === t))
    .map((t) => ({ type: t, volume: sum(rows.filter((r) => r.contactType === t).map((r) => r.actual)) ?? 0 }))
    .sort((a, b) => b.volume - a.volume)
    .map((t) => t.type)

  const periods = byPeriod(rows, grain)
  const table = types.map((type) => {
    const typeRows = rows.filter((r) => r.contactType === type)
    const cells = periods.map((p) => aggregate(typeRows.filter((r) => (grain === 'week' ? r.weekLabel === p.label : r.month === p.label))).attainment)
    return { type, cells, total: aggregate(typeRows).attainment }
  })
  const totalsRow = { type: 'Aggregate / Total', cells: periods.map((p) => p.attainment), total: aggregate(rows).attainment }
  return { periods, table, totalsRow }
}

/** Variance-bucket distribution per period (share of queue-weeks in each bucket). */
export function varianceBucketsByPeriod(rows, grain) {
  const periods = byPeriod(rows, grain)
  return periods.map((p) => {
    const periodRows = rows.filter((r) => (grain === 'week' ? r.weekLabel === p.label : r.month === p.label))
    const counts = Object.fromEntries(VARIANCE_BUCKETS.map((b) => [b, 0]))
    let total = 0
    periodRows.forEach((r) => {
      const b = bucketOf(r)
      if (!b) return
      counts[b] += 1
      total += 1
    })
    const pct = Object.fromEntries(VARIANCE_BUCKETS.map((b) => [b, total ? counts[b] / total : 0]))
    return { label: p.label, counts, pct, total }
  })
}

/** Top-level KPI summary for the current (filtered) row set. */
export function computeCareKpis(rows) {
  const weeks = new Set(rows.map((r) => r.week))
  const { actual, forecast, variance, variancePct, attainment } = aggregate(rows)
  const within10Rows = rows.filter((r) => r.within10 === true)
  const outside10Rows = rows.filter((r) => r.within10 === false)
  const measurable = rows.filter((r) => r.actual !== null && r.forecast !== null && r.forecast > 0)
  return {
    totalActual: actual,
    totalForecast: forecast,
    totalVariance: variance,
    variancePct,
    attainment,
    avgWeeklyActual: actual !== null && weeks.size ? actual / weeks.size : null,
    avgWeeklyForecast: forecast !== null && weeks.size ? forecast / weeks.size : null,
    within10Rows,
    outside10Rows,
    measurableCount: measurable.length,
  }
}
