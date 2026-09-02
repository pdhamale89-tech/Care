import { useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { generateEpicenterRoster, fmt, EMP_STATUSES, matchesMulti, REGIONS } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels, hBarDataLabels, doughnutDataLabels } from '../../charts/datalabels.js'
import { stackedBarConfig } from '../../charts/chartConfigs.js'
import InfoBtn from '../common/InfoBtn.jsx'
import Modal from '../common/Modal.jsx'

const HIRE_YEARS = Array.from({ length: 7 }, (_, i) => 2018 + i)
const TENURE_BUCKETS = ['<1 yr', '1–2 yrs', '2–3 yrs', '3–5 yrs', '5+ yrs']
// "At risk" here means away from the floor and needing coverage, not performance risk.
const AT_RISK_STATUSES = ['Leave of Absence', 'Temporary Duty Assignment']

function tenureYears(hireDateStr, now) {
  return (now - new Date(hireDateStr)) / (365.25 * 24 * 3600 * 1000)
}

function tenureBucket(years) {
  if (years < 1) return TENURE_BUCKETS[0]
  if (years < 2) return TENURE_BUCKETS[1]
  if (years < 3) return TENURE_BUCKETS[2]
  if (years < 5) return TENURE_BUCKETS[3]
  return TENURE_BUCKETS[4]
}

function countBy(rows, key) {
  const map = new Map()
  rows.forEach((r) => map.set(r[key], (map.get(r[key]) || 0) + 1))
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

// Like countBy, but always includes every category in `categories` (in that
// order), zero-filling ones absent from `rows` so a rare category never drops.
function countByFixed(rows, key, categories) {
  const map = new Map(categories.map((c) => [c, 0]))
  rows.forEach((r) => map.set(r[key], (map.get(r[key]) || 0) + 1))
  return categories.map((c) => [c, map.get(c)])
}

function buildHBarChart(entries, color, textColor) {
  return {
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{ data: entries.map(([, v]) => v), backgroundColor: color, borderRadius: 4, barThickness: 14, datalabels: hBarDataLabels('', textColor) }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true }, y: { ticks: { font: { size: 10 } } } },
    },
  }
}

// Colors follow the entity (a status), never a rank, so a filter that drops a
// status never repaints the ones that remain.
function buildStatusChart(entries, statusColors, textColor) {
  return {
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(([k]) => statusColors[k]),
        borderRadius: 4,
        datalabels: barDataLabels('', textColor),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { font: { size: 9 }, maxRotation: 20, minRotation: 0 } }, y: { beginAtZero: true, grace: '10%' } },
    },
  }
}

// Injects a per-bar/slice click + hover-cursor handler into an existing chart
// config, so a single click on a specific mark can drill into just that data
// point. `onElementClick` receives the clicked element's {datasetIndex, index}.
function withDrillClick(config, onElementClick) {
  return {
    ...config,
    options: {
      ...config.options,
      onClick: (evt, elements) => {
        if (elements.length) onElementClick(elements[0])
      },
      onHover: (evt, elements) => {
        evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'
      },
    },
  }
}

// Same field set as Epicenter HC's Agent Roster table, plus the tenure/status
// columns this dashboard's drill-downs are keyed on.
const AGENT_DETAIL_COLS = [
  ['name', 'Name'], ['badgeId', 'Badge ID'], ['email', 'Email'], ['hireDate', 'Hire Date'],
  ['tenureBucket', 'Tenure'], ['weekEnding', 'Week Ending'], ['vendor', 'Vendor'], ['dbOsp', 'DB/OSP'],
  ['queue', 'Queue'], ['dept', 'Dept'], ['deptCode', 'Code'], ['manager', 'Manager'],
  ['businessUnit', 'Business Unit'], ['region', 'Region'], ['segment', 'Segment'], ['location', 'Location'],
  ['subQueueDesc', 'Sub Queue Description'], ['title', 'Title'], ['empStatus', 'Status'],
  ['ewfmDeptCode', 'EWFM Dept Code'], ['ewfmDeptName', 'EWFM Dept Name'],
  ['ewfmTeamCode', 'EWFM Team Code'], ['ewfmTeamName', 'EWFM Team Name'],
  ['acdExtension', 'ACD/Extension'], ['switchCode', 'Switch'],
]

function buildDoughnutChart(entries, categoryColors) {
  return {
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map((_, i) => categoryColors[i % categoryColors.length]),
        borderWidth: 0,
        datalabels: doughnutDataLabels(),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } },
    },
  }
}

export default function EpiHc() {
  const { theme, activeRegions, epicenterFilters } = useApp()
  const colors = getColors(theme)
  const now = useMemo(() => new Date(), [])
  const [agentDrill, setAgentDrill] = useState(null)

  const roster = useMemo(() => {
    const regions = activeRegions.includes('All') ? REGIONS : activeRegions
    return regions.flatMap((r) => generateEpicenterRoster(r))
  }, [activeRegions])

  const filtered = useMemo(() => roster.filter((a) => {
    if (!matchesMulti(epicenterFilters.weekEnding, a.weekEnding)) return false
    if (!matchesMulti(epicenterFilters.vendor, a.vendor)) return false
    if (!matchesMulti(epicenterFilters.manager, a.manager)) return false
    if (!matchesMulti(epicenterFilters.dbOsp, a.dbOsp)) return false
    return true
  }), [roster, epicenterFilters])

  // Derived, roster-grounded fields the old tab never surfaced visually —
  // hireDate only ever showed up as a raw table column.
  const enriched = useMemo(() => filtered.map((a) => ({
    ...a,
    hireYear: new Date(a.hireDate).getFullYear(),
    tenureBucket: tenureBucket(tenureYears(a.hireDate, now)),
  })), [filtered, now])

  const summary = useMemo(() => {
    const total = enriched.length
    const totalManagers = new Set(enriched.map((a) => a.manager)).size
    const ospCount = enriched.filter((a) => a.dbOsp === 'OSP').length
    const newHireCount = enriched.filter((a) => a.empStatus === 'New Hire').length
    const atRiskCount = enriched.filter((a) => AT_RISK_STATUSES.includes(a.empStatus)).length
    return {
      total,
      totalManagers,
      avgSpan: totalManagers ? total / totalManagers : 0,
      ospPct: total ? (ospCount / total) * 100 : 0,
      newHirePct: total ? (newHireCount / total) * 100 : 0,
      atRiskPct: total ? (atRiskCount / total) * 100 : 0,
    }
  }, [enriched])

  const statusColors = useMemo(() => ({
    Normal: colors.accentGreen,
    'New Hire': colors.accentBlue,
    'Work From Home': colors.accentPurple,
    'Temporary Duty Assignment': colors.accentOrange,
    'Leave of Absence': colors.accentRed,
  }), [colors])

  function drillTo(title, rows) {
    setAgentDrill({ title: `${title} (${rows.length})`, rows })
  }

  // Two dimensions per chart (a category × a cross-cut), not a flat single-series
  // count — e.g. tenure composition split by sourcing, not just tenure alone.
  // Every chart below is also click-to-drill: clicking a bar/slice opens the
  // matching agents in the shared Agent Details modal.
  const hiresByYearChart = useMemo(() => {
    const agent = HIRE_YEARS.map((y) => enriched.filter((a) => a.hireYear === y && a.title === 'Agent').length)
    const nonAgent = HIRE_YEARS.map((y) => enriched.filter((a) => a.hireYear === y && a.title !== 'Agent').length)
    const base = stackedBarConfig(HIRE_YEARS.map(String), [
      { label: 'Agent', data: agent, backgroundColor: colors.accentBlue },
      { label: 'Non-Agent', data: nonAgent, backgroundColor: colors.accentPurple },
    ])
    return withDrillClick(base, ({ datasetIndex, index }) => {
      const year = HIRE_YEARS[index]
      const isAgent = datasetIndex === 0
      drillTo(`Hired ${year} — ${isAgent ? 'Agent' : 'Non-Agent'}`, enriched.filter((a) => a.hireYear === year && (isAgent ? a.title === 'Agent' : a.title !== 'Agent')))
    })
  }, [enriched, colors])

  const tenureChart = useMemo(() => {
    const db = TENURE_BUCKETS.map((b) => enriched.filter((a) => a.tenureBucket === b && a.dbOsp === 'DB').length)
    const osp = TENURE_BUCKETS.map((b) => enriched.filter((a) => a.tenureBucket === b && a.dbOsp === 'OSP').length)
    const base = stackedBarConfig(TENURE_BUCKETS, [
      { label: 'DB', data: db, backgroundColor: colors.accentBlue },
      { label: 'OSP', data: osp, backgroundColor: colors.accentOrange },
    ])
    return withDrillClick(base, ({ datasetIndex, index }) => {
      const bucket = TENURE_BUCKETS[index]
      const source = datasetIndex === 0 ? 'DB' : 'OSP'
      drillTo(`${bucket} tenure — ${source}`, enriched.filter((a) => a.tenureBucket === bucket && a.dbOsp === source))
    })
  }, [enriched, colors])

  const sourcingChart = useMemo(() => {
    const base = buildDoughnutChart(countByFixed(enriched, 'dbOsp', ['DB', 'OSP']), [colors.accentBlue, colors.accentOrange])
    return withDrillClick(base, ({ index }) => {
      const source = index === 0 ? 'DB' : 'OSP'
      drillTo(source, enriched.filter((a) => a.dbOsp === source))
    })
  }, [enriched, colors])

  const ospVendorEntries = useMemo(() => countBy(enriched.filter((a) => a.dbOsp === 'OSP'), 'vendor'), [enriched])
  const vendorChart = useMemo(
    () => withDrillClick(buildHBarChart(ospVendorEntries, colors.accentOrange, colors.textPrimary), ({ index }) => {
      const vendor = ospVendorEntries[index][0]
      drillTo(`Vendor: ${vendor}`, enriched.filter((a) => a.dbOsp === 'OSP' && a.vendor === vendor))
    }),
    [enriched, ospVendorEntries, colors],
  )

  const managerEntries = useMemo(() => countBy(enriched, 'manager'), [enriched])
  const spanChart = useMemo(
    () => withDrillClick(buildHBarChart(managerEntries, colors.accentBlue, colors.textPrimary), ({ index }) => {
      const manager = managerEntries[index][0]
      drillTo(`${manager} — Team`, enriched.filter((a) => a.manager === manager))
    }),
    [enriched, colors, managerEntries],
  )
  const statusChart = useMemo(
    () => withDrillClick(buildStatusChart(countByFixed(enriched, 'empStatus', EMP_STATUSES), statusColors, colors.textPrimary), ({ index }) => {
      const status = EMP_STATUSES[index]
      drillTo(status, enriched.filter((a) => a.empStatus === status))
    }),
    [enriched, statusColors, colors],
  )

  const topLocations = useMemo(() => countBy(enriched, 'location').slice(0, 8).map(([k]) => k), [enriched])
  const locationChart = useMemo(() => {
    const db = topLocations.map((l) => enriched.filter((a) => a.location === l && a.dbOsp === 'DB').length)
    const osp = topLocations.map((l) => enriched.filter((a) => a.location === l && a.dbOsp === 'OSP').length)
    const base = stackedBarConfig(topLocations, [
      { label: 'DB', data: db, backgroundColor: colors.accentBlue },
      { label: 'OSP', data: osp, backgroundColor: colors.accentOrange },
    ])
    return withDrillClick(base, ({ datasetIndex, index }) => {
      const location = topLocations[index]
      const source = datasetIndex === 0 ? 'DB' : 'OSP'
      drillTo(`${location} — ${source}`, enriched.filter((a) => a.location === location && a.dbOsp === source))
    })
  }, [enriched, topLocations, colors])

  return (
    <div className="tab-panel active">
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        ⚠️ All data shown is randomly generated placeholder data for demonstration purposes only. No real employee or
        personal information is used. Email domain (@example-demo.test) is a reserved test domain.
      </div>

      <div className="ai-story">
        <div className="ai-icon-box">👥</div>
        <div>
          <div className="ai-story-title">Workforce Snapshot</div>
          <div className="ai-story-text">
            <strong>{fmt(summary.total)} TSEs</strong> across <strong>{fmt(summary.totalManagers)} managers</strong> —
            an average span of control of <strong>{fmt(summary.avgSpan)}</strong> direct reports. <strong>{fmt(summary.ospPct)}%</strong> of
            the team is outsourced (OSP). <strong>{fmt(summary.newHirePct)}%</strong> are new hires still ramping, and{' '}
            <strong>{fmt(summary.atRiskPct)}%</strong> are currently on leave or temporary duty and off the floor.
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>Team Summary</h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Headcount</div>
          <div className="kpi-value">{fmt(summary.total)}</div>
          <div className="kpi-sub">{fmt(summary.totalManagers)} managers</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Span of Control</div>
          <div className="kpi-value">{fmt(summary.avgSpan)}</div>
          <div className="kpi-sub">Direct reports per manager</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">OSP Share</div>
          <div className="kpi-value">{fmt(summary.ospPct)}%</div>
          <div className="kpi-sub">Outsourced vs internal (DB)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">New Hire Rate</div>
          <div className="kpi-value">{fmt(summary.newHirePct)}%</div>
          <div className="kpi-sub">Still ramping</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">At-Risk / Off-Floor</div>
          <div className="kpi-value">{fmt(summary.atRiskPct)}%</div>
          <div className="kpi-sub">Leave of Absence + Temp Duty</div>
        </div>
      </div>

      <div className="section-div">
        <h2>Growth &amp; Tenure</h2>
      </div>
      <div className="s-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              New Hires by Year <InfoBtn tip="<strong>Purpose</strong>Headcount added by hire year, split Agent vs Non-Agent (Manager/Coach/etc.) — where the team's growth has come from, and whether leadership grew with it." />
            </div>
          </div>
          <div className="chart-container">
            <Bar data={hiresByYearChart.data} options={hiresByYearChart.options} />
          </div>
          <div className="mc-drill-hint">Click a segment for agent details ▸</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Tenure Distribution <InfoBtn tip="<strong>Purpose</strong>Current headcount by tenure, split DB vs OSP. A team weighted toward &lt;1 yr carries more ramp and retention risk — compare which sourcing type churns faster." />
            </div>
          </div>
          <div className="chart-container">
            <Bar data={tenureChart.data} options={tenureChart.options} />
          </div>
          <div className="mc-drill-hint">Click a segment for agent details ▸</div>
        </div>
      </div>

      <div className="section-div">
        <h2>Sourcing Mix</h2>
      </div>
      <div className="s-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              DB vs OSP <InfoBtn tip="<strong>Purpose</strong>Internal (DB) vs outsourced (OSP) headcount split for the filtered team." />
            </div>
          </div>
          <div className="chart-container">
            <Doughnut data={sourcingChart.data} options={sourcingChart.options} />
          </div>
          <div className="mc-drill-hint">Click a slice for agent details ▸</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              OSP Headcount by Vendor <InfoBtn tip="<strong>Purpose</strong>Outsourced headcount split by vendor — concentration risk if one vendor carries most of the OSP volume." />
            </div>
          </div>
          <div className="chart-container">
            <Bar data={vendorChart.data} options={vendorChart.options} />
          </div>
          <div className="mc-drill-hint">Click a bar for agent details ▸</div>
        </div>
      </div>

      <div className="section-div">
        <h2>Span of Control &amp; Status</h2>
      </div>
      <div className="s-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Span of Control by Manager <InfoBtn tip="<strong>Purpose</strong>Direct reports per manager. A span well outside the team's average may mean a manager is over- or under-loaded. Click a bar for that manager's team." />
            </div>
          </div>
          <div className="chart-container">
            <Bar data={spanChart.data} options={spanChart.options} />
          </div>
          <div className="mc-drill-hint">Click a bar for that manager's team ▸</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Employee Status <InfoBtn tip="<strong>Purpose</strong>Current status mix. Leave of Absence and Temporary Duty Assignment are colored as at-risk/off-floor time. Click a bar to see who's in that status." />
            </div>
          </div>
          <div className="chart-container">
            <Bar data={statusChart.data} options={statusChart.options} />
          </div>
          <div className="mc-drill-hint">Click a bar to see who's in that status ▸</div>
        </div>
      </div>

      <Modal
        open={!!agentDrill}
        onClose={() => setAgentDrill(null)}
        title={agentDrill && `Agent Details — ${agentDrill.title}`}
      >
        <div className="tw scroll">
          <table>
            <thead>
              <tr>{AGENT_DETAIL_COLS.map(([, label]) => <th key={label}>{label}</th>)}</tr>
            </thead>
            <tbody>
              {agentDrill && agentDrill.rows.map((a) => (
                <tr key={a.badgeId}>
                  {AGENT_DETAIL_COLS.map(([key]) => <td key={key}>{a[key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <div className="section-div">
        <h2>Geographic Distribution</h2>
      </div>
      <div className="s-grid full">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Headcount by Location <InfoBtn tip="<strong>Purpose</strong>Headcount by work location (top 8), split DB vs OSP — which sites are internally staffed vs outsourced." />
            </div>
          </div>
          <div className="chart-container">
            <Bar data={locationChart.data} options={locationChart.options} />
          </div>
          <div className="mc-drill-hint">Click a segment for agent details ▸</div>
        </div>
      </div>
    </div>
  )
}
