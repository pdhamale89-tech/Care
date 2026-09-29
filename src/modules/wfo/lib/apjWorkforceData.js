// Data model and calc engine for the APJ Workforce Planner tab — a faithful port of a
// standalone reference tool (3 sub-tabs: Data Input, Results, What-If) supplied as a
// finished HTML file. The Excel import/export machinery from that source tool is
// intentionally not ported (per request); this seeds the same data shape with fixed
// dummy numbers instead, so every screen renders meaningful data with no import step.
export const APJ_COUNTRIES = [
  { id: 'southasia', name: 'South Asia', cc: 'SA', hasCS: true },
  { id: 'anz', name: 'Australia / NZ', cc: 'AU', hasCS: true },
  { id: 'china', name: 'China / HK / TW', cc: 'CN', hasCS: true },
  { id: 'india', name: 'India', cc: 'IN', hasCS: true },
  { id: 'japan', name: 'Japan', cc: 'JP', hasCS: true },
  { id: 'korea', name: 'Korea', cc: 'KR', hasCS: false },
]

export const APJ_CHART_COLORS = ['#0672CB', '#247554', '#F4BB5E', '#C93B8C', '#0C32A4', '#E02D4C']

function buildQuarters(startQ, startFY) {
  const qs = []
  let q = startQ
  let fy = startFY
  for (let i = 0; i < 4; i++) {
    qs.push({ q: 'Q' + q, fy: 'FY' + String(fy).slice(-2), label: 'Q' + q + ' FY' + String(fy).slice(-2), key: 'Q' + q + '_FY' + String(fy).slice(-2) })
    q++
    if (q > 4) { q = 1; fy++ }
  }
  return qs
}

// Rolling 4-quarter window starting from the current fiscal quarter — same Feb/May/Aug/Nov
// fiscal-quarter boundary logic as the source tool.
export function defaultStartQuarter() {
  const now = new Date()
  const m = now.getMonth()
  if (m >= 1 && m <= 3) return { startQ: 1, startFY: (now.getFullYear() + 1) % 100 }
  if (m >= 4 && m <= 6) return { startQ: 2, startFY: (now.getFullYear() + 1) % 100 }
  if (m >= 7 && m <= 9) return { startQ: 3, startFY: (now.getFullYear() + 1) % 100 }
  return { startQ: 4, startFY: (m >= 10 ? now.getFullYear() + 1 : now.getFullYear()) % 100 }
}

export function getQuarters(startQ, startFY) {
  return buildQuarters(startQ, startFY)
}

// Fixed dummy baseline per country (stands in for an imported Targets sheet) plus a
// modest quarter-over-quarter order growth curve (stands in for an imported Orders sheet).
const COUNTRY_BASE = {
  southasia: { gs: 18000, cs: 7500, gsRate: 0.14, csRate: 0.11, cpsr: 4.2, crw: 62 },
  anz: { gs: 9000, cs: 4200, gsRate: 0.12, csRate: 0.10, cpsr: 3.8, crw: 58 },
  china: { gs: 21000, cs: 9500, gsRate: 0.16, csRate: 0.13, cpsr: 4.6, crw: 55 },
  india: { gs: 32000, cs: 15000, gsRate: 0.15, csRate: 0.12, cpsr: 4.0, crw: 65 },
  japan: { gs: 14000, cs: 5800, gsRate: 0.10, csRate: 0.09, cpsr: 3.5, crw: 50 },
  korea: { gs: 8000, cs: 0, gsRate: 0.13, csRate: 0, cpsr: 3.9, crw: 60 },
}
const GROWTH_BY_QUARTER = [1, 1.04, 1.07, 1.11]

export function buildDummyData(quarters) {
  const data = {}
  APJ_COUNTRIES.forEach((c) => {
    const base = COUNTRY_BASE[c.id]
    data[c.id] = {
      params: { gsRate: base.gsRate, csRate: base.csRate, cpsr: base.cpsr, crw: base.crw },
      quarters: {},
    }
    quarters.forEach((q, qi) => {
      const growth = GROWTH_BY_QUARTER[qi] || 1
      data[c.id].quarters[q.key] = {
        gs: Math.round(base.gs * growth),
        cs: c.hasCS ? Math.round(base.cs * growth) : 0,
      }
    })
  })
  return data
}

// Ensures every quarter in `quarters` has an entry in every country's data (e.g. after
// the rolling window shifts), defaulting new ones to zero rather than dummy values —
// matches the source tool's behavior when the quarter window changes.
export function ensureQuarters(data, quarters) {
  const next = { ...data }
  APJ_COUNTRIES.forEach((c) => {
    const country = { ...next[c.id], quarters: { ...next[c.id].quarters } }
    quarters.forEach((q) => {
      if (!country.quarters[q.key]) country.quarters[q.key] = { gs: 0, cs: 0 }
    })
    next[c.id] = country
  })
  return next
}

const sd = (a, b) => (b === 0 ? 0 : a / b)

export function calcCountry(data, countryId, quarterKey, mods) {
  const country = APJ_COUNTRIES.find((c) => c.id === countryId)
  const p = data[countryId].params
  const o = data[countryId].quarters[quarterKey] || { gs: 0, cs: 0 }
  const om = mods ? 1 + (mods.orders || 0) / 100 : 1
  const crm = mods ? 1 + (mods.caserate || 0) / 100 : 1
  const cpm = mods ? 1 + (mods.cpsr || 0) / 100 : 1
  const cwm = mods ? 1 + (mods.crw || 0) / 100 : 1
  const g = Math.round((o.gs || 0) * om)
  const s = country.hasCS ? Math.round((o.cs || 0) * om) : 0
  const tot = g + s
  const gsR = (p.gsRate || 0) * crm
  const csR = (p.csRate || 0) * crm
  const gc = g * gsR
  const sc = s * csR
  const tc = gc + sc
  const cr = sd(tc, tot)
  const cpsrVal = (p.cpsr || 0) * cpm
  const tcd = tc * cpsrVal
  const crwVal = (p.crw || 0) * cwm
  const hc = Math.round(sd(tcd, crwVal * 13))
  return { gsO: g, csO: s, totO: tot, gsCs: gc, csCs: sc, totCs: tc, cr, totTCD: tcd, cpsr: cpsrVal, crw: crwVal, hc }
}

export function calcAllCountries(data, quarterKey, mods) {
  const totals = { gsO: 0, csO: 0, totO: 0, gsCs: 0, csCs: 0, totCs: 0, totTCD: 0, hc: 0 }
  const countries = {}
  APJ_COUNTRIES.forEach((c) => {
    const r = calcCountry(data, c.id, quarterKey, mods)
    countries[c.id] = r
    totals.gsO += r.gsO; totals.csO += r.csO; totals.totO += r.totO
    totals.gsCs += r.gsCs; totals.csCs += r.csCs; totals.totCs += r.totCs
    totals.totTCD += r.totTCD; totals.hc += r.hc
  })
  totals.cr = sd(totals.totCs, totals.totO)
  totals.cpsr = sd(totals.totTCD, totals.totCs)
  return { countries, totals }
}

export const f0 = (n) => (Number.isNaN(n) ? '0' : Math.round(n).toLocaleString('en-US'))
export const f2 = (n) => (Number.isNaN(n) ? '0.00' : Number(n).toFixed(2))
export const f1 = (n) => (Number.isNaN(n) ? '0.0' : Number(n).toFixed(1))
export const fp = (n) => (Number.isNaN(n) ? '0.0%' : (Number(n) * 100).toFixed(1) + '%')
