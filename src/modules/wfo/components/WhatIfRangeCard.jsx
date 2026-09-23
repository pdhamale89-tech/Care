import { Bar } from 'react-chartjs-2'
import { rangeBarConfig } from '../lib/chartConfigs.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'

export default function WhatIfRangeCard({ rows, colors }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          Best / Likely / Worst
          <InfoBtn tip="<strong>Purpose</strong>A 3-point range around the current scenario: Worst case swings Volume/AHT/Shrinkage unfavorably, Best case swings them favorably (fixed tuning assumptions, not a statistical forecast). The tick mark on each bar is today's live scenario (Likely). Each row uses its own scale since Required Headcount and Service Level % have very different magnitudes." />
        </div>
      </div>
      {rows.map((r) => {
        const chart = rangeBarConfig(
          [{ label: r.label, low: Math.min(r.worst, r.best), high: Math.max(r.worst, r.best), marker: r.likely, unit: r.unit }],
          colors,
          { barColor: colors.accentPurple, markerColor: colors.accentOrange },
        )
        return (
          <div key={r.key} className="chart-container" style={{ height: 90 }}>
            <Bar data={chart.data} options={chart.options} plugins={chart.plugins} />
          </div>
        )
      })}
      <div className="kpi-sub">Bar = Best ↔ Worst range &nbsp;·&nbsp; Tick = Likely (live scenario)</div>
    </div>
  )
}
