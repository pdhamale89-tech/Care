import InfoBtn from '../../../shared/components/InfoBtn.jsx'

function gapStatus(gap) {
  if (gap > 0) return { text: `Overstaffed by ${gap}`, tone: 'y', badge: 'warn' }
  if (gap < 0) return { text: `Understaffed by ${Math.abs(gap)}`, tone: 'r', badge: 'neg' }
  return { text: 'On Target', tone: 'g', badge: 'pos' }
}

export default function WhatIfHeadcountGap({ requiredHeadcount, currentHeadcount, gap, achieved }) {
  const status = gapStatus(gap)
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          Staffing Gap
          <InfoBtn tip="<strong>Purpose</strong>Required Headcount is computed live via the Erlang C staffing formula from Volume, Average Handle Time, Shrinkage % and Target Service Level. Assumes 24/7 coverage across 30-minute planning intervals — a scenario-planning simplification, not a shift-level schedule. Compared against the current Headcount scenario value to show the staffing gap." />
        </div>
      </div>
      <div className="kpi-grid cols-3">
        <div className="kpi-card">
          <div className="kpi-label">Required Headcount</div>
          <div className="kpi-value">{requiredHeadcount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Current Headcount</div>
          <div className="kpi-value">{currentHeadcount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Gap</div>
          <div className={'kpi-value tone-' + status.tone}>{gap > 0 ? '+' : ''}{gap}</div>
          <div className="kpi-sub"><span className={'badge ' + status.badge}>{status.text}</span></div>
        </div>
      </div>
      <div className="tw">
        <table>
          <thead>
            <tr><th>Achieved Service Level</th><th>Avg Speed of Answer</th><th>Occupancy</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>{(achieved.serviceLevel * 100).toFixed(1)}%</td>
              <td>{Number.isFinite(achieved.asaSeconds) ? achieved.asaSeconds.toFixed(0) + 's' : '—'}</td>
              <td>{(achieved.occupancy * 100).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
