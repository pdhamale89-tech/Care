import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { generateAgentRoster, matchesMulti, REGIONS } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { stackedBarConfig } from '../../charts/chartConfigs.js'
import DownloadBtn from '../common/DownloadBtn.jsx'
import InfoBtn from '../common/InfoBtn.jsx'

const STATUS_CLASS = {
  Available: 'available',
  'Unplanned Outage': 'unplanned',
  'Scheduled Off': 'scheduled-off',
}

function pctTone(v) {
  return v > 20 ? 'outage-pct-bad' : v > 5 ? 'outage-pct-warn' : 'outage-pct-ok'
}
function avg(list, pick) {
  return list.length ? list.reduce((s, a) => s + pick(a), 0) / list.length : 0
}

export default function OutageReport() {
  const { theme, activeRegions, outageFilters } = useApp()
  const colors = getColors(theme)
  const [view, setView] = useState('agent')
  const roster = useMemo(() => {
    const regions = activeRegions.includes('All') ? REGIONS : activeRegions
    return regions.flatMap((r) => generateAgentRoster(r).map((a) => ({ ...a, region: r })))
  }, [activeRegions])

  const filtered = useMemo(() => {
    const search = outageFilters.search.toLowerCase()
    return roster.filter((a) => {
      if (!matchesMulti(outageFilters.country, a.country)) return false
      if (!matchesMulti(outageFilters.manager, a.manager)) return false
      if (!matchesMulti(outageFilters.status, a.status)) return false
      if (search && !a.name.toLowerCase().includes(search)) return false
      return true
    })
  }, [roster, outageFilters])

  const total = filtered.length
  const scheduled = filtered.filter((a) => a.isScheduled).length
  const available = filtered.filter((a) => a.status === 'Available').length
  const unplanned = filtered.filter((a) => a.status === 'Unplanned Outage').length

  const agentAvg = useMemo(() => ({
    planned: avg(filtered, (a) => a.plannedPct),
    unplanned: avg(filtered, (a) => a.unplannedPct),
  }), [filtered])
  const agentAvgTotal = agentAvg.planned + agentAvg.unplanned

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach((a) => {
      if (!map[a.manager]) map[a.manager] = []
      map[a.manager].push(a)
    })
    return map
  }, [filtered])
  const managerNames = Object.keys(grouped).sort()

  const managerRows = useMemo(
    () => managerNames.map((mgr) => {
      const agents = grouped[mgr]
      const planned = avg(agents, (a) => a.plannedPct)
      const unplannedPct = avg(agents, (a) => a.unplannedPct)
      return {
        manager: mgr,
        total: agents.length,
        scheduled: agents.filter((a) => a.isScheduled).length,
        available: agents.filter((a) => a.status === 'Available').length,
        unplanned: agents.filter((a) => a.status === 'Unplanned Outage').length,
        off: agents.filter((a) => a.status === 'Scheduled Off').length,
        planned,
        unplannedPct,
        total_pct: planned + unplannedPct,
      }
    }),
    [managerNames, grouped],
  )
  const globalAvg = useMemo(() => ({
    planned: avg(managerRows, (r) => r.planned),
    unplanned: avg(managerRows, (r) => r.unplannedPct),
  }), [managerRows])

  const chart = useMemo(() => {
    const availableData = managerNames.map((m) => grouped[m].filter((a) => a.status === 'Available').length)
    const unplannedData = managerNames.map((m) => grouped[m].filter((a) => a.status === 'Unplanned Outage').length)
    const offData = managerNames.map((m) => grouped[m].filter((a) => a.status === 'Scheduled Off').length)
    return stackedBarConfig(managerNames, [
      { label: 'Available', data: availableData, backgroundColor: colors.accentGreen },
      { label: 'Unplanned Outage', data: unplannedData, backgroundColor: colors.accentRed },
      { label: 'Scheduled Off', data: offData, backgroundColor: colors.textSecondary },
    ])
  }, [managerNames, grouped, colors])

  return (
    <div className="tab-panel active">
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        ⚠️ All agent names shown are randomly generated placeholder data for demonstration purposes only. No real employee or personal information is used.
      </div>

      <div className="mini-row">
        <div className="mini-stat"><div className="mini-stat-lbl">Total Agents</div><div className="mini-stat-val">{total}</div></div>
        <div className="mini-stat"><div className="mini-stat-lbl">Scheduled</div><div className="mini-stat-val">{scheduled}</div></div>
        <div className="mini-stat"><div className="mini-stat-lbl">Available</div><div className="mini-stat-val tone-g">{available}</div></div>
        <div className="mini-stat"><div className="mini-stat-lbl">Unplanned Outage</div><div className="mini-stat-val tone-r">{unplanned}</div></div>
      </div>

      <div className="pill-toggle" style={{ marginBottom: 14 }}>
        <button type="button" className={view === 'agent' ? 'active' : ''} onClick={() => setView('agent')}>Agent Wise</button>
        <button type="button" className={view === 'manager' ? 'active' : ''} onClick={() => setView('manager')}>Manager Wise</button>
      </div>

      {view === 'agent' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Agent Status <InfoBtn tip="<strong>Purpose</strong>Agent-level schedule adherence and outage detail for the selected filters." />
            </div>
            <DownloadBtn
              filename="outage-agent-wise"
              rows={[
                ['Agent', 'Manager', 'Country', 'Scheduled', 'Status', 'Reason', 'Duration', 'Planned %', 'Unplanned %', 'Total %'],
                ...filtered.map((a) => [a.name, a.manager, a.country, a.isScheduled ? 'Y' : 'N', a.status, a.reason, a.duration, a.plannedPct, a.unplannedPct, a.totalPct]),
              ]}
            />
          </div>
          <div className="tw scroll">
            <table>
              <thead>
                <tr>
                  <th>Agent</th><th>Manager</th><th>Country</th><th>Sched</th><th>Status</th><th>Reason</th><th>Duration</th>
                  <th>Planned %</th><th>Unplanned %</th><th>Total %</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.region + a.name + a.manager}>
                    <td>{a.name}</td>
                    <td>{a.manager}</td>
                    <td>{a.country}</td>
                    <td className={a.isScheduled ? 'sched-yes' : 'sched-no'}>{a.isScheduled ? 'Y' : 'N'}</td>
                    <td><span className={'status-pill ' + STATUS_CLASS[a.status]}>{a.status}</span></td>
                    <td>{a.reason}</td>
                    <td>{a.duration}</td>
                    <td className={pctTone(a.plannedPct)}>{a.plannedPct}%</td>
                    <td className={pctTone(a.unplannedPct)}>{a.unplannedPct}%</td>
                    <td className={pctTone(a.totalPct)}>{a.totalPct}%</td>
                  </tr>
                ))}
                <tr className="tot-row">
                  <td colSpan={7} style={{ textAlign: 'right' }}>AVG</td>
                  <td className={pctTone(agentAvg.planned)}>{agentAvg.planned.toFixed(1)}%</td>
                  <td className={pctTone(agentAvg.unplanned)}>{agentAvg.unplanned.toFixed(1)}%</td>
                  <td className={pctTone(agentAvgTotal)}>{agentAvgTotal.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'manager' && (
        <>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                Manager Status <InfoBtn tip="<strong>Purpose</strong>Planned, Unplanned and Total outage % rolled up by manager, averaged across their agents." />
              </div>
              <DownloadBtn
                filename="outage-manager-wise"
                rows={[
                  ['Manager', 'Total', 'Sched', 'Avail', 'Unplanned', 'Off', 'Planned %', 'Unplanned %', 'Total %'],
                  ...managerRows.map((r) => [r.manager, r.total, r.scheduled, r.available, r.unplanned, r.off, r.planned.toFixed(1), r.unplannedPct.toFixed(1), r.total_pct.toFixed(1)]),
                ]}
              />
            </div>
            <div className="tw scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Manager</th><th>Total</th><th>Sched</th><th>Avail</th><th>Unplanned</th><th>Off</th>
                    <th>Planned %</th><th>Unplanned %</th><th>Total %</th>
                  </tr>
                </thead>
                <tbody>
                  {managerRows.map((r) => (
                    <tr key={r.manager}>
                      <td style={{ textAlign: 'left' }}>{r.manager}</td>
                      <td>{r.total}</td>
                      <td>{r.scheduled}</td>
                      <td>{r.available}</td>
                      <td>{r.unplanned}</td>
                      <td>{r.off}</td>
                      <td className={pctTone(r.planned)}>{r.planned.toFixed(1)}%</td>
                      <td className={pctTone(r.unplannedPct)}>{r.unplannedPct.toFixed(1)}%</td>
                      <td className={pctTone(r.total_pct)}>{r.total_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="tot-row">
                    <td style={{ textAlign: 'left' }}>AVG</td>
                    <td colSpan={5}></td>
                    <td className={pctTone(globalAvg.planned)}>{globalAvg.planned.toFixed(1)}%</td>
                    <td className={pctTone(globalAvg.unplanned)}>{globalAvg.unplanned.toFixed(1)}%</td>
                    <td className={pctTone(globalAvg.planned + globalAvg.unplanned)}>{(globalAvg.planned + globalAvg.unplanned).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                Outage Breakdown by Manager <InfoBtn tip="<strong>Purpose</strong>Available, Unplanned Outage and Scheduled Off agent counts stacked by manager." />
              </div>
            </div>
            <div className="chart-container">
              <Bar data={chart.data} options={chart.options} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
