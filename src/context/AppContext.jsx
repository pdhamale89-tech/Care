import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { formatIST } from '../utils/dateUtils.js'

const AppContext = createContext(null)

export const NO_FILTER_TABS = ['home']

const BREADCRUMBS = {
  home: 'Home',
  cco: 'Performance Reports › CCO Dashboard',
  outage: 'Workforce Reports › Outage Report',
  epicenter: 'Workforce Reports › Epicenter HC',
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [currentTab, setCurrentTab] = useState('home')
  const [lastUpdated] = useState(() => formatIST(new Date()))
  const [activeRegion, setActiveRegionState] = useState('APJC')

  const [ccoFilters, setCcoFilters] = useState({ subRegion: 'All', quarter: 'FQ1', week: 'All', classification: 'All' })
  const [ccoView, setCcoView] = useState('daily')
  const [outageFilters, setOutageFilters] = useState({ country: 'All', quarter: 'FQ1', week: 'All', manager: 'All', status: 'All', search: '' })
  const [epicenterFilters, setEpicenterFilters] = useState({ country: 'All', manager: 'All', queue: 'All', dept: 'All', search: '' })

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

  const setActiveRegion = useCallback((region) => {
    setActiveRegionState(region)
    setCcoFilters((prev) => ({ ...prev, subRegion: 'All' }))
    setOutageFilters((prev) => ({ ...prev, country: 'All' }))
    setEpicenterFilters((prev) => ({ ...prev, country: 'All' }))
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

  const clearFilters = useCallback(() => {
    if (currentTab === 'cco') { setCcoFilters({ subRegion: 'All', quarter: 'FQ1', week: 'All', classification: 'All' }); setCcoView('daily') }
    else if (currentTab === 'outage') setOutageFilters({ country: 'All', quarter: 'FQ1', week: 'All', manager: 'All', status: 'All', search: '' })
    else if (currentTab === 'epicenter') setEpicenterFilters({ country: 'All', manager: 'All', queue: 'All', dept: 'All', search: '' })
  }, [currentTab])

  const showToast = useCallback((msg, cls) => {
    setToast({ show: true, msg, cls })
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500)
  }, [])

  const value = useMemo(() => ({
    theme, toggleTheme, lastUpdated,
    currentTab, navTo, breadcrumb, showFilters,
    activeRegion, setActiveRegion,
    ccoFilters, setCcoFilter, ccoView, setCcoView,
    outageFilters, setOutageFilter,
    epicenterFilters, setEpicenterFilter,
    clearFilters,
    toast, showToast,
  }), [
    theme, toggleTheme, lastUpdated, currentTab, navTo, breadcrumb, showFilters,
    activeRegion, setActiveRegion,
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
