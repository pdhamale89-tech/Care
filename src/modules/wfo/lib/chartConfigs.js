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

// Dashed step connectors between waterfall bars — Chart.js has no built-in support
// for this (a native waterfall type would draw them automatically), so this plugin
// draws a horizontal dashed line at each step's running-total level, from the right
// edge of one bar to the left edge of the next, using the rendered bar geometry
// (chart.getDatasetMeta) so it stays correct across resizes/themes.
function waterfallConnectorPlugin(runningLevels, color) {
  return {
    id: 'waterfallConnectors',
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(1)
      const yScale = chart.scales.y
      if (!meta || !meta.data.length) return
      const { ctx } = chart
      ctx.save()
      ctx.strokeStyle = color
      ctx.setLineDash([4, 3])
      ctx.lineWidth = 1
      for (let i = 0; i < meta.data.length - 1; i++) {
        const barA = meta.data[i]
        const barB = meta.data[i + 1]
        const y = yScale.getPixelForValue(runningLevels[i])
        ctx.beginPath()
        ctx.moveTo(barA.x + barA.width / 2, y)
        ctx.lineTo(barB.x - barB.width / 2, y)
        ctx.stroke()
      }
      ctx.restore()
    },
  }
}

// Waterfall/bridge chart — Chart.js has no native waterfall type, so this builds one
// from a 2-dataset stacked bar: an invisible "base" segment plus a visible "value"
// segment floating on top of it. `steps` is ordered: { label, type: 'anchor' | 'delta', value }.
// An anchor (e.g. PLAN, ACTUAL) renders as a full bar from 0, in blue. A delta renders
// as a floating bar showing the signed change from the running total up to that point,
// colored green (increase) or red (decrease) so direction reads at a glance even when
// the segment itself is too thin to judge by height alone — dashed connectors (above)
// and the signed tooltip/label (below) reinforce the same reading.
export function waterfallConfig(steps, colors) {
  const labels = steps.map((s) => s.label)
  const baseData = []
  const valueData = []
  const displayValues = []
  const barColors = []
  const runningLevels = []
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
      barColors.push(s.value >= 0 ? colors.accentGreen : colors.accentRed)
    }
    runningLevels.push(running)
  })
  return {
    data: {
      labels,
      datasets: [
        { label: 'Base', data: baseData, backgroundColor: 'transparent', stack: 'wf', datalabels: { display: false } },
        { label: 'Value', data: valueData, backgroundColor: barColors, borderRadius: 2, stack: 'wf', displayValues, datalabels: waterfallDataLabels('%', colors.textPrimary) },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          // The invisible "Base" segment exists only to float the visible bar and has
          // no meaning of its own — never show it. The visible bar's plotted value is
          // always positive (it's a bar height), so swap in the true signed value.
          filter: (item) => item.datasetIndex === 1,
          callbacks: {
            label: (item) => {
              const dv = item.dataset.displayValues?.[item.dataIndex]
              return (dv === undefined ? item.formattedValue : (dv > 0 ? '+' : '') + dv) + '%'
            },
          },
        },
      },
      scales: {
        x: { stacked: true },
        // Headroom (grace) keeps the topmost bar's label clear of the card edge;
        // the axis itself is hidden since only the % labels above each bar matter here.
        y: { stacked: true, display: false, grace: '25%' },
      },
    },
    plugins: [waterfallConnectorPlugin(runningLevels, colors.textSecondary)],
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
