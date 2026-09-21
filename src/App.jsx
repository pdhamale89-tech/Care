import { useEffect } from 'react'
import { Chart as ChartJS } from 'chart.js'
import { AppProvider } from './core/store/AppContext.jsx'
import { useApp } from './core/hooks/useApp.js'
import Sidebar from './shared/layouts/Sidebar.jsx'
import Topbar from './shared/layouts/Topbar.jsx'
import FilterBar from './shared/layouts/FilterBar.jsx'
import Toast from './shared/components/Toast.jsx'
import InfoTip from './shared/components/InfoTip.jsx'
import ComingSoonTab from './modules/wfo/components/ComingSoonTab.jsx'
import { ROUTES, COMING_SOON_TITLES } from './config/routes.js'
import { getColors } from './shared/themes/colors.js'

function TabRouter() {
  const { currentTab, ccoView } = useApp()
  if (COMING_SOON_TITLES[currentTab]) return <ComingSoonTab title={COMING_SOON_TITLES[currentTab]} />
  const Component = ROUTES[currentTab] || ROUTES.home
  return currentTab === 'cco' ? <Component view={ccoView} /> : <Component />
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
      <Topbar />
      <div className="shell">
        <Sidebar />
        <div className="content">
          <FilterBar />
          <div className="main-wrap">
            <div className="main-scroll">
              <TabRouter />
            </div>
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
