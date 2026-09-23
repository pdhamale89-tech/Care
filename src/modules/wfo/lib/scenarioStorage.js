// Scenario save/compare persistence for the Advanced What-If Simulator. Uses localStorage
// (the first use of it in this app) because WhatIfSimulatorAdvanced fully unmounts on tab
// switch (App.jsx's TabRouter swaps components by identity), so plain component state would
// silently lose saved scenarios. Every access is try/catch-guarded for quota/private-browsing
// safety — a scenario that fails to persist just doesn't survive a reload, nothing throws.
const STORAGE_KEY = 'care-spog:whatif-scenarios'
const MAX_SCENARIOS = 3

export function loadScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(scenarios) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
  } catch {
    // Unavailable (quota / private browsing) — caller's in-memory state still updates.
  }
}

export function saveScenario(scenario) {
  const next = [...loadScenarios(), scenario].slice(-MAX_SCENARIOS)
  persist(next)
  return next
}

export function deleteScenario(id) {
  const next = loadScenarios().filter((s) => s.id !== id)
  persist(next)
  return next
}
