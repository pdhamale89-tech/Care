import { Doughnut } from 'react-chartjs-2'
import { fmt } from '../data/mockGenerators.js'

export default function SlaGaugeChart({ actual, target }) {
  const remaining = Math.max(0, 100 - actual)

  const data = {
    labels: ['Achieved', 'Gap to 100%'],
    datasets: [
      {
        data: [actual, remaining],
        backgroundColor: [actual >= target ? '#1E8E3E' : '#0076CE', '#EDEFF2'],
        borderWidth: 0,
        circumference: 270,
        rotation: 225,
        cutout: '75%',
      },
    ],
  }

  const options = { plugins: { legend: { display: false }, tooltip: { enabled: false } } }

  const gaugeTextPlugin = {
    id: 'gaugeText',
    afterDraw(chart) {
      const { ctx, chartArea: { width, height, top, left } } = chart
      ctx.save()
      ctx.font = 'bold 28px Roboto Flex, Segoe UI'
      ctx.fillStyle = '#2B2E34'
      ctx.textAlign = 'center'
      ctx.fillText(fmt(actual) + '%', left + width / 2, top + height / 2)
      ctx.font = '12px Roboto Flex, Segoe UI'
      ctx.fillStyle = '#5A5F68'
      ctx.fillText('Target: ' + target + '%', left + width / 2, top + height / 2 + 22)
      ctx.restore()
    },
  }

  return <Doughnut data={data} options={options} plugins={[gaugeTextPlugin]} />
}
