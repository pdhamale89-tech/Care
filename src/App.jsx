import { useEffect } from 'react'
import { Chart as ChartJS } from 'chart.js'
import { AppProvider, useApp } from './context/AppContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import FilterBar from './components/FilterBar.jsx'
import Toast from './components/Toast.jsx'
import InfoTip from './components/InfoTip.jsx'
import HomeTab from './components/HomeTab.jsx'
import CcoDashboard from './components/CcoDashboard.jsx'
import OutageReport from './components/OutageReport.jsx'
import EpiHc from './components/EpiHc.jsx'
import Reports from './components/Reports.jsx'
import FiscalCalendar from './components/FiscalCalendar.jsx'
import ComingSoonTab from './components/ComingSoonTab.jsx'
import WhatIfSimulator from './components/WhatIfSimulator.jsx'
import { getColors } from './lib/colors.js'

const COMING_SOON_TITLES = {
  calendar: 'Calendar',
  glossary: 'Glossary',
  notifications: 'Notifications',
  settings: 'Settings',
}

function TabRouter() {
  const { currentTab, ccoView } = useApp()
  if (currentTab === 'cco') return <CcoDashboard view={ccoView} />
  if (currentTab === 'outage') return <OutageReport />
  if (currentTab === 'epiHc') return <EpiHc />
  if (currentTab === 'reports') return <Reports />
  if (currentTab === 'fiscalCalendar') return <FiscalCalendar />
  if (currentTab === 'whatIf') return <WhatIfSimulator />
  if (COMING_SOON_TITLES[currentTab]) return <ComingSoonTab title={COMING_SOON_TITLES[currentTab]} />
  return <HomeTab />
}

function DashboardShell() {
  const { theme } = useApp()

  useEffect(() => {
    const colors = getColors(theme)
    ChartJS.defaults.color = colors.textSecondary
    ChartJS.defaults.font.family = "'Roboto Flex', sans-serif"
    ChartJS.defaults.font.size = 10
  }, [theme])

  return (
    <div className="app">
      <Sidebar />
      <div className="content">
        <Topbar />
        <FilterBar />
        <div className="main-wrap">
          <div className="main-scroll">
            <TabRouter />
          </div>
        </div>
      </div>
      <Toast />
      <InfoTip />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <DashboardShell />
    </AppProvider>
  )
}
