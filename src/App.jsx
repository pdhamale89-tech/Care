import { useEffect } from 'react'
import { Chart as ChartJS } from 'chart.js'
import { AppProvider } from './core/store/AppContext.jsx'
import { useApp } from './core/hooks/useApp.js'
import Sidebar from './shared/layouts/Sidebar.jsx'
import Topbar from './shared/layouts/Topbar.jsx'
import FilterBar from './shared/layouts/FilterBar.jsx'
import PageHeader from './shared/components/PageHeader.jsx'
import Toast from './shared/components/Toast.jsx'
import InfoTip from './shared/components/InfoTip.jsx'
import ComingSoonTab from './modules/wfo/components/ComingSoonTab.jsx'
import { ROUTES, COMING_SOON_TITLES } from './config/routes.js'
import { getColors } from './shared/themes/colors.js'

// Title/description shown above the filter bar on each main tab (DDS page-header
// pattern) — descriptions reuse the same copy already shown on the Home hero cards
// for cco/outage/epiHc/whatIf, so nothing here is new/invented business copy.
const PAGE_META = {
  cco: { title: 'CCO Overview', description: 'Weekly and quarterly SLA, volume, and backlog performance.' },
  outage: { title: 'Outage Report', description: 'Agent schedule adherence and unplanned-outage breakdowns by manager.' },
  epiHc: { title: 'Epi HC', description: 'Workforce analytics — growth, tenure, sourcing mix, span of control, and risk.' },
  whatIf: { title: 'What-If Simulator', description: 'Staffing, hiring plan, sourcing mix, and backlog scenarios in one place.' },
  reports: { title: 'Reports', description: 'Linked reporting shortcuts for voice queue, agent and Genesys skill data.' },
  fiscalCalendar: { title: 'Fiscal Calendar', description: 'Fiscal year weeks, quarters and holiday schedule for planning.' },
}

function TabRouter() {
  const { currentTab, ccoView } = useApp()
  if (COMING_SOON_TITLES[currentTab]) return <ComingSoonTab title={COMING_SOON_TITLES[currentTab]} />
  const Component = ROUTES[currentTab] || ROUTES.cco
  return currentTab === 'cco' ? <Component view={ccoView} /> : <Component />
}

function DashboardShell() {
  const { theme, currentTab } = useApp()
  const pageMeta = PAGE_META[currentTab]

  useEffect(() => {
    const colors = getColors(theme)
    ChartJS.defaults.color = colors.textSecondary
    ChartJS.defaults.font.family = 'Roboto, sans-serif'
    ChartJS.defaults.font.size = 10
  }, [theme])

  return (
    <div className="app">
      <Topbar />
      <div className="shell">
        <Sidebar />
        <div className="content">
          {pageMeta && <PageHeader title={pageMeta.title} description={pageMeta.description} />}
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
