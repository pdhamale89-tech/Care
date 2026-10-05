// Real (not simulated) usage tracking for the current browser/device — no backend
// exists for this app, so this is the only usage data that can be genuinely captured
// client-side: this device's own session history and this device's own export clicks.
// Everything else the User Usage tab shows (other users, their IPs, their sessions) is
// necessarily simulated placeholder data, since there's no server to observe other
// visitors from. Both are clearly labeled as such in the UI.

const SESSIONS_KEY = 'care-spog:sessions'
const EXPORTS_KEY = 'care-spog:export-log'
const MAX_SESSIONS = 20
const MAX_EXPORTS = 50

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private browsing, quota) — usage tracking is best-effort only.
  }
}

// Called once per app load. Closes out a previous session left open by an abrupt
// close (browser crash, tab killed without firing visibilitychange) by backfilling its
// end time to its own start, then appends a fresh open session and returns its id plus
// the full stored list (most recent first) for display.
export function startDeviceSession() {
  const sessions = readJson(SESSIONS_KEY, [])
  const last = sessions[sessions.length - 1]
  if (last && !last.closedAt) last.closedAt = last.openedAt
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const openedAt = Date.now()
  sessions.push({ id, openedAt, closedAt: null })
  const trimmed = sessions.slice(-MAX_SESSIONS)
  writeJson(SESSIONS_KEY, trimmed)
  return { id, openedAt, sessions: trimmed }
}

export function closeDeviceSession(id) {
  const sessions = readJson(SESSIONS_KEY, [])
  const row = sessions.find((s) => s.id === id)
  if (row) row.closedAt = Date.now()
  writeJson(SESSIONS_KEY, sessions)
}

export function getDeviceSessions() {
  return readJson(SESSIONS_KEY, [])
}

export function logExportEvent(source) {
  const log = readJson(EXPORTS_KEY, [])
  log.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, source, at: Date.now() })
  const trimmed = log.slice(-MAX_EXPORTS)
  writeJson(EXPORTS_KEY, trimmed)
  return trimmed
}

export function getExportLog() {
  return readJson(EXPORTS_KEY, [])
}
