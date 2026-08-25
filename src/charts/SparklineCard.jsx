import { Line } from 'react-chartjs-2'
import { fmt } from '../data/mockGenerators.js'

export default function SparklineCard({ title, unit, series }) {
  const latest = series[series.length - 1]
  const trendColor = latest >= series[0] ? '#1E8E3E' : '#D93025'

  const data = {
    labels: series.map((_, i) => i),
    datasets: [
      {
        data: series,
        borderColor: trendColor,
        backgroundColor: trendColor + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
  }

  return (
    <div className="kpi-mini-card">
      <div className="kpi-mini-title">{title}</div>
      <div className="kpi-mini-value">{fmt(latest)}{unit}</div>
      <div style={{ height: 40 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
