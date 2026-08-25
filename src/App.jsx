import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import CcoFilterBar from './components/filterbars/CcoFilterBar.jsx'
import OutageFilterBar from './components/filterbars/OutageFilterBar.jsx'
import EpicenterFilterBar from './components/filterbars/EpicenterFilterBar.jsx'
import KpiFilterBar from './components/filterbars/KpiFilterBar.jsx'
import CcoPage from './pages/CcoPage.jsx'
import OutagePage from './pages/OutagePage.jsx'
import EpicenterPage from './pages/EpicenterPage.jsx'
import KpiPage from './pages/KpiPage.jsx'

const KPI_QUEUE_DEFAULTS = { voice: 'Voice - Sales', digital: 'Email', intraday: 'Voice' }

export default function App() {
  const [currentPage, setCurrentPage] = useState('cco')
  const [ccoView, setCcoView] = useState('daily')
  const [kView, setKView] = useState('voice')
  const [activeRegion, setActiveRegion] = useState('APJC')

  const [ccoFilters, setCcoFilters] = useState({ subRegion: 'All', quarter: 'FQ1', week: 'All', classification: 'All' })
  const [outageFilters, setOutageFilters] = useState({ country: 'All', manager: 'All', status: 'All', search: '' })
  const [epicenterFilters, setEpicenterFilters] = useState({ country: 'All', manager: 'All', queue: 'All', dept: 'All', search: '' })
  const [kpiFilters, setKpiFilters] = useState({ country: 'All', quarter: 'FQ1', week: 'All', queue: 'Voice - Sales' })

  function handleSidebarSelect(item) {
    setCurrentPage(item.page)
    if (item.view) setCcoView(item.view)
    if (item.kview) {
      setKView(item.kview)
      setKpiFilters((prev) => ({ ...prev, queue: KPI_QUEUE_DEFAULTS[item.kview] }))
    }
  }

  function handleRegionChange(region) {
    setActiveRegion(region)
    setCcoFilters((prev) => ({ ...prev, subRegion: 'All' }))
    setOutageFilters((prev) => ({ ...prev, country: 'All' }))
    setEpicenterFilters((prev) => ({ ...prev, country: 'All' }))
    setKpiFilters((prev) => ({ ...prev, country: 'All' }))
  }

  function handleCcoFilterChange(key, value) {
    setCcoFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: 'All' } : {}) }))
  }
  function handleOutageFilterChange(key, value) {
    setOutageFilters((prev) => ({ ...prev, [key]: value }))
  }
  function handleEpicenterFilterChange(key, value) {
    setEpicenterFilters((prev) => ({ ...prev, [key]: value }))
  }
  function handleKpiFilterChange(key, value) {
    setKpiFilters((prev) => ({ ...prev, [key]: value, ...(key === 'quarter' ? { week: 'All' } : {}) }))
  }

  return (
    <>
      <Sidebar currentPage={currentPage} ccoView={ccoView} kView={kView} onSelect={handleSidebarSelect} />
      <div className="main-wrapper">
        <Header currentPage={currentPage} activeRegion={activeRegion} onRegionChange={handleRegionChange} />

        {currentPage === 'cco' && (
          <CcoFilterBar activeRegion={activeRegion} filters={ccoFilters} onChange={handleCcoFilterChange} />
        )}
        {currentPage === 'outage' && (
          <OutageFilterBar activeRegion={activeRegion} filters={outageFilters} onChange={handleOutageFilterChange} />
        )}
        {currentPage === 'epicenter' && (
          <EpicenterFilterBar activeRegion={activeRegion} filters={epicenterFilters} onChange={handleEpicenterFilterChange} />
        )}
        {currentPage === 'kpi' && (
          <KpiFilterBar activeRegion={activeRegion} kView={kView} filters={kpiFilters} onChange={handleKpiFilterChange} />
        )}

        {currentPage === 'cco' && <CcoPage view={ccoView} activeRegion={activeRegion} filters={ccoFilters} />}
        {currentPage === 'outage' && <OutagePage activeRegion={activeRegion} filters={outageFilters} />}
        {currentPage === 'epicenter' && <EpicenterPage activeRegion={activeRegion} filters={epicenterFilters} />}
        {currentPage === 'kpi' && <KpiPage kView={kView} activeRegion={activeRegion} filters={kpiFilters} />}

        <footer>Care SPOG · Single Pane Of Glass Dashboard · Mock Data for Demonstration · Verify figures against source systems before executive reporting.</footer>
      </div>
    </>
  )
}
