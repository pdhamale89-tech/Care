import { hashSeed, genKpiValue } from './mockGenerators.js'

// Deterministic "modelled" (budgeted) outage% target per region — independent of the
// live agent roster, so the Outage Report Global View's Outage Goal Delta reflects a
// genuine plan-vs-actual comparison rather than deriving a target from the same data
// it's compared against.
export function modelledOutagePct(region) {
  return Math.round((14 + (hashSeed(region) % 60) / 10) * 10) / 10 // ~14.0%–19.9%, stable per region
}

// Deterministic weekly Planned%/Unplanned% series for the Global View's "Outage % by
// Fiscal Quarter/Week" chart — same hashSeed+genKpiValue convention used everywhere
// else in this app, since the agent roster itself has no per-week dimension.
export function generateWeeklyOutageSeries(weeks) {
  return weeks.map((w) => {
    const seed = hashSeed(w)
    const { actual: planned } = genKpiValue(4, seed, 1)
    const { forecast: unplanned } = genKpiValue(16, seed + 1, 1)
    return { week: w, planned, unplanned }
  })
}
