import { Fragment, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { generateAgentRoster } from '../data/mockGenerators.js'
import { stackedBarConfig } from '../charts/chartConfigs.js'

const STATUS_CLASS = {
  Available: 'status-available',
  'Unplanned Outage': 'status-unplanned',
  'Scheduled Off': 'status-scheduled-off',
}

export default function OutagePage({ activeRegion, filters }) {
  const roster = useMemo(() => generateAgentRoster(activeRegion), [activeRegion])

  const filtered = useMemo(() => {
    const search = filters.search.toLowerCase()
    return roster.filter((a) => {
      if (filters.country !== 'All' && a.country !== filters.country) return false
      if (filters.manager !== 'All' && a.manager !== filters.manager) return false
      if (filters.status !== 'All' && a.status !== filters.status) return false
      if (search && !a.name.toLowerCase().includes(search)) return false
      return true
    })
  }, [roster, filters])

  const total = filtered.length
  const scheduled = filtered.filter((a) => a.isScheduled).length
  const available = filtered.filter((a) => a.status === 'Available').length
  const unplanned = filtered.filter((a) => a.status === 'Unplanned Outage').length

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach((a) => {
      if (!map[a.manager]) map[a.manager] = []
      map[a.manager].push(a)
    })
    return map
  }, [filtered])
  const managerNames = Object.keys(grouped).sort()

  const chart = useMemo(() => {
    const availableData = managerNames.map((m) => grouped[m].filter((a) => a.status === 'Available').length)
    const unplannedData = managerNames.map((m) => grouped[m].filter((a) => a.status === 'Unplanned Outage').length)
    const offData = managerNames.map((m) => grouped[m].filter((a) => a.status === 'Scheduled Off').length)
    return stackedBarConfig(managerNames, [
      { label: 'Available', data: availableData, backgroundColor: '#1E8E3E' },
      { label: 'Unplanned Outage', data: unplannedData, backgroundColor: '#D93025' },
      { label: 'Scheduled Off', data: offData, backgroundColor: '#9AA1AC' },
    ])
  }, [managerNames, grouped])

  return (
    <main>
      <div className="dashboard-title">Agent Outage Report</div>
      <div className="dashboard-subtitle">Real-time agent schedule adherence — Region: {activeRegion}</div>
      <div className="disclaimer-banner">
        ⚠️ All agent names shown are randomly generated placeholder data for demonstration purposes only. No real
        employee or personal information is used.
      </div>

      <div className="section-title is-first">Summary</div>
      <div className="backlog-metrics">
        <div className="backlog-item"><div className="val">{total}</div><div className="lbl">Total Agents</div></div>
        <div className="backlog-item"><div className="val">{scheduled}</div><div className="lbl">Scheduled</div></div>
        <div className="backlog-item"><div className="val" style={{ color: 'var(--green)' }}>{available}</div><div className="lbl">Available</div></div>
        <div className="backlog-item"><div className="val" style={{ color: 'var(--red)' }}>{unplanned}</div><div className="lbl">Unplanned Outage</div></div>
      </div>

      <div className="section-title">Agent Status — Manager Wise</div>
      <div className="card">
        <div className="scroll-table">
          <table>
            <thead>
              <tr>
                <th>Agent Name</th><th>Manager</th><th>Country</th><th>Scheduled</th>
                <th>Actual Status</th><th>Reason</th><th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {managerNames.map((mgr) => {
                const agents = grouped[mgr]
                const mgrAvail = agents.filter((a) => a.status === 'Available').length
                const mgrUnpl = agents.filter((a) => a.status === 'Unplanned Outage').length
                return (
                  <Fragment key={mgr}>
                    <tr className="manager-group-row">
                      <td colSpan={7}>👤 {mgr} — {agents.length} Agents | ✅ {mgrAvail} Available | ⚠️ {mgrUnpl} Unplanned</td>
                    </tr>
                    {agents.map((a) => (
                      <tr key={a.name + mgr}>
                        <td>{a.name}</td>
                        <td>{a.manager}</td>
                        <td>{a.country}</td>
                        <td className={a.isScheduled ? 'sched-yes' : 'sched-no'}>{a.isScheduled ? 'Yes' : 'No'}</td>
                        <td><span className={'status-pill ' + STATUS_CLASS[a.status]}>{a.status}</span></td>
                        <td style={{ textAlign: 'left' }}>{a.reason}</td>
                        <td>{a.duration}</td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-title">Outage Breakdown by Manager</div>
      <div className="card">
        <Bar data={chart.data} options={chart.options} />
      </div>
    </main>
  )
}
