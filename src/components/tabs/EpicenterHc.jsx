import { useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { generateEpicenterRoster } from '../../data/mockGenerators.js'
import DownloadBtn from '../common/DownloadBtn.jsx'

export default function EpicenterHc() {
  const { activeRegion, epicenterFilters } = useApp()
  const roster = useMemo(() => generateEpicenterRoster(activeRegion), [activeRegion])

  const filtered = useMemo(() => {
    const search = epicenterFilters.search.toLowerCase()
    return roster.filter((a) => {
      if (epicenterFilters.country !== 'All' && a.country !== epicenterFilters.country) return false
      if (epicenterFilters.manager !== 'All' && a.manager !== epicenterFilters.manager) return false
      if (epicenterFilters.queue !== 'All' && a.queue !== epicenterFilters.queue) return false
      if (epicenterFilters.dept !== 'All' && a.dept !== epicenterFilters.dept) return false
      if (search && !(a.name.toLowerCase().includes(search) || a.badgeId.toLowerCase().includes(search))) return false
      return true
    })
  }, [roster, epicenterFilters])

  return (
    <div className="tab-panel active">
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        ⚠️ All data shown is randomly generated placeholder data for demonstration purposes only. No real employee or
        personal information is used. Email domain (@example-demo.test) is a reserved test domain.
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
              ['Name', 'Badge ID', 'Email', 'Hire Date', 'Queue', 'Dept', 'Code', 'Manager'],
              ...filtered.map((a) => [a.name, a.badgeId, a.email, a.hireDate, a.queue, a.dept, a.deptCode, a.manager]),
            ]}
          />
        </div>
        <div className="tw scroll">
          <table>
            <thead>
              <tr><th>Name</th><th>Badge ID</th><th>Email</th><th>Hire Date</th><th>Queue</th><th>Dept</th><th>Code</th><th>Manager</th></tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.badgeId}>
                  <td>{a.name}</td>
                  <td>{a.badgeId}</td>
                  <td>{a.email}</td>
                  <td>{a.hireDate}</td>
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
