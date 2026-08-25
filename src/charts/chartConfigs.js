import { barDataLabels, lineDataLabels, stackedBarDataLabels } from './datalabels.js'
import { getColors } from '../theme/colors.js'

const LEGEND_BOTTOM = { legend: { position: 'bottom' } }
const DEFAULT_COLORS = getColors('light')

export function issueComboConfig(labels, actual, forecast, variance, unit = '', colors = DEFAULT_COLORS) {
  return {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Actual', data: actual, backgroundColor: colors.accentBlue, datalabels: barDataLabels(unit, colors.accentBlue) },
        { type: 'bar', label: 'Forecast', data: forecast, backgroundColor: colors.border, datalabels: barDataLabels(unit, colors.textSecondary) },
        { type: 'line', label: 'Variance', data: variance, borderColor: colors.accentRed, yAxisID: 'y1', tension: 0.3, datalabels: lineDataLabels(unit, colors.accentRed) },
      ],
    },
    options: {
      responsive: true,
      plugins: LEGEND_BOTTOM,
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
        y: { beginAtZero: true },
        y1: { position: 'right', grid: { drawOnChartArea: false } },
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
      plugins: LEGEND_BOTTOM,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    },
  }
}
