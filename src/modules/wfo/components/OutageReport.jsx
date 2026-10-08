import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../../core/hooks/useApp.js'
import { generateAgentRoster, getWeeksForQuarter, matchesMulti, REGIONS, summarizeActiveFilters } from '../lib/mockGenerators.js'
import { modelledOutagePct, generateWeeklyOutageSeries } from '../lib/globalOutageData.js'
import { getColors } from '../../../shared/themes/colors.js'
import { groupedBarConfig, stackedBarConfig } from '../lib/chartConfigs.js'
import DownloadBtn from '../../../shared/components/DownloadBtn.jsx'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'
import Modal from '../../../shared/components/Modal.jsx'

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
function fmtSignedPct(v) {
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%'
}

export default function OutageReport() {
  const { theme, activeRegions, outageFilters } = useApp()
  const colors = getColors(theme)
  const [view, setView] = useState('agent')
  const [showOutageBreakdown, setShowOutageBreakdown] = useState(false)
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

  const exportFiltersUsed = summarizeActiveFilters([
    ['Region', activeRegions], ['Country', outageFilters.country], ['Quarter', outageFilters.quarter],
    ['Week', outageFilters.week], ['Manager', outageFilters.manager], ['Status', outageFilters.status],
    ['Search', outageFilters.search ? [outageFilters.search] : []],
  ])

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

  // Global View — same filtered roster, rolled up by Region instead of Manager, plus a
  // deterministic "modelled" (budgeted) outage% target per region for a goal-delta read.
  const regionGrouped = useMemo(() => {
    const map = {}
    filtered.forEach((a) => {
      if (!map[a.region]) map[a.region] = []
      map[a.region].push(a)
    })
    return map
  }, [filtered])
  const regionNames = Object.keys(regionGrouped).sort()

  const regionRows = useMemo(
    () => regionNames.map((region) => {
      const agents = regionGrouped[region]
      const planned = avg(agents, (a) => a.plannedPct)
      const unplannedPct = avg(agents, (a) => a.unplannedPct)
      const outagePct = planned + unplannedPct
      const modelled = modelledOutagePct(region)
      return {
        region,
        scheduled: agents.filter((a) => a.isScheduled).length,
        actualStatus: agents.filter((a) => a.status === 'Available').length,
        planned,
        unplannedPct,
        outagePct,
        modelled,
        delta: outagePct - modelled,
      }
    }),
    [regionNames, regionGrouped],
  )
  const regionTotals = useMemo(() => {
    const planned = avg(regionRows, (r) => r.planned)
    const unplannedPct = avg(regionRows, (r) => r.unplannedPct)
    const modelled = avg(regionRows, (r) => r.modelled)
    return {
      scheduled: regionRows.reduce((s, r) => s + r.scheduled, 0),
      actualStatus: regionRows.reduce((s, r) => s + r.actualStatus, 0),
      planned, unplannedPct, outagePct: planned + unplannedPct, modelled,
      delta: planned + unplannedPct - modelled,
    }
  }, [regionRows])

  const regionChart = useMemo(() => groupedBarConfig(
    regionNames,
    [
      { label: 'Planned %', data: regionRows.map((r) => Math.round(r.planned * 10) / 10), backgroundColor: colors.accentBlue + '55' },
      { label: 'Unplanned %', data: regionRows.map((r) => Math.round(r.unplannedPct * 10) / 10), backgroundColor: colors.accentBlue },
    ],
    '%',
  ), [regionNames, regionRows, colors])

  // Drills from Quarter view into that quarter's 13 weeks the moment exactly one
  // Fiscal Quarter filter is active — otherwise shows all 4 quarters side by side.
  const periodRows = useMemo(() => {
    const selQuarters = (outageFilters.quarter || []).filter((q) => q !== 'All')
    if (selQuarters.length === 1) {
      return generateWeeklyOutageSeries(getWeeksForQuarter(selQuarters[0]))
        .map((w) => ({ label: w.week.replace('FW', 'W'), planned: w.planned, unplanned: w.unplanned }))
    }
    const quarters = selQuarters.length ? selQuarters : ['FQ1', 'FQ2', 'FQ3', 'FQ4']
    return generateWeeklyOutageSeries(quarters).map((s, i) => ({ label: quarters[i], planned: s.planned, unplanned: s.unplanned }))
  }, [outageFilters.quarter])

  const periodChart = useMemo(() => stackedBarConfig(
    periodRows.map((p) => p.label),
    [
      { label: 'Planned %', data: periodRows.map((p) => Math.round(p.planned * 10) / 10), backgroundColor: colors.accentBlue + '55' },
      { label: 'Unplanned %', data: periodRows.map((p) => Math.round(p.unplanned * 10) / 10), backgroundColor: colors.accentBlue },
    ],
    '%',
  ), [periodRows, colors])

  return (
    <div className="tab-panel active">
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        ⚠️ All agent names shown are randomly generated placeholder data for demonstration purposes only. No real employee or personal information is used.
      </div>

      <div className="kpi-grid stats-row">
        <div className="kpi-card"><div className="kpi-label">Total Agents</div><div className="kpi-value">{total}</div></div>
        <div className="kpi-card"><div className="kpi-label">Scheduled</div><div className="kpi-value">{scheduled}</div></div>
        <div className="kpi-card"><div className="kpi-label">Available</div><div className="kpi-value tone-g">{available}</div></div>
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setShowOutageBreakdown(true)}>
          <div className="kpi-label">Total Outage %</div>
          <div className="kpi-value tone-r">{agentAvgTotal.toFixed(1)}%</div>
          <div className="kpi-sub">click for Planned/Unplanned breakup</div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Breakdown view" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={view === 'agent'} className="tab" onClick={() => setView('agent')}>Agent Wise</button>
        <button type="button" role="tab" aria-selected={view === 'manager'} className="tab" onClick={() => setView('manager')}>Manager Wise</button>
        <button type="button" role="tab" aria-selected={view === 'global'} className="tab" onClick={() => setView('global')}>Global View</button>
      </div>

      {view === 'agent' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Agent Status <InfoBtn tip="<strong>Purpose</strong>Agent-level schedule adherence and outage detail for the selected filters." />
            </div>
            <DownloadBtn
              filename="outage-agent-wise"
              source="Outage Report — Agent Status"
              filtersUsed={exportFiltersUsed}
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
                source="Outage Report — Manager Status"
                filtersUsed={exportFiltersUsed}
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

      {view === 'global' && (
        <>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                Region Status <InfoBtn tip="<strong>Purpose</strong>Planned, Unplanned and Total outage % rolled up by region, against a modelled (budgeted) outage% target. Outage Goal Delta = Outage% &minus; Modelled Outage% — red when over target, green when under." />
              </div>
              <DownloadBtn
                filename="outage-global-view"
                source="Outage Report — Global View"
                filtersUsed={exportFiltersUsed}
                rows={[
                  ['Region', 'Scheduled', 'Actual Status', 'Planned %', 'Unplanned %', 'Outage %', 'Modelled Outage %', 'Outage Goal Delta'],
                  ...regionRows.map((r) => [r.region, r.scheduled, r.actualStatus, r.planned.toFixed(1), r.unplannedPct.toFixed(1), r.outagePct.toFixed(1), r.modelled.toFixed(1), r.delta.toFixed(1)]),
                ]}
              />
            </div>
            <div className="tw scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Region</th><th>Scheduled</th><th>Actual Status</th>
                    <th>Planned %</th><th>Unplanned %</th><th>Outage %</th><th>Modelled Outage%</th><th>Outage Goal Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {regionRows.map((r) => (
                    <tr key={r.region}>
                      <td style={{ textAlign: 'left' }}>{r.region}</td>
                      <td>{r.scheduled}</td>
                      <td>{r.actualStatus}</td>
                      <td className={pctTone(r.planned)}>{r.planned.toFixed(1)}%</td>
                      <td className={pctTone(r.unplannedPct)}>{r.unplannedPct.toFixed(1)}%</td>
                      <td className={pctTone(r.outagePct)}>{r.outagePct.toFixed(1)}%</td>
                      <td>{r.modelled.toFixed(1)}%</td>
                      <td className={r.delta > 0 ? 'outage-pct-bad' : 'outage-pct-ok'}>{fmtSignedPct(r.delta)}</td>
                    </tr>
                  ))}
                  <tr className="tot-row">
                    <td style={{ textAlign: 'left' }}>AVG</td>
                    <td>{regionTotals.scheduled}</td>
                    <td>{regionTotals.actualStatus}</td>
                    <td className={pctTone(regionTotals.planned)}>{regionTotals.planned.toFixed(1)}%</td>
                    <td className={pctTone(regionTotals.unplannedPct)}>{regionTotals.unplannedPct.toFixed(1)}%</td>
                    <td className={pctTone(regionTotals.outagePct)}>{regionTotals.outagePct.toFixed(1)}%</td>
                    <td>{regionTotals.modelled.toFixed(1)}%</td>
                    <td className={regionTotals.delta > 0 ? 'outage-pct-bad' : 'outage-pct-ok'}>{fmtSignedPct(regionTotals.delta)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                Outage % by Region/Sub-region <InfoBtn tip="<strong>Purpose</strong>Average Planned% and Unplanned% outage per region for the selected filters." />
              </div>
            </div>
            <div className="chart-container">
              <Bar data={regionChart.data} options={regionChart.options} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                Outage % by Fiscal Quarter/Week <InfoBtn tip="<strong>Purpose</strong>Planned% and Unplanned% outage stacked per period. Select a single Fiscal Quarter in the filter bar to drill into its 13 weeks; otherwise shows all 4 quarters." />
              </div>
            </div>
            <div className="chart-container">
              <Bar data={periodChart.data} options={periodChart.options} />
            </div>
          </div>
        </>
      )}

      <Modal open={showOutageBreakdown} onClose={() => setShowOutageBreakdown(false)} title="Total Outage % Breakdown">
        <div className="kpi-grid">
          <div className="kpi-card"><div className="kpi-label">Planned %</div><div className="kpi-value">{agentAvg.planned.toFixed(1)}%</div></div>
          <div className="kpi-card"><div className="kpi-label">Unplanned %</div><div className="kpi-value tone-r">{agentAvg.unplanned.toFixed(1)}%</div></div>
          <div className="kpi-card"><div className="kpi-label">Total Outage %</div><div className="kpi-value">{agentAvgTotal.toFixed(1)}%</div></div>
        </div>
        <p style={{ fontSize: '.8125rem', color: 'var(--text-secondary)', margin: '12px 0' }}>
          {unplanned} of {total} agents are currently in an Unplanned Outage status. Planned% covers Scheduled Off time plus any scheduled breaks; Unplanned% covers unplanned outages only.
        </p>
        <div className="tw scroll">
          <table>
            <thead><tr><th style={{ textAlign: 'left' }}>Manager</th><th>Planned %</th><th>Unplanned %</th><th>Total %</th></tr></thead>
            <tbody>
              {managerRows.map((r) => (
                <tr key={r.manager}>
                  <td style={{ textAlign: 'left' }}>{r.manager}</td>
                  <td className={pctTone(r.planned)}>{r.planned.toFixed(1)}%</td>
                  <td className={pctTone(r.unplannedPct)}>{r.unplannedPct.toFixed(1)}%</td>
                  <td className={pctTone(r.total_pct)}>{r.total_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
