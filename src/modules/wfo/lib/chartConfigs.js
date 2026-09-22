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
        // Grace headroom keeps the tallest bar's data label clear of the card edge.
        // Horizontal gridlines off — only the vertical (x-axis) lines are kept.
        y: { beginAtZero: true, grace: '15%', grid: { display: false } },
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
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, grace: '15%', grid: { display: false } } },
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
        x: { stacked: true },
        // Headroom (grace) keeps the topmost bar's label clear of the card edge;
        // the axis itself is hidden since only the % labels above each bar matter here.
        y: { stacked: true, display: false, grace: '25%' },
      },
    },
  }
}

// Shades the chart area behind the weeks already completed (index 0..splitIndex-1)
// vs the remaining/projected weeks, so a trend chart visually separates actuals-so-far
// from forecast. Drawn in beforeDraw so the grid lines still render on top of the tint.
function pastWeeksShadingPlugin(splitIndex, color = 'rgba(16,185,129,.14)') {
  return {
    id: 'pastWeeksShading',
    beforeDraw(chart) {
      const { ctx, chartArea, scales } = chart
      if (!chartArea || !splitIndex || splitIndex <= 0) return
      const xScale = scales.x
      const step = xScale.getPixelForTick(1) - xScale.getPixelForTick(0)
      const left = xScale.getPixelForTick(0) - step / 2
      const right = xScale.getPixelForTick(Math.min(splitIndex, xScale.ticks.length) - 1) + step / 2
      ctx.save()
      ctx.fillStyle = color
      ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top)
      ctx.restore()
    },
  }
}

// Weekly trend line chart (Total Orders / Case Rate / Cases Completed pattern):
// CAPACITY vs an actual-so-far/projection line, plus an optional dashed TARGET line.
export function trendLineConfig(weeks, series, colors, opts = {}) {
  const { unit = '', splitIndex = 6, actualLabel = 'ACTUAL/OUTLOOK' } = opts
  const datasets = [
    {
      type: 'line', label: 'CAPACITY', data: series.capacity,
      borderColor: colors.accentBlue, backgroundColor: colors.accentBlue,
      tension: 0.3, pointRadius: 3, borderWidth: 2,
    },
    {
      type: 'line', label: actualLabel, data: series.actual,
      borderColor: colors.accentOrange, backgroundColor: colors.accentOrange,
      tension: 0.3, pointRadius: 3, borderWidth: 2,
    },
  ]
  if (series.target) {
    datasets.push({
      type: 'line', label: 'TARGET', data: series.target,
      borderColor: colors.textPrimary, backgroundColor: colors.textPrimary,
      borderDash: [6, 4], tension: 0.3, pointRadius: 0, borderWidth: 2,
    })
  }
  return {
    data: { labels: weeks, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', align: 'center', labels: { boxWidth: 10, font: { size: 10 } } } },
      scales: {
        x: {},
        y: { beginAtZero: true, ticks: unit ? { callback: (v) => v + unit } : undefined, grid: { display: false } },
      },
    },
    plugins: [pastWeeksShadingPlugin(splitIndex)],
  }
}
