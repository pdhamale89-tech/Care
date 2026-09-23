// Real staffing-math engine for the Advanced What-If Simulator. Wires Volume + Average
// Handle Time + Shrinkage% + Target Service Level% into the Erlang C staffing model in
// core/utils/erlangC.js (previously unused anywhere in the app) to compute a live Required
// Headcount, plus sensitivity (tornado) and Best/Likely/Worst views on top of it.
//
// Deliberately NOT wired in: Case Rate, CPSR, TCD, Cases, Orders, CRW — none of these have a
// real formula linking them anywhere in the mock data layer (every metric is independently
// seeded noise), so forcing one here would produce confusing, unfamiliar numbers rather than a
// real improvement. They keep behaving exactly as they do in the original What-If Simulator tab.
import { evaluateStaffing, requiredAgents } from '../../../core/utils/erlangC.js'

export const INTERVAL_SECONDS = 1800
export const INTERVALS_PER_WEEK = 336 // 24h x 7d / 30-min intervals
export const WEEKS_PER_QUARTER = 13
export const DEFAULT_AHT_MINUTES = 15
export const DEFAULT_SHRINKAGE_PCT = 30
export const DEFAULT_TARGET_SL_PCT = 80
export const TARGET_ANSWER_SECONDS = 30

// Fixed, documented tuning constants — no real historical variance exists in the mock data
// layer to derive these from. volumePct/ahtPct are relative (%); shrinkagePp/targetSlPp are
// absolute percentage-point deltas.
export const RANGE_SWINGS = {
  best: { volumePct: -10, ahtPct: -5, shrinkagePp: -3 },
  worst: { volumePct: 15, ahtPct: 10, shrinkagePp: 5 },
}
export const TORNADO_DELTAS = { volumePct: 10, ahtPct: 10, shrinkagePp: 5, targetSlPp: 5 }

function pctDelta(value, pct) {
  return value * (1 + pct / 100)
}

// Assumes flat 24/7 arrival distribution across 30-minute planning intervals — a scenario-
// planning simplification (real contact-center arrivals peak, not flat), not a shift-level
// capacity plan.
export function intervalsForPeriod(ccoView) {
  return ccoView === 'quarterly' ? INTERVALS_PER_WEEK * WEEKS_PER_QUARTER : INTERVALS_PER_WEEK
}

export function computeStaffing({ volume, ahtMinutes, shrinkagePct, targetSlPct, ccoView, currentHeadcount }) {
  const arrivalsPerInterval = volume / intervalsForPeriod(ccoView)
  const ahtSeconds = ahtMinutes * 60
  const rawAgents = requiredAgents({
    volume: arrivalsPerInterval,
    ahtSeconds,
    intervalSeconds: INTERVAL_SECONDS,
    targetSeconds: TARGET_ANSWER_SECONDS,
    targetServiceLevel: targetSlPct / 100,
  })
  // Standard WFM "staffed vs. on-phone" conversion: raw Erlang C agents divided by the
  // productive fraction of a shift.
  const requiredHeadcount = Math.ceil(rawAgents / (1 - shrinkagePct / 100))
  const gap = currentHeadcount - requiredHeadcount
  const achieved = evaluateStaffing({
    volume: arrivalsPerInterval,
    ahtSeconds,
    intervalSeconds: INTERVAL_SECONDS,
    agents: currentHeadcount,
    targetSeconds: TARGET_ANSWER_SECONDS,
  })
  return { arrivalsPerInterval, rawAgents, requiredHeadcount, gap, achieved }
}

// Perturbs one input at a time by its TORNADO_DELTAS amount, recomputes Required Headcount,
// and returns rows sorted by impact size — the standard "which lever matters most" view.
export function buildTornadoRows(inputs) {
  const { volume, ahtMinutes, shrinkagePct, targetSlPct } = inputs
  const dims = [
    {
      key: 'volume',
      label: 'Volume',
      a: computeStaffing({ ...inputs, volume: pctDelta(volume, -TORNADO_DELTAS.volumePct) }).requiredHeadcount,
      b: computeStaffing({ ...inputs, volume: pctDelta(volume, TORNADO_DELTAS.volumePct) }).requiredHeadcount,
    },
    {
      key: 'aht',
      label: 'Avg Handle Time',
      a: computeStaffing({ ...inputs, ahtMinutes: pctDelta(ahtMinutes, -TORNADO_DELTAS.ahtPct) }).requiredHeadcount,
      b: computeStaffing({ ...inputs, ahtMinutes: pctDelta(ahtMinutes, TORNADO_DELTAS.ahtPct) }).requiredHeadcount,
    },
    {
      key: 'shrinkage',
      label: 'Shrinkage %',
      a: computeStaffing({ ...inputs, shrinkagePct: Math.max(0, shrinkagePct - TORNADO_DELTAS.shrinkagePp) }).requiredHeadcount,
      b: computeStaffing({ ...inputs, shrinkagePct: Math.min(80, shrinkagePct + TORNADO_DELTAS.shrinkagePp) }).requiredHeadcount,
    },
    {
      key: 'targetSl',
      label: 'Target Service Level',
      a: computeStaffing({ ...inputs, targetSlPct: Math.max(1, targetSlPct - TORNADO_DELTAS.targetSlPp) }).requiredHeadcount,
      b: computeStaffing({ ...inputs, targetSlPct: Math.min(99, targetSlPct + TORNADO_DELTAS.targetSlPp) }).requiredHeadcount,
    },
  ]
  return dims
    .map((d) => ({ key: d.key, label: d.label, low: Math.min(d.a, d.b), high: Math.max(d.a, d.b) }))
    .sort((x, y) => y.high - y.low - (x.high - x.low))
}

// Applies fixed RANGE_SWINGS on top of the live scenario (not the raw baseline), so "Likely"
// always matches exactly what the sliders currently show.
export function buildRangeRows(inputs) {
  const live = computeStaffing(inputs)
  const worstInputs = {
    ...inputs,
    volume: pctDelta(inputs.volume, RANGE_SWINGS.worst.volumePct),
    ahtMinutes: pctDelta(inputs.ahtMinutes, RANGE_SWINGS.worst.ahtPct),
    shrinkagePct: Math.min(80, inputs.shrinkagePct + RANGE_SWINGS.worst.shrinkagePp),
  }
  const bestInputs = {
    ...inputs,
    volume: pctDelta(inputs.volume, RANGE_SWINGS.best.volumePct),
    ahtMinutes: pctDelta(inputs.ahtMinutes, RANGE_SWINGS.best.ahtPct),
    shrinkagePct: Math.max(0, inputs.shrinkagePct + RANGE_SWINGS.best.shrinkagePp),
  }
  const worst = computeStaffing(worstInputs)
  const best = computeStaffing(bestInputs)
  return [
    {
      key: 'requiredHeadcount', label: 'Required Headcount', unit: '',
      worst: worst.requiredHeadcount, likely: live.requiredHeadcount, best: best.requiredHeadcount,
    },
    {
      key: 'serviceLevel', label: 'Achieved Service Level', unit: '%',
      worst: Math.round(worst.achieved.serviceLevel * 1000) / 10,
      likely: Math.round(live.achieved.serviceLevel * 1000) / 10,
      best: Math.round(best.achieved.serviceLevel * 1000) / 10,
    },
  ]
}
