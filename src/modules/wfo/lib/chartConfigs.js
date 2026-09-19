import { barDataLabels, stackedBarDataLabels, waterfallDataLabels } from './datalabels.js'
import { getColors } from '../../../shared/themes/colors.js'

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

// Waterfall/bridge chart — Chart.js has no native waterfall type, so this builds one
// from a 2-dataset stacked bar: an invisible "base" segment plus a visible "value"
// segment floating on top of it. `steps` is ordered: { label, type: 'anchor' | 'delta', value }.
// An anchor (e.g. PLAN, ACTUAL) renders as a full bar from 0; a delta renders as a
// floating bar showing the signed change from the running total up to that point.
export function waterfallConfig(steps, colors) {
  const labels = steps.map((s) => s.label)
  const baseData = []
  const valueData = []
  const displayValues = []
  const barColors = []
  let running = 0
  steps.forEach((s) => {
    if (s.type === 'anchor') {
      baseData.push(0)
      valueData.push(s.value)
      displayValues.push(Math.round(s.value))
      barColors.push(colors.accentBlue)
      running = s.value
    } else {
      const prev = running
      running += s.value
      baseData.push(Math.min(prev, running))
      valueData.push(Math.abs(s.value))
      displayValues.push(Math.round(s.value))
      barColors.push(colors.accentBlue + '70')
    }
  })
  return {
    data: {
      labels,
      datasets: [
        { data: baseData, backgroundColor: 'transparent', stack: 'wf', datalabels: { display: false } },
        { data: valueData, backgroundColor: barColors, borderRadius: 2, stack: 'wf', displayValues, datalabels: waterfallDataLabels('%', colors.textPrimary) },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        // Headroom (grace) keeps the topmost bar's label clear of the card edge;
        // the axis itself is hidden since only the % labels above each bar matter here.
        y: { stacked: true, display: false, grace: '25%' },
      },
    },
  }
}
