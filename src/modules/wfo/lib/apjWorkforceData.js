// Data model and calc engine for the Workforce Planner tab — a faithful port of a
// standalone reference tool (3 sections: Data Input, Results, What-If) supplied as a
// finished HTML file, originally scoped to a fixed 6-country APJ list. Generalized to
// cover every region in Care's own taxonomy (regionCountryMap in mockGenerators.js) —
// the Region and Sub Region/Country filters now genuinely narrow which countries this
// tool shows, the same way they filter every other tab, rather than being fixed to APJ.
// The source tool's Excel import/export machinery is intentionally not ported (per
// request); sample data is instead generated the same way every other tab's mock data
// is (hashSeed + genKpiValue).
import { hashSeed, genKpiValue, matchesMulti, countriesForRegions } from './mockGenerators.js'

export const APJ_QUARTERS = ['FQ1', 'FQ2', 'FQ3', 'FQ4']

// Short codes for every country in Care's regionCountryMap (mockGenerators.js) — falls
// back to the first two letters for anything not listed, so a new country added to that
// map elsewhere in the app still gets a reasonable code here automatically.
const COUNTRY_CODES = {
  China: 'CN', Japan: 'JP', Korea: 'KR', Australia: 'AU', India: 'IN', Singapore: 'SG', Taiwan: 'TW',
  Brazil: 'BR', 'United Kingdom': 'GB', UK: 'GB', Germany: 'DE', France: 'FR', UAE: 'AE',
  'South Africa': 'ZA', Spain: 'ES', Italy: 'IT', USA: 'US', Mexico: 'MX', Argentina: 'AR',
  Chile: 'CL', Colombia: 'CO', Peru: 'PE', Canada: 'CA',
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

// Builds the active country list from Care's shared Region + Sub Region/Country filters
// (same countriesForRegions/matchesMulti utilities every other tab uses) — Region=All
// shows every country across every region; picking a Region narrows to that region's
// countries; Sub Region/Country narrows further within that.
export function buildCountryList(activeRegions, subRegion) {
  const names = countriesForRegions(activeRegions).filter((n) => matchesMulti(subRegion, n))
  return names.map((name) => {
    const seed = hashSeed(name)
    return { id: slugify(name), name, cc: COUNTRY_CODES[name] || name.slice(0, 2).toUpperCase(), hasCS: seed % 4 !== 0 }
  })
}

// Deterministic per-country baseline magnitudes derived from the country name itself
// (not a hand-curated table, since the country set is now dynamic/unbounded) —
// genKpiValue jitters further around these per the active filter seed.
function deriveCountryBase(name) {
  const s = hashSeed(name)
  return {
    gs: 6000 + (s % 27000),
    cs: 2000 + (s % 12000),
    gsRate: 8 + (s % 900) / 100,
    csRate: 7 + (s % 700) / 100,
    cpsr: 3 + (s % 250) / 100,
    crw: 40 + (s % 30),
  }
}

// Which Fiscal Quarters are "active" given the Fiscal Quarter filter — same
// All-means-unfiltered convention used by getPeriodsForView elsewhere in the app.
export function activeQuartersFromFilter(quarter) {
  const list = (quarter || []).filter((q) => q !== 'All')
  return list.length ? APJ_QUARTERS.filter((q) => list.includes(q)) : APJ_QUARTERS
}

// Builds the full country/quarter dataset for the given active quarters and country
// list, seeded from the shared Filters panel (Fiscal Year/Week, Classification) —
// changing any of them reseeds every number in the tool.
export function buildFilteredData(activeQuarters, filters, countryList) {
  const seedStr = [
    (filters.activeRegions || []).join(','),
    (filters.subRegion || []).join(','),
    (filters.week || []).join(','),
    (filters.classification || []).join(','),
    (filters.fiscalYear || []).join(','),
  ].join('|')
  const baseSeed = hashSeed(seedStr)
  const data = {}
  countryList.forEach((c, ci) => {
    const base = deriveCountryBase(c.name)
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

export function calcCountry(data, country, quarterKey, mods) {
  const p = data[country.id].params
  const o = data[country.id].quarters[quarterKey] || { gs: 0, cs: 0 }
  const om = mods ? 1 + (mods.orders || 0) / 100 : 1
  const crm = mods ? 1 + (mods.caserate || 0) / 100 : 1
  const cpm = mods ? 1 + (mods.cpsr || 0) / 100 : 1
  const cwm = mods ? 1 + (mods.crw || 0) / 100 : 1
  // Cases/TCD/Headcount Change are manual override multipliers layered on top of the
  // causally-derived value at each stage (e.g. "+10% Cases beyond what Orders x Case
  // Rate predicts") — they cascade forward (a Cases override also shifts TCD and HC
  // downstream) rather than replacing the causal chain outright.
  const csm = mods ? 1 + (mods.cases || 0) / 100 : 1
  const tdm = mods ? 1 + (mods.tcd || 0) / 100 : 1
  const hcm = mods ? 1 + (mods.headcount || 0) / 100 : 1
  const g = Math.round((o.gs || 0) * om)
  const s = country.hasCS ? Math.round((o.cs || 0) * om) : 0
  const tot = g + s
  const gsR = (p.gsRate || 0) * crm
  const csR = (p.csRate || 0) * crm
  const gc = g * gsR
  const sc = s * csR
  const tc = (gc + sc) * csm
  const cr = sd(tc, tot)
  const cpsrVal = (p.cpsr || 0) * cpm
  const tcd = tc * cpsrVal * tdm
  const crwVal = (p.crw || 0) * cwm
  const hc = Math.round(sd(tcd, crwVal * 13) * hcm)
  return { gsO: g, csO: s, totO: tot, gsCs: gc, csCs: sc, totCs: tc, cr, totTCD: tcd, cpsr: cpsrVal, crw: crwVal, hc }
}

export function calcAllCountries(data, quarterKey, mods, countryList) {
  const totals = { gsO: 0, csO: 0, totO: 0, gsCs: 0, csCs: 0, totCs: 0, totTCD: 0, hc: 0 }
  const countries = {}
  countryList.forEach((c) => {
    const r = calcCountry(data, c, quarterKey, mods)
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
