import { useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { generateEpicenterRoster, fmt } from '../../data/mockGenerators.js'
import DownloadBtn from '../common/DownloadBtn.jsx'

export default function EpicenterHc() {
  const { activeRegion, epicenterFilters } = useApp()
  const roster = useMemo(() => generateEpicenterRoster(activeRegion), [activeRegion])

  const filtered = useMemo(() => {
    return roster.filter((a) => {
      if (epicenterFilters.weekEnding !== 'All' && a.weekEnding !== epicenterFilters.weekEnding) return false
      if (epicenterFilters.vendor !== 'All' && a.vendor !== epicenterFilters.vendor) return false
      if (epicenterFilters.manager !== 'All' && a.manager !== epicenterFilters.manager) return false
      if (epicenterFilters.dbOsp !== 'All' && a.dbOsp !== epicenterFilters.dbOsp) return false
      return true
    })
  }, [roster, epicenterFilters])

  const summary = useMemo(() => {
    const totalTSEs = filtered.length
    const totalManagers = new Set(filtered.map((a) => a.manager)).size
    return { totalTSEs, totalManagers }
  }, [filtered])

  return (
    <div className="tab-panel active">
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        ⚠️ All data shown is randomly generated placeholder data for demonstration purposes only. No real employee or
        personal information is used. Email domain (@example-demo.test) is a reserved test domain.
      </div>

      <div className="section-div">
        <h2>Team Summary</h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Managers</div>
          <div className="kpi-value">{fmt(summary.totalManagers)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total TSEs</div>
          <div className="kpi-value">{fmt(summary.totalTSEs)}</div>
        </div>
      </div>

      <div className="section-div">
        <h2>Agent Roster</h2>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Roster ({filtered.length})</div>
          <DownloadBtn
            filename="epicenter-roster"
            rows={[
              ['Name', 'Badge ID', 'Email', 'Hire Date', 'Week Ending', 'Vendor', 'DB/OSP', 'Queue', 'Dept', 'Code', 'Manager'],
              ...filtered.map((a) => [a.name, a.badgeId, a.email, a.hireDate, a.weekEnding, a.vendor, a.dbOsp, a.queue, a.dept, a.deptCode, a.manager]),
            ]}
          />
        </div>
        <div className="tw scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Badge ID</th><th>Email</th><th>Hire Date</th>
                <th>Week Ending</th><th>Vendor</th><th>DB/OSP</th>
                <th>Queue</th><th>Dept</th><th>Code</th><th>Manager</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.badgeId}>
                  <td>{a.name}</td>
                  <td>{a.badgeId}</td>
                  <td>{a.email}</td>
                  <td>{a.hireDate}</td>
                  <td>{a.weekEnding}</td>
                  <td>{a.vendor}</td>
                  <td>{a.dbOsp}</td>
                  <td>{a.queue}</td>
                  <td>{a.dept}</td>
                  <td><span className="pill-tag">{a.deptCode}</span></td>
                  <td>{a.manager}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
