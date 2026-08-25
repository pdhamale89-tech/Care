import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { formatIST } from '../utils/dateUtils.js'

const AppContext = createContext(null)

export const NO_FILTER_TABS = ['home']

const BREADCRUMBS = {
  home: 'Home',
  'cco-daily': 'Performance Reports › Daily CCO Dashboard',
  'cco-weekly': 'Performance Reports › Weekly CCO Dashboard',
  'cco-quarterly': 'Performance Reports › Qtrly CCO Dashboard',
  outage: 'Workforce Reports › Outage Report',
  epicenter: 'Workforce Reports › Epicenter HC',
  'kpi-voice': 'KPI Reports › Voice Queue KPI',
  'kpi-digital': 'KPI Reports › Chat and Email KPI',
  'kpi-intraday': 'KPI Reports › Intraday Performance',
}

const KPI_QUEUE_DEFAULTS = { voice: 'Voice - Sales', digital: 'Email', intraday: 'Voice' }

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [currentTab, setCurrentTab] = useState('home')
  const [lastUpdated] = useState(() => formatIST(new Date()))
  const [activeRegion, setActiveRegionState] = useState('APJC')

  const [ccoFilters, setCcoFilters] = useState({ subRegion: 'All', quarter: 'FQ1', week: 'All', classification: 'All' })
  const [outageFilters, setOutageFilters] = useState({ country: 'All', quarter: 'FQ1', week: 'All', manager: 'All', status: 'All', search: '' })
  const [epicenterFilters, setEpicenterFilters] = useState({ country: 'All', manager: 'All', queue: 'All', dept: 'All', search: '' })
  const [kpiFilters, setKpiFilters] = useState({ country: 'All', quarter: 'FQ1', week: 'All', queue: 'Voice - Sales' })
  const [kpiTimeView, setKpiTimeView] = useState('daily')

  const [toast, setToast] = useState({ show: false, msg: '', cls: '' })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), [])

  const navTo = useCallback((tabId) => {
    setCurrentTab(tabId)
    if (tabId.startsWith('kpi-')) {
      const kview = tabId.slice(4)
      setKpiFilters((prev) => ({ ...prev, queue: KPI_QUEUE_DEFAULTS[kview] }))
    }
  }, [])

  const breadcrumb = BREADCRUMBS[currentTab] || currentTab
  const showFilters = !NO_FILTER_TABS.includes(currentTab)

  const setActiveRegion = useCallback((region) => {
    setActiveRegionState(region)
    setCcoFilters((prev) => ({ ...prev, subRegion: 'All' }))
    setOutageFilters((prev) => ({ ...prev, country: 'All' }))
    setEpicenterFilters((prev) => ({ ...prev, country: 'All' }))
    setKpiFilters((prev) => ({ ...prev, country: 'All' }))
  }, [])

  const setCcoFilter = useCallback((key, value) => {
    setCcoFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: 'All' } : {}) }))
  }, [])
  const setOutageFilter = useCallback((key, value) => {
    setOutageFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: 'All' } : {}) }))
  }, [])
  const setEpicenterFilter = useCallback((key, value) => {
    setEpicenterFilters((prev) => ({ ...prev, [key]: value }))
  }, [])
  const setKpiFilter = useCallback((key, value) => {
    setKpiFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: 'All' } : {}) }))
  }, [])

  const clearFilters = useCallback(() => {
    if (currentTab.startsWith('cco-')) setCcoFilters({ subRegion: 'All', quarter: 'FQ1', week: 'All', classification: 'All' })
    else if (currentTab === 'outage') setOutageFilters({ country: 'All', quarter: 'FQ1', week: 'All', manager: 'All', status: 'All', search: '' })
    else if (currentTab === 'epicenter') setEpicenterFilters({ country: 'All', manager: 'All', queue: 'All', dept: 'All', search: '' })
    else if (currentTab.startsWith('kpi-')) {
      const kview = currentTab.slice(4)
      setKpiFilters({ country: 'All', quarter: 'FQ1', week: 'All', queue: KPI_QUEUE_DEFAULTS[kview] })
    }
  }, [currentTab])

  const showToast = useCallback((msg, cls) => {
    setToast({ show: true, msg, cls })
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500)
  }, [])

  const value = useMemo(() => ({
    theme, toggleTheme, lastUpdated,
    currentTab, navTo, breadcrumb, showFilters,
    activeRegion, setActiveRegion,
    ccoFilters, setCcoFilter,
    outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    kpiFilters, setKpiFilter,
    kpiTimeView, setKpiTimeView,
    clearFilters,
    toast, showToast,
  }), [
    theme, toggleTheme, lastUpdated, currentTab, navTo, breadcrumb, showFilters,
    activeRegion, setActiveRegion,
    ccoFilters, setCcoFilter, outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter, kpiFilters, setKpiFilter,
    kpiTimeView, clearFilters, toast, showToast,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
