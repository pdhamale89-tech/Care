import { useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { generateEpicenterRoster, departments, queueNames } from '../data/mockGenerators.js'
import { donutConfig, barConfig } from '../charts/chartConfigs.js'

export default function EpicenterPage({ activeRegion, filters }) {
  const roster = useMemo(() => generateEpicenterRoster(activeRegion), [activeRegion])

  const filtered = useMemo(() => {
    const search = filters.search.toLowerCase()
    return roster.filter((a) => {
      if (filters.country !== 'All' && a.country !== filters.country) return false
      if (filters.manager !== 'All' && a.manager !== filters.manager) return false
      if (filters.queue !== 'All' && a.queue !== filters.queue) return false
      if (filters.dept !== 'All' && a.dept !== filters.dept) return false
      if (search && !(a.name.toLowerCase().includes(search) || a.badgeId.toLowerCase().includes(search))) return false
      return true
    })
  }, [roster, filters])

  const managerCount = new Set(filtered.map((a) => a.manager)).size
  const deptCount = new Set(filtered.map((a) => a.dept)).size
  const queueCount = new Set(filtered.map((a) => a.queue)).size

  const deptChart = useMemo(() => {
    const counts = {}
    departments.forEach((d) => (counts[d.name] = 0))
    filtered.forEach((a) => (counts[a.dept] = (counts[a.dept] || 0) + 1))
    return donutConfig(Object.keys(counts), Object.values(counts), ['#0076CE', '#1E8E3E', '#F29900', '#D93025', '#5A5F68'])
  }, [filtered])

  const queueChart = useMemo(() => {
    const counts = {}
    queueNames.forEach((q) => (counts[q] = 0))
    filtered.forEach((a) => (counts[a.queue] = (counts[a.queue] || 0) + 1))
    return barConfig(Object.keys(counts), 'Headcount', Object.values(counts), '#0076CE')
  }, [filtered])

  return (
    <main>
      <div className="dashboard-title">Epicenter HC</div>
      <div className="dashboard-subtitle">Agent headcount roster — Region: {activeRegion}</div>
      <div className="disclaimer-banner">
        ⚠️ All names, badge IDs, emails, and hire dates shown are randomly generated placeholder data for
        demonstration purposes only. No real employee or personal information is used. Email domain
        (@example-demo.test) is a reserved test domain and does not correspond to any real organization.
      </div>

      <div className="section-title is-first">Headcount Summary</div>
      <div className="backlog-metrics">
        <div className="backlog-item"><div className="val">{filtered.length}</div><div className="lbl">Total Headcount</div></div>
        <div className="backlog-item"><div className="val">{managerCount}</div><div className="lbl">Managers</div></div>
        <div className="backlog-item"><div className="val">{deptCount}</div><div className="lbl">Departments</div></div>
        <div className="backlog-item"><div className="val">{queueCount}</div><div className="lbl">Queues</div></div>
      </div>

      <div className="section-title">Agent Roster</div>
      <div className="card">
        <div className="scroll-table">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Agent Name</th>
                <th style={{ textAlign: 'left' }}>Badge ID</th>
                <th style={{ textAlign: 'left' }}>Email</th>
                <th>Hire Date</th>
                <th style={{ textAlign: 'left' }}>Queue Name</th>
                <th style={{ textAlign: 'left' }}>Department</th>
                <th>Dept Code</th>
                <th style={{ textAlign: 'left' }}>Manager</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.badgeId}>
                  <td style={{ textAlign: 'left' }}>{a.name}</td>
                  <td style={{ textAlign: 'left' }}>{a.badgeId}</td>
                  <td style={{ textAlign: 'left' }}>{a.email}</td>
                  <td>{a.hireDate}</td>
                  <td style={{ textAlign: 'left' }}>{a.queue}</td>
                  <td style={{ textAlign: 'left' }}>{a.dept}</td>
                  <td><span className="dept-code-pill">{a.deptCode}</span></td>
                  <td style={{ textAlign: 'left' }}>{a.manager}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-title">Headcount by Department</div>
      <div className="grid-2">
        <div className="card">
          <h3>HC by Department</h3>
          <Doughnut data={deptChart.data} options={deptChart.options} />
        </div>
        <div className="card">
          <h3>HC by Queue</h3>
          <Bar data={queueChart.data} options={queueChart.options} />
        </div>
      </div>
    </main>
  )
}
