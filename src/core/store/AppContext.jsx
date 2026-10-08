import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { formatIST } from '../utils/dateUtils.js'
import { startDeviceSession, closeDeviceSession, logExportEvent, getExportLog } from '../utils/sessionTracker.js'
import { loadSettings, saveSettings, loadRememberedFilters, saveRememberedFilters, DEFAULT_SETTINGS } from '../utils/settingsStore.js'
import { loadNotifications, saveNotifications, loadAlerts, saveAlerts } from '../utils/notificationsStore.js'

export const AppContext = createContext(null)

export const NO_FILTER_TABS = ['reports', 'calendar', 'fiscalCalendar', 'glossary', 'notifications', 'settings', 'userUsage']

const BREADCRUMBS = {
  cco: 'Performance Reports › CCO Overview',
  forecastLedger: 'Performance Reports › Forecast Variance Ledger',
  outage: 'Workforce Reports › Outage Report',
  epiHc: 'Workforce Reports › Epi HC',
  apjPlanner: 'Planning › What-If Simulator',
  reports: 'Tools › Reports',
  calendar: 'Tools › Calendar',
  fiscalCalendar: 'Tools › Calendar › Fiscal Calendar',
  glossary: 'Tools › Glossary',
  notifications: 'System › Notifications',
  settings: 'System › Settings',
  userUsage: 'System › User Usage',
}

const CCO_FILTERS_DEFAULT = { subRegion: ['All'], quarter: ['All'], week: ['All'], classification: ['All'], fiscalYear: ['All'] }
const OUTAGE_FILTERS_DEFAULT = { country: ['All'], quarter: ['All'], week: ['All'], manager: ['All'], status: ['All'], search: '' }
const EPICENTER_FILTERS_DEFAULT = { weekEnding: ['All'], vendor: ['All'], manager: ['All'], dbOsp: ['All'] }

function resolveSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function AppProvider({ children }) {
  // Settings load synchronously (plain localStorage read) before any other state is
  // initialized, so landing page / remembered filters / theme preference can all seed
  // their own initial state below in one pass.
  const [settings, setSettings] = useState(() => loadSettings())
  const remembered = settings.rememberFilters ? loadRememberedFilters() : null

  // Only the "system" branch needs state (it tracks the OS preference, a genuine
  // external system); the explicit light/dark case is derived directly below with no
  // state or effect of its own.
  const [systemTheme, setSystemTheme] = useState(() => resolveSystemTheme())
  const theme = settings.themePreference === 'system' ? systemTheme : settings.themePreference
  const [sidenavOpen, setSidenavOpen] = useState(true)
  const [currentTab, setCurrentTab] = useState(() => settings.landingPage || 'cco')
  const [lastUpdated, setLastUpdated] = useState(() => formatIST(new Date()))
  const [lastRefreshAt, setLastRefreshAt] = useState(() => Date.now())
  const [activeRegions, setActiveRegionsState] = useState(() => remembered?.activeRegions || ['All'])

  const [ccoFilters, setCcoFilters] = useState(() => remembered?.ccoFilters || CCO_FILTERS_DEFAULT)
  const [apjFilters, setApjFilters] = useState(() => remembered?.apjFilters || CCO_FILTERS_DEFAULT)
  const [ccoView, setCcoView] = useState(() => remembered?.ccoView || 'weekly')
  const [outageFilters, setOutageFilters] = useState(() => remembered?.outageFilters || OUTAGE_FILTERS_DEFAULT)
  const [epicenterFilters, setEpicenterFilters] = useState(() => remembered?.epicenterFilters || EPICENTER_FILTERS_DEFAULT)

  const [toast, setToast] = useState({ show: false, msg: '', cls: '' })

  // Real (not simulated) usage tracking for this device — see sessionTracker.js for why
  // this is the only usage data the app can genuinely capture without a backend.
  const [session] = useState(() => startDeviceSession())
  const [exportLog, setExportLog] = useState(() => getExportLog())

  // Settings / Notifications / My Alerts — localStorage-backed (see settingsStore.js /
  // notificationsStore.js); kept as flat objects/arrays so a real backend/API can later
  // replace the load/save calls without the rest of the app changing.
  const [notifications, setNotifications] = useState(() => loadNotifications())
  const [alerts, setAlerts] = useState(() => loadAlerts())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-density', settings.density)
  }, [settings.density])

  // Tracks the OS color-scheme preference live, only used while themePreference is
  // "system" — the topbar sun/moon button and the Settings > Display Preferences
  // dropdown both just set themePreference, so `theme` above is the one source of truth.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(resolveSystemTheme())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const close = () => closeDeviceSession(session.id)
    const onVisibility = () => { if (document.visibilityState === 'hidden') close() }
    window.addEventListener('beforeunload', close)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', close)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [session.id])

  // Settings persist on every change — "Save Changes" in Settings is a confirmation
  // affordance (and the moment a success toast fires), not a separate staging step.
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveNotifications(notifications)
  }, [notifications])

  useEffect(() => {
    saveAlerts(alerts)
  }, [alerts])

  // "Remember last selected filters" — only persists while the preference is on, so
  // turning it off leaves no residual stored state affecting future sessions.
  useEffect(() => {
    if (!settings.rememberFilters) return
    saveRememberedFilters({ activeRegions, ccoFilters, apjFilters, outageFilters, epicenterFilters, ccoView })
  }, [settings.rememberFilters, activeRegions, ccoFilters, apjFilters, outageFilters, epicenterFilters, ccoView])

  // Simulated auto-refresh (no backend to poll) — on the configured interval, advances
  // "Last Refresh" the same way a real data pipeline landing new rows would, purely to
  // drive the Data & Refresh status card and InfoBtn "Last Refreshed" timestamps.
  useEffect(() => {
    if (!settings.autoRefresh) return
    const ms = settings.refreshInterval * 60 * 1000
    const t = setInterval(() => {
      const now = new Date()
      setLastUpdated(formatIST(now))
      setLastRefreshAt(now.getTime())
    }, ms)
    return () => clearInterval(t)
  }, [settings.autoRefresh, settings.refreshInterval])

  const logExport = useCallback((source, filtersUsed) => {
    setExportLog(logExportEvent(source, filtersUsed))
  }, [])

  const toggleTheme = useCallback(() => {
    setSettings((prev) => ({ ...prev, themePreference: theme === 'light' ? 'dark' : 'light' }))
  }, [theme])
  const toggleSidenav = useCallback(() => setSidenavOpen((o) => !o), [])

  const navTo = useCallback((tabId) => {
    setCurrentTab(tabId)
  }, [])

  const breadcrumb = BREADCRUMBS[currentTab] || currentTab
  const showFilters = !NO_FILTER_TABS.includes(currentTab)

  const setActiveRegions = useCallback((regions) => {
    setActiveRegionsState(regions)
    setCcoFilters((prev) => ({ ...prev, subRegion: ['All'] }))
    setApjFilters((prev) => ({ ...prev, subRegion: ['All'] }))
    setOutageFilters((prev) => ({ ...prev, country: ['All'] }))
  }, [])

  const setCcoFilter = useCallback((key, value) => {
    setCcoFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: ['All'] } : {}) }))
  }, [])
  const setApjFilter = useCallback((key, value) => {
    setApjFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: ['All'] } : {}) }))
  }, [])
  const setOutageFilter = useCallback((key, value) => {
    setOutageFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: ['All'] } : {}) }))
  }, [])
  const setEpicenterFilter = useCallback((key, value) => {
    setEpicenterFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    if (currentTab === 'cco') { setCcoFilters(CCO_FILTERS_DEFAULT); setCcoView('weekly'); setActiveRegionsState(['All']) }
    else if (currentTab === 'apjPlanner') { setApjFilters(CCO_FILTERS_DEFAULT); setActiveRegionsState(['All']) }
    else if (currentTab === 'outage') setOutageFilters(OUTAGE_FILTERS_DEFAULT)
    else if (currentTab === 'epiHc') setEpicenterFilters(EPICENTER_FILTERS_DEFAULT)
  }, [currentTab])

  const showToast = useCallback((msg, cls) => {
    setToast({ show: true, msg, cls })
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500)
  }, [])

  // ===== Settings =====
  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])
  const updateAlertPref = useCallback((key, field, value) => {
    setSettings((prev) => ({ ...prev, alertPrefs: { ...prev.alertPrefs, [key]: { ...prev.alertPrefs[key], [field]: value } } }))
  }, [])
  const saveSettingsNow = useCallback(() => {
    saveSettings(settings)
    showToast('Settings saved successfully.', 'toast-success')
  }, [settings, showToast])
  const resetSettingsToDefault = useCallback(() => {
    if (!window.confirm('Reset all Settings back to their defaults?')) return
    setSettings({ ...DEFAULT_SETTINGS })
    showToast('Settings reset to default.', 'toast-success')
  }, [showToast])

  // ===== Notifications =====
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])
  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])
  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    showToast('All notifications marked as read.', 'toast-success')
  }, [showToast])
  const deleteNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    showToast('Notification deleted.', 'toast-success')
  }, [showToast])
  const clearNotificationHistory = useCallback(() => {
    if (!window.confirm('Clear all notification history? This cannot be undone.')) return
    setNotifications([])
    showToast('Notification history cleared.', 'toast-success')
  }, [showToast])

  // ===== My Alerts =====
  const createAlert = useCallback((alert) => {
    setAlerts((prev) => [{ ...alert, id: `a-${Date.now()}`, status: 'active', createdAt: Date.now() }, ...prev])
    showToast('Alert created successfully.', 'toast-success')
  }, [showToast])
  const updateAlertRule = useCallback((id, patch) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    showToast('Alert updated successfully.', 'toast-success')
  }, [showToast])
  const toggleAlertStatus = useCallback((id) => {
    setAlerts((prev) => prev.map((a) => {
      if (a.id !== id) return a
      const status = a.status === 'active' ? 'paused' : 'active'
      showToast(status === 'paused' ? 'Alert paused.' : 'Alert resumed.', 'toast-success')
      return { ...a, status }
    }))
  }, [showToast])
  const deleteAlert = useCallback((id) => {
    if (!window.confirm('Delete this alert? This cannot be undone.')) return
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    showToast('Alert deleted.', 'toast-success')
  }, [showToast])

  const nextRefreshAt = lastRefreshAt + settings.refreshInterval * 60 * 1000

  const value = useMemo(() => ({
    theme, toggleTheme, lastUpdated,
    sidenavOpen, toggleSidenav,
    currentTab, navTo, breadcrumb, showFilters,
    activeRegions, setActiveRegions,
    ccoFilters, setCcoFilter, apjFilters, setApjFilter, ccoView, setCcoView,
    outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    clearFilters,
    toast, showToast,
    session, exportLog, logExport,
    settings, updateSetting, updateAlertPref, saveSettingsNow, resetSettingsToDefault,
    lastRefreshAt, nextRefreshAt,
    notifications, unreadCount, markNotificationRead, markAllNotificationsRead, deleteNotification, clearNotificationHistory,
    alerts, createAlert, updateAlertRule, toggleAlertStatus, deleteAlert,
  }), [
    theme, toggleTheme, lastUpdated, sidenavOpen, toggleSidenav, currentTab, navTo, breadcrumb, showFilters,
    activeRegions, setActiveRegions,
    ccoFilters, setCcoFilter, apjFilters, setApjFilter, ccoView, outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    clearFilters, toast, showToast,
    session, exportLog, logExport,
    settings, updateSetting, updateAlertPref, saveSettingsNow, resetSettingsToDefault,
    lastRefreshAt, nextRefreshAt,
    notifications, unreadCount, markNotificationRead, markAllNotificationsRead, deleteNotification, clearNotificationHistory,
    alerts, createAlert, updateAlertRule, toggleAlertStatus, deleteAlert,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
