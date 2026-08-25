import { useEffect } from 'react'
import { Chart as ChartJS } from 'chart.js'
import { AppProvider, useApp } from './context/AppContext.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import FilterBar from './components/layout/FilterBar.jsx'
import Toast from './components/common/Toast.jsx'
import HomeTab from './components/tabs/HomeTab.jsx'
import CcoDashboard from './components/tabs/CcoDashboard.jsx'
import OutageReport from './components/tabs/OutageReport.jsx'
import EpicenterHc from './components/tabs/EpicenterHc.jsx'
import KpiReports from './components/tabs/KpiReports.jsx'
import { getColors } from './theme/colors.js'

function TabRouter() {
  const { currentTab, ccoView } = useApp()
  if (currentTab === 'cco') return <CcoDashboard view={ccoView} />
  if (currentTab === 'outage') return <OutageReport />
  if (currentTab === 'epicenter') return <EpicenterHc />
  if (currentTab === 'kpi-voice') return <KpiReports kView="voice" />
  if (currentTab === 'kpi-digital') return <KpiReports kView="digital" />
  if (currentTab === 'kpi-intraday') return <KpiReports kView="intraday" />
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
