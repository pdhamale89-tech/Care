import { barDataLabels, stackedBarDataLabels } from './datalabels.js'
import { getColors } from '../theme/colors.js'

const LEGEND_BOTTOM = { legend: { position: 'bottom' } }
const DEFAULT_COLORS = getColors('light')

export function issueTypeBarConfig(labels, actual, unit = '', colors = DEFAULT_COLORS) {
  return {
    data: {
      labels,
      datasets: [
        { label: 'Actual', data: actual, backgroundColor: colors.accentBlue, borderRadius: 4, datalabels: barDataLabels(unit, colors.accentBlue) },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: LEGEND_BOTTOM,
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
        y: { beginAtZero: true },
      },
    },
  }
}

export function stackedBarConfig(labels, datasets, unit = '') {
  return {
    data: {
      labels,
      datasets: datasets.map((d) => ({ ...d, datalabels: stackedBarDataLabels(unit) })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: LEGEND_BOTTOM,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    },
  }
}
