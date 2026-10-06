// Settings persistence — plain localStorage, no React dependency, mirroring the same
// pattern already established by sessionTracker.js. Kept as one flat, serializable
// object (`settings`) so it's a simple drop-in point for a real backend/API later:
// swap these two functions for network calls and nothing else in the app needs to change.
const SETTINGS_KEY = 'care-spog:settings'

export const DEFAULT_SETTINGS = {
  // Dashboard Preferences
  landingPage: 'cco',
  defaultPeriod: 'weekly',
  defaultRegion: 'All',
  defaultChannel: 'All',
  defaultBusiness: 'All',
  rememberFilters: false,
  // Display Preferences
  themePreference: 'light', // 'light' | 'dark' | 'system'
  density: 'comfortable', // 'comfortable' | 'compact'
  showDataLabels: true,
  showKpiExplanations: true,
  showChartLegends: true,
  numberFormat: 'full', // 'full' (1,234) | 'compact' (1.2K/1.2M)
  percentDecimals: 1,
  // Data & Refresh
  autoRefresh: true,
  refreshInterval: 15, // minutes; ignored when autoRefresh is false
  // Alert Preferences — { enabled, inApp, email }
  alertPrefs: {
    kpiThreshold: { enabled: true, inApp: true, email: false },
    forecastVariance: { enabled: true, inApp: true, email: false },
    capacity: { enabled: true, inApp: true, email: false },
    sla: { enabled: true, inApp: true, email: true },
    refreshFailure: { enabled: true, inApp: true, email: true },
    dataQuality: { enabled: false, inApp: true, email: false },
  },
  // Export Preferences
  exportFormat: 'CSV', // 'PPT' | 'PDF' | 'Excel' | 'CSV' — only CSV is actually generated today
  exportCurrentFilters: true,
  exportCurrentPageOnly: true,
  exportIncludeTimestamp: true,
  exportIncludeFilters: true,
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    // Shallow-merge onto defaults so a settings shape added after a user's last save
    // (e.g. a new preference shipped later) still gets a sane default instead of undefined.
    return { ...DEFAULT_SETTINGS, ...parsed, alertPrefs: { ...DEFAULT_SETTINGS.alertPrefs, ...(parsed.alertPrefs || {}) } }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private browsing, quota) — settings just won't persist across reloads.
  }
}

// Remembered filter selections — only read/written when the "Remember last selected
// filters" preference is on, so turning it off leaves no residual behavior change.
const FILTERS_KEY = 'care-spog:remembered-filters'

export function loadRememberedFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveRememberedFilters(filters) {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters))
  } catch {
    // Storage unavailable — filters just won't be remembered across reloads.
  }
}
