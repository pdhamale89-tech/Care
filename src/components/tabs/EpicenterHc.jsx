import { useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { generateEpicenterRoster, fmt, EMP_STATUSES, SEGMENTS } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels, hBarDataLabels, doughnutDataLabels } from '../../charts/datalabels.js'
import DownloadBtn from '../common/DownloadBtn.jsx'

function countBy(rows, key) {
  const map = new Map()
  rows.forEach((r) => map.set(r[key], (map.get(r[key]) || 0) + 1))
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

// Like countBy, but always includes every category in `categories`, zero-filling
// ones absent from `rows` (order preserved) so a rare category never drops its bar.
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

function buildVBarChart(entries, color, textColor) {
  return {
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{ data: entries.map(([, v]) => v), backgroundColor: color, borderRadius: 4, datalabels: barDataLabels('', textColor) }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { font: { size: 9 }, maxRotation: 20, minRotation: 0 } }, y: { beginAtZero: true } },
    },
  }
}

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

export default function EpicenterHc() {
  const { theme, activeRegion, epicenterFilters } = useApp()
  const colors = getColors(theme)
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

  const categoryColors = useMemo(
    () => [colors.accentBlue, colors.accentGreen, colors.accentOrange, colors.accentRed, colors.accentPurple],
    [colors],
  )

  const titleChart = useMemo(() => buildDoughnutChart(countBy(filtered, 'title'), categoryColors), [filtered, categoryColors])
  const segmentChart = useMemo(() => buildHBarChart(countByFixed(filtered, 'segment', SEGMENTS), colors.accentBlue, colors.textPrimary), [filtered, colors])
  const managerChart = useMemo(() => buildHBarChart(countBy(filtered, 'manager'), colors.accentBlue, colors.textPrimary), [filtered, colors])
  const statusChart = useMemo(() => buildVBarChart(countByFixed(filtered, 'empStatus', EMP_STATUSES), colors.accentBlue, colors.textPrimary), [filtered, colors])
  const locationChart = useMemo(() => buildHBarChart(countBy(filtered, 'location'), colors.accentBlue, colors.textPrimary), [filtered, colors])

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
        <h2>Employee Distribution</h2>
      </div>
      <div className="s-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">Title wise Employee Count</div></div>
          <div className="chart-container">
            <Doughnut data={titleChart.data} options={titleChart.options} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Segment wise Employee Count</div></div>
          <div className="chart-container">
            <Bar data={segmentChart.data} options={segmentChart.options} />
          </div>
        </div>
      </div>
      <div className="s-grid thirds">
        <div className="card">
          <div className="card-header"><div className="card-title">Manager wise Employee Count</div></div>
          <div className="chart-container">
            <Bar data={managerChart.data} options={managerChart.options} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Status wise Employee Count</div></div>
          <div className="chart-container">
            <Bar data={statusChart.data} options={statusChart.options} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Location wise Employee Count</div></div>
          <div className="chart-container">
            <Bar data={locationChart.data} options={locationChart.options} />
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>Agent Roster</h2>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title"></div>
          <DownloadBtn
            filename="epicenter-roster"
            rows={[
              [
                'Name', 'Badge ID', 'Email', 'Hire Date', 'Week Ending', 'Vendor', 'DB/OSP', 'Queue', 'Dept', 'Code', 'Manager',
                'Business Unit', 'Region', 'Segment', 'Location', 'Sub Queue Description', 'Title',
                'EWFM Dept Code', 'EWFM Dept Name', 'EWFM Team Code', 'EWFM Team Name', 'ACD/Extension', 'Switch',
              ],
              ...filtered.map((a) => [
                a.name, a.badgeId, a.email, a.hireDate, a.weekEnding, a.vendor, a.dbOsp, a.queue, a.dept, a.deptCode, a.manager,
                a.businessUnit, a.region, a.segment, a.location, a.subQueueDesc, a.title,
                a.ewfmDeptCode, a.ewfmDeptName, a.ewfmTeamCode, a.ewfmTeamName, a.acdExtension, a.switchCode,
              ]),
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
                <th>Business Unit</th><th>Region</th><th>Segment</th><th>Location</th>
                <th>Sub Queue Description</th><th>Title</th>
                <th>EWFM Dept Code</th><th>EWFM Dept Name</th>
                <th>EWFM Team Code</th><th>EWFM Team Name</th>
                <th>ACD/Extension</th><th>Switch</th>
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
                  <td>{a.businessUnit}</td>
                  <td>{a.region}</td>
                  <td>{a.segment}</td>
                  <td>{a.location}</td>
                  <td>{a.subQueueDesc}</td>
                  <td>{a.title}</td>
                  <td>{a.ewfmDeptCode}</td>
                  <td>{a.ewfmDeptName}</td>
                  <td>{a.ewfmTeamCode}</td>
                  <td>{a.ewfmTeamName}</td>
                  <td>{a.acdExtension}</td>
                  <td>{a.switchCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
