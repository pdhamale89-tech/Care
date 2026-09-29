// Data model and calc engine for the APJ Workforce Planner tab — a faithful port of a
// standalone reference tool (3 sections: Data Input, Results, What-If) supplied as a
// finished HTML file. The Excel import/export machinery from that source tool is
// intentionally not ported (per request); sample data is instead generated the same way
// every other tab's mock data is (hashSeed + genKpiValue), seeded from the shared
// Filters panel (Fiscal Year, Fiscal Quarter, Fiscal Week, Region, Sub Region,
// Classification) so every screen reacts to filter changes like the rest of the app.
import { hashSeed, genKpiValue } from './mockGenerators.js'

export const APJ_COUNTRIES = [
  { id: 'southasia', name: 'South Asia', cc: 'SA', hasCS: true },
  { id: 'anz', name: 'Australia / NZ', cc: 'AU', hasCS: true },
  { id: 'china', name: 'China / HK / TW', cc: 'CN', hasCS: true },
  { id: 'india', name: 'India', cc: 'IN', hasCS: true },
  { id: 'japan', name: 'Japan', cc: 'JP', hasCS: true },
  { id: 'korea', name: 'Korea', cc: 'KR', hasCS: false },
]

export const APJ_QUARTERS = ['FQ1', 'FQ2', 'FQ3', 'FQ4']

// Fixed per-country baseline magnitudes (stands in for an imported Targets/Orders sheet)
// — genKpiValue jitters around these per the active filter seed, same as every other
// mock KPI in the app.
const COUNTRY_BASE = {
  southasia: { gs: 18000, cs: 7500, gsRate: 14, csRate: 11, cpsr: 4.2, crw: 62 },
  anz: { gs: 9000, cs: 4200, gsRate: 12, csRate: 10, cpsr: 3.8, crw: 58 },
  china: { gs: 21000, cs: 9500, gsRate: 16, csRate: 13, cpsr: 4.6, crw: 55 },
  india: { gs: 32000, cs: 15000, gsRate: 15, csRate: 12, cpsr: 4.0, crw: 65 },
  japan: { gs: 14000, cs: 5800, gsRate: 10, csRate: 9, cpsr: 3.5, crw: 50 },
  korea: { gs: 8000, cs: 0, gsRate: 13, csRate: 0, cpsr: 3.9, crw: 60 },
}

// Which Fiscal Quarters are "active" given the Fiscal Quarter filter — same
// All-means-unfiltered convention used by getPeriodsForView elsewhere in the app.
export function activeQuartersFromFilter(quarter) {
  const list = (quarter || []).filter((q) => q !== 'All')
  return list.length ? APJ_QUARTERS.filter((q) => list.includes(q)) : APJ_QUARTERS
}

// Builds the full country/quarter dataset for the given active quarters, seeded from
// the shared Filters panel selection (subRegion/week/classification/fiscalYear) plus
// the global Region filter — changing any of them reseeds every number in the tool.
export function buildFilteredData(activeQuarters, filters) {
  const seedStr = [
    (filters.activeRegions || []).join(','),
    (filters.subRegion || []).join(','),
    (filters.week || []).join(','),
    (filters.classification || []).join(','),
    (filters.fiscalYear || []).join(','),
  ].join('|')
  const baseSeed = hashSeed(seedStr)
  const data = {}
  APJ_COUNTRIES.forEach((c, ci) => {
    const base = COUNTRY_BASE[c.id]
    const paramSeed = baseSeed + ci * 17
    const gsRate = genKpiValue(base.gsRate, paramSeed + 1, 2).actual / 100
    const csRate = c.hasCS ? genKpiValue(base.csRate, paramSeed + 2, 2).actual / 100 : 0
    const cpsr = genKpiValue(base.cpsr, paramSeed + 3, 2).actual
    const crw = genKpiValue(base.crw, paramSeed + 4, 1).actual
    data[c.id] = { params: { gsRate, csRate, cpsr, crw }, quarters: {} }
    activeQuarters.forEach((q, qi) => {
      const qSeed = baseSeed + ci * 17 + qi * 5
      const gs = genKpiValue(base.gs, qSeed + 101, 0).actual
      const cs = c.hasCS ? genKpiValue(base.cs, qSeed + 202, 0).actual : 0
      data[c.id].quarters[q] = { gs, cs }
    })
  })
  return data
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
