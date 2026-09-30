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

// ===== Bidirectional Data Input driver edits =====
// The Data Input table lets a user type directly into Case Rate, Cases, CPSR, TCD, CRW
// or Headcount (on top of the raw GS/CS Orders and GS/CS Rate % inputs). Whichever cell
// is edited is the sole "driver" for that edit — every other stored param is either left
// untouched or algebraically back-derived from it in a single pass below, so there is no
// iterative/chained recalculation and therefore no possibility of a circular loop.
// CPSR and CRW already behave correctly as plain forward inputs with zero extra code
// (TCD and Headcount simply recompute from them via calcCountry on every render), so
// only Case Rate/Cases/TCD/Headcount — which aren't derivable by just changing one
// existing stored param — need dedicated reverse-derivation helpers.
const clampNonNeg = (n) => (Number.isFinite(n) && n > 0 ? n : 0)

// Case Rate % or Cases edited (both resolve to the same target Total Cases number) —
// Orders stay exactly as typed elsewhere; the GS/CS rate split is scaled proportionally
// so today's channel mix (GS-rate : CS-rate ratio) is preserved while the blended total
// lands exactly on the value the user typed. `current` is that country's calcCountry
// snapshot (from calcAllCountries) for the quarter being edited, taken *before* this edit.
export function applyCasesDriver(country, current, params, newTotalCases) {
  const target = clampNonNeg(newTotalCases)
  const oldCases = current.totCs
  if (oldCases > 0) {
    const k = target / oldCases
    return { ...params, gsRate: (params.gsRate || 0) * k, csRate: country.hasCS ? (params.csRate || 0) * k : 0 }
  }
  // No existing rate to scale (e.g. both rates were 0) — split the new total evenly
  // across today's order volume instead, so the edit still lands on the typed value.
  const tot = current.totO
  if (tot <= 0) return params
  const evenRate = target / tot
  return { ...params, gsRate: evenRate, csRate: country.hasCS ? evenRate : 0 }
}

// TCD edited directly — Cases (and therefore Case Rate) stay exactly as they are; only
// CPSR is back-derived so Cases × CPSR reproduces the typed TCD.
export function applyTcdDriver(current, params, newTcd) {
  return { ...params, cpsr: sd(clampNonNeg(newTcd), current.totCs) }
}

// Headcount edited directly — TCD (and everything upstream of it: Cases, Case Rate,
// CPSR) stays exactly as it is; only CRW is back-derived so TCD / (CRW × 13) reproduces
// the typed Headcount.
export function applyHcDriver(current, params, newHc) {
  const target = clampNonNeg(newHc)
  if (target <= 0) return params
  return { ...params, crw: sd(current.totTCD, target * 13) }
}

// `scopeCountryId` limits which country the What-If scenario (`mods`) actually applies
// to — 'ALL' (or omitted) applies it to every country in `countryList` as before; a
// specific country id applies it to that country only, and every other country is
// computed at its plain baseline (mods === undefined), so a scenario built for one
// country never shifts any other country's numbers, in this call's totals or otherwise.
export function calcAllCountries(data, quarterKey, mods, countryList, scopeCountryId) {
  const totals = { gsO: 0, csO: 0, totO: 0, gsCs: 0, csCs: 0, totCs: 0, totTCD: 0, hc: 0 }
  const countries = {}
  countryList.forEach((c) => {
    const inScope = !scopeCountryId || scopeCountryId === 'ALL' || scopeCountryId === c.id
    const r = calcCountry(data, c, quarterKey, inScope ? mods : undefined)
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
