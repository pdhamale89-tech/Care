import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { formatIST } from '../utils/dateUtils.js'

const AppContext = createContext(null)

export const NO_FILTER_TABS = ['home', 'reports', 'calendar', 'planningCalendar', 'fiscalCalendar', 'glossary', 'notifications', 'settings']

const BREADCRUMBS = {
  home: 'Home',
  cco: 'Performance Reports › CCO Overview',
  outage: 'Workforce Reports › Outage Report',
  epicenter: 'Workforce Reports › Epicenter HC',
  reports: 'Tools › Reports',
  calendar: 'Tools › Calendar',
  planningCalendar: 'Tools › Calendar › Planning Calendar',
  fiscalCalendar: 'Tools › Calendar › Fiscal Calendar',
  glossary: 'Tools › Glossary',
  notifications: 'System › Notifications',
  settings: 'System › Settings',
}

const CCO_FILTERS_DEFAULT = { subRegion: ['All'], quarter: ['FQ1'], week: ['All'], classification: ['All'] }
const OUTAGE_FILTERS_DEFAULT = { country: ['All'], quarter: ['FQ1'], week: ['All'], manager: ['All'], status: ['All'], search: '' }
const EPICENTER_FILTERS_DEFAULT = { weekEnding: ['All'], vendor: ['All'], manager: ['All'], dbOsp: ['All'] }

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [currentTab, setCurrentTab] = useState('home')
  const [lastUpdated] = useState(() => formatIST(new Date()))
  const [activeRegions, setActiveRegionsState] = useState(['APJC'])

  const [ccoFilters, setCcoFilters] = useState(CCO_FILTERS_DEFAULT)
  const [ccoView, setCcoView] = useState('weekly')
  const [outageFilters, setOutageFilters] = useState(OUTAGE_FILTERS_DEFAULT)
  const [epicenterFilters, setEpicenterFilters] = useState(EPICENTER_FILTERS_DEFAULT)

  const [toast, setToast] = useState({ show: false, msg: '', cls: '' })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), [])

  const navTo = useCallback((tabId) => {
    setCurrentTab(tabId)
  }, [])

  const breadcrumb = BREADCRUMBS[currentTab] || currentTab
  const showFilters = !NO_FILTER_TABS.includes(currentTab)

  const setActiveRegions = useCallback((regions) => {
    setActiveRegionsState(regions)
    setCcoFilters((prev) => ({ ...prev, subRegion: ['All'] }))
    setOutageFilters((prev) => ({ ...prev, country: ['All'] }))
  }, [])

  const setCcoFilter = useCallback((key, value) => {
    setCcoFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: ['All'] } : {}) }))
  }, [])
  const setOutageFilter = useCallback((key, value) => {
    setOutageFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: ['All'] } : {}) }))
  }, [])
  const setEpicenterFilter = useCallback((key, value) => {
    setEpicenterFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    if (currentTab === 'cco') { setCcoFilters(CCO_FILTERS_DEFAULT); setCcoView('weekly') }
    else if (currentTab === 'outage') setOutageFilters(OUTAGE_FILTERS_DEFAULT)
    else if (currentTab === 'epicenter') setEpicenterFilters(EPICENTER_FILTERS_DEFAULT)
  }, [currentTab])

  const showToast = useCallback((msg, cls) => {
    setToast({ show: true, msg, cls })
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500)
  }, [])

  const value = useMemo(() => ({
    theme, toggleTheme, lastUpdated,
    currentTab, navTo, breadcrumb, showFilters,
    activeRegions, setActiveRegions,
    ccoFilters, setCcoFilter, ccoView, setCcoView,
    outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    clearFilters,
    toast, showToast,
  }), [
    theme, toggleTheme, lastUpdated, currentTab, navTo, breadcrumb, showFilters,
    activeRegions, setActiveRegions,
    ccoFilters, setCcoFilter, ccoView, outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    clearFilters, toast, showToast,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
