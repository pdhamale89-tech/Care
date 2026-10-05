import { useEffect, useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { useApp } from '../../../core/hooks/useApp.js'
import { getColors } from '../../../shared/themes/colors.js'
import { getDeviceSessions } from '../../../core/utils/sessionTracker.js'
import {
  MOCK_SESSIONS, MOCK_EXPORT_LOG, buildDailyActiveUsers, buildMostViewedTabs,
  buildTopUsersByTime, usageKpis, fmtDuration, fmtDateTime,
} from '../lib/userUsageData.js'
import { barDataLabels, hBarDataLabels } from '../lib/datalabels.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'

function liveClock(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export default function UserUsage() {
  const { theme, session, exportLog } = useApp()
  const colors = getColors(theme)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const deviceSessions = useMemo(() => getDeviceSessions(), [])
  const liveDurationMs = now - session.openedAt

  const dau = useMemo(() => buildDailyActiveUsers(14), [])
  const topTabs = useMemo(() => buildMostViewedTabs(), [])
  const topUsers = useMemo(() => buildTopUsersByTime(6), [])
  const kpis = useMemo(() => usageKpis(), [])

  // Your real export clicks merged with the simulated org-wide log, most recent first —
  // this is the unified "who exported what, from where, and when" trail.
  const combinedExportLog = useMemo(() => {
    const mine = exportLog.map((e) => ({ id: e.id, user: 'You (this device)', ip: '—', source: e.source, fileType: 'CSV', at: e.at, live: true }))
    return [...mine, ...MOCK_EXPORT_LOG].sort((a, b) => b.at - a.at).slice(0, 40)
  }, [exportLog])

  const barOpt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grace: '10%' } } }

  return (
    <div className="tab-panel active">
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        ⚠️ No backend or authentication exists behind this dashboard, so there is no way to genuinely observe other visitors. Everything below except your own live session (card at top) and your own export clicks is simulated, representative placeholder data — not real employee or usage information.
      </div>

      <div className="section-div" style={{ marginTop: 0 }}>
        <h2>Your Session <InfoBtn tip="<strong>Real, this device only</strong>Open time and running duration are captured live in your browser. Closed-session history below persists locally (this device/browser only) across visits — nothing is sent to a server." /></h2>
      </div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="dot dot-g dot-live" />
            <span className="status-pill available">Active Now</span>
            <span style={{ fontSize: '.8125rem', color: 'var(--text-secondary)' }}>Opened {fmtDateTime(session.openedAt)}</span>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            <div>
              <div className="kpi-label">Time on dashboard</div>
              <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{liveClock(liveDurationMs)}</div>
            </div>
            <div>
              <div className="kpi-label">Exports this session</div>
              <div className="kpi-value">{exportLog.length}</div>
            </div>
          </div>
        </div>
      </div>

      {deviceSessions.length > 1 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-header"><div className="card-title">Your Device History</div></div>
          <div className="tw">
            <table>
              <thead><tr><th style={{ textAlign: 'left' }}>Opened</th><th style={{ textAlign: 'left' }}>Closed</th><th>Duration</th></tr></thead>
              <tbody>
                {deviceSessions.slice().reverse().filter((s) => s.id !== session.id).slice(0, 8).map((s) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'left' }}>{fmtDateTime(s.openedAt)}</td>
                    <td style={{ textAlign: 'left' }}>{s.closedAt ? fmtDateTime(s.closedAt) : '—'}</td>
                    <td>{fmtDuration(((s.closedAt || s.openedAt) - s.openedAt) / 60000)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="section-div">
        <h2>Organization Usage <InfoBtn tip="<strong>Simulated</strong>Representative placeholder data across a sample set of users and the last 14 days, shaped the same way every other tab's mock data in this app is generated." /></h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Active Users (14d)</div><div className="kpi-value">{kpis.uniqueUsers}</div></div>
        <div className="kpi-card"><div className="kpi-label">Avg Session Duration</div><div className="kpi-value">{fmtDuration(kpis.avgDurationMin)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Sessions (7d)</div><div className="kpi-value">{kpis.sessionsThisWeek}</div></div>
        <div className="kpi-card"><div className="kpi-label">Exports (7d)</div><div className="kpi-value">{kpis.exportsThisWeek}</div></div>
      </div>

      <div className="s-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">Daily Active Users</div></div>
          <div className="chart-container">
            <Line
              data={{
                labels: dau.labels,
                datasets: [{ data: dau.counts, borderColor: colors.accentBlue, backgroundColor: colors.accentBlue, tension: .3, borderWidth: 2, pointRadius: 3, fill: false, datalabels: barDataLabels('', colors.accentBlue) }],
              }}
              options={barOpt}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Most Viewed Tabs</div></div>
          <div className="chart-container">
            <Bar
              data={{
                labels: topTabs.map((t) => t.label),
                datasets: [{ data: topTabs.map((t) => t.count), backgroundColor: colors.accentPurple, borderRadius: 4, barThickness: 16, datalabels: hBarDataLabels('', colors.accentPurple) }],
              }}
              options={{ ...barOpt, indexAxis: 'y', scales: { x: { beginAtZero: true, grace: '15%', grid: { display: false } }, y: { ticks: { font: { size: 10 } } } } }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
        <div className="card-header"><div className="card-title">Top Users by Time Spent (14d)</div></div>
        <div className="tw">
          <table>
            <thead><tr><th style={{ textAlign: 'left' }}>User</th><th style={{ textAlign: 'left' }}>Role</th><th>Total Time</th></tr></thead>
            <tbody>
              {topUsers.map((u) => {
                const role = MOCK_SESSIONS.find((s) => s.user === u.user)?.role || ''
                return (
                  <tr key={u.user}>
                    <td style={{ textAlign: 'left' }}>{u.user}</td>
                    <td style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>{role}</td>
                    <td><strong>{fmtDuration(u.minutes)}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-div">
        <h2>Recent Sessions</h2>
      </div>
      <div className="card" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>User</th><th style={{ textAlign: 'left' }}>IP Address</th><th style={{ textAlign: 'left' }}>Page</th>
                <th style={{ textAlign: 'left' }}>Opened</th><th style={{ textAlign: 'left' }}>Closed</th><th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SESSIONS.slice(0, 20).map((s) => (
                <tr key={s.id}>
                  <td style={{ textAlign: 'left' }}>{s.user}</td>
                  <td style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>{s.ip}</td>
                  <td style={{ textAlign: 'left' }}><span className="pill-tag">{s.tab}</span></td>
                  <td style={{ textAlign: 'left' }}>{fmtDateTime(s.openedAt)}</td>
                  <td style={{ textAlign: 'left' }}>{fmtDateTime(s.closedAt)}</td>
                  <td>{fmtDuration(s.durationMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-div">
        <h2>Data Export Audit Log <InfoBtn tip="<strong>Mixed</strong>Rows marked 'You (this device)' are real — logged the moment you click any Export/Download button in this app. Every other row is simulated placeholder data." /></h2>
      </div>
      <div className="card">
        <div className="tw">
          <table>
            <thead>
              <tr><th style={{ textAlign: 'left' }}>User</th><th style={{ textAlign: 'left' }}>Exported From</th><th>File Type</th><th style={{ textAlign: 'left' }}>Date &amp; Time</th></tr>
            </thead>
            <tbody>
              {combinedExportLog.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No exports yet.</td></tr>
              )}
              {combinedExportLog.map((e) => (
                <tr key={e.id}>
                  <td style={{ textAlign: 'left' }}>
                    {e.live ? <span className="status-pill available">{e.user}</span> : e.user}
                  </td>
                  <td style={{ textAlign: 'left' }}>{e.source}</td>
                  <td>{e.fileType}</td>
                  <td style={{ textAlign: 'left' }}>{fmtDateTime(e.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
