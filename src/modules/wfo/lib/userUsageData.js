// Simulated organization-wide usage data for the User Usage tab — the app has no
// backend/auth, so there is no real way to observe other visitors, their names, IPs or
// session history. This generates realistic, internally-consistent placeholder data the
// same deterministic way every other tab's mock data is built (hashSeed-driven), so an
// executive sees a representative shape of what the feature would report with real
// tracking behind it. The tab clearly discloses this; only the viewer's own device
// session and export clicks (tracked in sessionTracker.js) are real.
import { hashSeed } from './mockGenerators.js'

export const MOCK_USERS = [
  { name: 'A. Whitfield', role: 'WFM Manager' },
  { name: 'D. Castellano', role: 'Ops Director' },
  { name: 'N. Okafor', role: 'Site Lead' },
  { name: 'S. Lindqvist', role: 'WFM Analyst' },
  { name: 'M. Tanaka', role: 'Regional Ops Manager' },
  { name: 'P. Devereaux', role: 'Capacity Planner' },
  { name: 'R. Bhatt', role: 'WFM Analyst' },
  { name: 'C. Oyelaran', role: 'Site Lead' },
  { name: 'J. Marchetti', role: 'Ops Director' },
  { name: 'L. Novak', role: 'Capacity Planner' },
  { name: 'T. Osei', role: 'WFM Manager' },
  { name: 'E. Giordano', role: 'Regional Ops Manager' },
  { name: 'V. Kozlova', role: 'WFM Analyst' },
  { name: 'B. Harrington', role: 'Ops Director' },
]

// Every tab a session could plausibly be logged against, for the mock historical data —
// kept in sync with the sidebar's real tab ids/labels.
const TABS = [
  { id: 'cco', label: 'CCO Overview' },
  { id: 'outage', label: 'Outage Report' },
  { id: 'epiHc', label: 'Epi HC' },
  { id: 'apjPlanner', label: 'What-If Simulator' },
  { id: 'reports', label: 'Reports' },
  { id: 'fiscalCalendar', label: 'Fiscal Calendar' },
  { id: 'glossary', label: 'Glossary' },
]

const EXPORT_SOURCES = [
  'CCO Overview — Overall SLA Variance Matrix',
  'Outage Report — Agent Status',
  'Outage Report — Manager Status',
  'What-If Simulator — Orders & Targets',
  'What-If Simulator — Baseline vs Scenario Comparison',
  'Glossary — Metric Glossary',
  'Fiscal Calendar — Holiday Calendar',
]

function ipFor(name, idx) {
  const s = hashSeed(name + idx)
  return `10.${20 + (s % 40)}.${(s >> 3) % 256}.${(s >> 7) % 256}`
}

// Plausible "filters active at export time" strings for the mock export log, shaped
// per source the same way summarizeActiveFilters formats the real ones.
const FISCAL_QUARTERS = ['FQ1', 'FQ2', 'FQ3', 'FQ4']
const SAMPLE_REGIONS = ['APJC', 'EMEA', 'NA', 'LATAM']
const SAMPLE_COUNTRIES = ['USA', 'Germany', 'Japan', 'Brazil', 'India']
const SAMPLE_STATUSES = ['Available', 'Unplanned Outage']

function filtersUsedFor(source, seed) {
  if (seed % 5 === 0) return 'No filters applied'
  if (source.startsWith('CCO Overview')) return `Region: ${SAMPLE_REGIONS[seed % SAMPLE_REGIONS.length]}`
  if (source.startsWith('Outage Report')) {
    return `Country: ${SAMPLE_COUNTRIES[seed % SAMPLE_COUNTRIES.length]} • Status: ${SAMPLE_STATUSES[seed % SAMPLE_STATUSES.length]}`
  }
  if (source.startsWith('What-If Simulator')) {
    return `Fiscal Year: FY27 • Quarter: ${FISCAL_QUARTERS[seed % FISCAL_QUARTERS.length]} • Region: ${SAMPLE_REGIONS[(seed >> 2) % SAMPLE_REGIONS.length]}`
  }
  return 'No filters applied'
}

const DAY_MS = 24 * 60 * 60 * 1000

// Deterministic across renders within a page load — re-derives from Date.now() only
// once per import, not per call, so charts/tables built from it stay internally
// consistent for the session.
const NOW = Date.now()

export const MOCK_SESSIONS = (() => {
  const rows = []
  MOCK_USERS.forEach((u, ui) => {
    const sessionCount = 3 + (hashSeed(u.name) % 5) // 3-7 sessions over the window
    for (let i = 0; i < sessionCount; i++) {
      const seed = hashSeed(`${u.name}-session-${i}`)
      const daysAgo = seed % 14
      const hour = 7 + (seed % 11) // business hours 07:00-18:00
      const minute = (seed * 7) % 60
      // Clamped to never land in the future relative to real "now" — the day-boundary
      // math above is UTC-based, so a "today" row with a late hour could otherwise
      // compute a timestamp later than the real current time.
      const opened = Math.min(NOW - daysAgo * DAY_MS - (NOW % DAY_MS) + hour * 3600000 + minute * 60000, NOW - 60000)
      const durationMin = 3 + ((seed >> 2) % 55) // 3-57 min
      const closed = Math.min(opened + durationMin * 60000, NOW)
      const tab = TABS[seed % TABS.length]
      rows.push({
        id: `${ui}-${i}`, user: u.name, role: u.role, ip: ipFor(u.name, i),
        tab: tab.label, openedAt: opened, closedAt: closed, durationMin,
      })
    }
  })
  return rows.sort((a, b) => b.openedAt - a.openedAt)
})()

export const MOCK_EXPORT_LOG = (() => {
  const rows = []
  const count = 34
  for (let i = 0; i < count; i++) {
    const seed = hashSeed(`export-${i}`)
    const u = MOCK_USERS[seed % MOCK_USERS.length]
    const daysAgo = seed % 14
    const hour = 7 + (seed % 11)
    const minute = (seed * 11) % 60
    const at = Math.min(NOW - daysAgo * DAY_MS - (NOW % DAY_MS) + hour * 3600000 + minute * 60000, NOW - 60000)
    const source = EXPORT_SOURCES[seed % EXPORT_SOURCES.length]
    rows.push({
      id: `exp-${i}`, user: u.name, ip: ipFor(u.name, 99 + i),
      source, fileType: 'CSV', filtersUsed: filtersUsedFor(source, seed), at,
    })
  }
  return rows.sort((a, b) => b.at - a.at)
})()

export function buildDailyActiveUsers(days = 14) {
  const labels = []
  const counts = []
  for (let d = days - 1; d >= 0; d--) {
    const dayStart = NOW - d * DAY_MS - (NOW % DAY_MS)
    const dayEnd = dayStart + DAY_MS
    const users = new Set(
      MOCK_SESSIONS.filter((s) => s.openedAt >= dayStart && s.openedAt < dayEnd).map((s) => s.user),
    )
    labels.push(new Date(dayStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    counts.push(users.size)
  }
  return { labels, counts }
}

export function buildMostViewedTabs() {
  const counts = {}
  MOCK_SESSIONS.forEach((s) => { counts[s.tab] = (counts[s.tab] || 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
}

export function buildTopUsersByTime(limit = 6) {
  const totals = {}
  MOCK_SESSIONS.forEach((s) => { totals[s.user] = (totals[s.user] || 0) + s.durationMin })
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([user, minutes]) => ({ user, minutes }))
}

export function usageKpis() {
  const uniqueUsers = new Set(MOCK_SESSIONS.map((s) => s.user)).size
  const avgDurationMin = MOCK_SESSIONS.reduce((sum, s) => sum + s.durationMin, 0) / MOCK_SESSIONS.length
  const weekAgo = NOW - 7 * DAY_MS
  const exportsThisWeek = MOCK_EXPORT_LOG.filter((e) => e.at >= weekAgo).length
  const sessionsThisWeek = MOCK_SESSIONS.filter((s) => s.openedAt >= weekAgo).length
  return { uniqueUsers, avgDurationMin, exportsThisWeek, sessionsThisWeek }
}

export function fmtDuration(totalMin) {
  const h = Math.floor(totalMin / 60)
  const m = Math.round(totalMin % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function fmtDateTime(ms) {
  return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
