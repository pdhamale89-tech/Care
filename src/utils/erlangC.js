// Erlang C — the industry-standard call-center staffing model used by every major
// WFM tool (NICE, Verint, Calabrio, etc.) to translate volume/AHT/target service
// level into required headcount. Recursive Erlang B -> Erlang C derivation avoids
// factorial overflow for large N.
function erlangB(n, a) {
  let b = 1
  for (let i = 1; i <= n; i++) {
    b = (a * b) / (i + a * b)
  }
  return b
}

function erlangC(n, a) {
  if (n <= a) return 1
  const b = erlangB(n, a)
  return b / (1 - (a / n) * (1 - b))
}

// Service level, ASA and occupancy for a given staffing level.
export function evaluateStaffing({ volume, ahtSeconds, intervalSeconds, agents, targetSeconds }) {
  const offeredLoad = (volume * ahtSeconds) / intervalSeconds
  if (agents <= offeredLoad || agents <= 0) {
    return { serviceLevel: 0, asaSeconds: Infinity, occupancy: 1, offeredLoad }
  }
  const pw = erlangC(agents, offeredLoad)
  const serviceLevel = Math.max(0, Math.min(1, 1 - pw * Math.exp((-(agents - offeredLoad) * targetSeconds) / ahtSeconds)))
  const asaSeconds = (pw * ahtSeconds) / (agents - offeredLoad)
  const occupancy = offeredLoad / agents
  return { serviceLevel, asaSeconds, occupancy, offeredLoad }
}

// Minimum agents needed to clear a target service level.
export function requiredAgents({ volume, ahtSeconds, intervalSeconds, targetSeconds, targetServiceLevel }) {
  const offeredLoad = (volume * ahtSeconds) / intervalSeconds
  let n = Math.max(1, Math.ceil(offeredLoad) + 1)
  const maxN = Math.ceil(offeredLoad) + 300
  while (n < maxN) {
    if (evaluateStaffing({ volume, ahtSeconds, intervalSeconds, agents: n, targetSeconds }).serviceLevel >= targetServiceLevel) return n
    n++
  }
  return n
}
