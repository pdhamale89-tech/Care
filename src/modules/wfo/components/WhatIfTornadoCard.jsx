import { Bar } from 'react-chartjs-2'
import { rangeBarConfig } from '../lib/chartConfigs.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'

export default function WhatIfTornadoCard({ rows, colors }) {
  const chart = rangeBarConfig(
    rows.map((r) => ({ ...r, unit: ' HC' })),
    colors,
    { barColor: colors.accentBlue },
  )
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          Sensitivity
          <InfoBtn tip="<strong>Purpose</strong>Shows how much Required Headcount moves when each input is independently nudged ±10% (±5pp for Shrinkage/Target SL), holding everything else at its current scenario value. Ranked by impact size — the biggest lever on staffing needs sits on top." />
        </div>
      </div>
      <div className="chart-container" style={{ height: 220 }}>
        <Bar data={chart.data} options={chart.options} plugins={chart.plugins} />
      </div>
    </div>
  )
}
