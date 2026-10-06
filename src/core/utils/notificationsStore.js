// Notifications + My Alerts persistence — localStorage-backed, same pattern as
// sessionTracker.js/settingsStore.js. Seeded with realistic mock notifications/alerts on
// first run (no backend exists to generate these for real), then fully driven by local
// state from there: read/unread, deletions, and alert CRUD all persist across reloads.
// Kept as flat serializable arrays so a real backend/API can replace load/save later
// without touching the rest of the app.
const NOTIFICATIONS_KEY = 'care-spog:notifications'
const ALERTS_KEY = 'care-spog:alerts'

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const NOW = Date.now()

// id, type ('critical'|'warning'|'info'|'success'), title, message, region, kpi,
// at (ms epoch), read, cta ({ label, tab } | null)
const SEED_NOTIFICATIONS = [
  {
    id: 'n1', type: 'critical', title: 'SLA Breach', message: 'AMER Voice SLA dropped below 80%. Current: 76.4%.',
    region: 'AMER', kpi: 'Service Level', at: NOW - 10 * MIN, read: false, cta: { label: 'View KPI', tab: 'cco' },
  },
  {
    id: 'n2', type: 'warning', title: 'Forecast Variance', message: 'APJ Voice forecast variance reached 12.4%, exceeding the 10% threshold.',
    region: 'APJ', kpi: 'Forecast Variance', at: NOW - 32 * MIN, read: false, cta: { label: 'View Dashboard', tab: 'cco' },
  },
  {
    id: 'n3', type: 'info', title: 'Data Refresh Completed', message: 'Care dashboard data has been successfully refreshed.',
    region: null, kpi: null, at: NOW - 1 * HOUR, read: false, cta: null,
  },
  {
    id: 'n4', type: 'critical', title: 'Capacity Shortage', message: 'EMEA Chat capacity gap reached 8.2%, exceeding the 5% threshold.',
    region: 'EMEA', kpi: 'Capacity Gap', at: NOW - 2 * HOUR, read: true, cta: { label: 'View KPI', tab: 'cco' },
  },
  {
    id: 'n5', type: 'success', title: 'Export Completed', message: 'Your Care dashboard export is ready.',
    region: null, kpi: null, at: NOW - 3 * HOUR, read: true, cta: null,
  },
  {
    id: 'n6', type: 'warning', title: 'Headcount Variance', message: 'LATAM Voice headcount is tracking 6.1% below plan for the current week.',
    region: 'LATAM', kpi: 'Headcount Variance', at: NOW - 5 * HOUR, read: true, cta: { label: 'View Dashboard', tab: 'epiHc' },
  },
  {
    id: 'n7', type: 'info', title: 'New Forecast Available', message: 'FQ3 forecast has been published and is now reflected across the dashboard.',
    region: null, kpi: null, at: NOW - 1 * DAY, read: true, cta: null,
  },
  {
    id: 'n8', type: 'warning', title: 'Data Latency Warning', message: 'Voice queue data is refreshing 22 minutes later than the usual schedule.',
    region: null, kpi: null, at: NOW - 1 * DAY - 4 * HOUR, read: true, cta: null,
  },
  {
    id: 'n9', type: 'critical', title: 'Data Refresh Failure', message: 'The 6:00 AM scheduled refresh for Outage Report did not complete.',
    region: null, kpi: null, at: NOW - 2 * DAY, read: true, cta: { label: 'View Dashboard', tab: 'outage' },
  },
  {
    id: 'n10', type: 'info', title: 'Scheduled Maintenance', message: 'Care SPOG will undergo scheduled maintenance this weekend; no data impact expected.',
    region: null, kpi: null, at: NOW - 3 * DAY, read: true, cta: null,
  },
]

const SEED_ALERTS = [
  {
    id: 'a1', name: 'Service Level', kpi: 'Service Level', condition: 'below', threshold: 80,
    region: 'AMER', channel: 'Voice', inApp: true, email: true, frequency: 'immediate', status: 'active', createdAt: NOW - 10 * DAY,
  },
  {
    id: 'a2', name: 'Forecast Variance', kpi: 'Forecast Variance', condition: 'above', threshold: 10,
    region: 'All Regions', channel: 'All Channels', inApp: true, email: false, frequency: 'immediate', status: 'active', createdAt: NOW - 7 * DAY,
  },
  {
    id: 'a3', name: 'Capacity Gap', kpi: 'Capacity Gap', condition: 'above', threshold: 5,
    region: 'EMEA', channel: 'All Channels', inApp: false, email: true, frequency: 'daily', status: 'paused', createdAt: NOW - 4 * DAY,
  },
]

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
    // Storage unavailable — state just won't persist across reloads.
  }
}

export function loadNotifications() {
  const existing = readJson(NOTIFICATIONS_KEY, null)
  if (existing) return existing
  writeJson(NOTIFICATIONS_KEY, SEED_NOTIFICATIONS)
  return SEED_NOTIFICATIONS
}

export function saveNotifications(list) {
  writeJson(NOTIFICATIONS_KEY, list)
}

export function loadAlerts() {
  const existing = readJson(ALERTS_KEY, null)
  if (existing) return existing
  writeJson(ALERTS_KEY, SEED_ALERTS)
  return SEED_ALERTS
}

export function saveAlerts(list) {
  writeJson(ALERTS_KEY, list)
}

export function fmtTimeAgo(ms) {
  const diff = Date.now() - ms
  if (diff < MIN) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} hour${Math.floor(diff / HOUR) === 1 ? '' : 's'} ago`
  return `${Math.floor(diff / DAY)} day${Math.floor(diff / DAY) === 1 ? '' : 's'} ago`
}
