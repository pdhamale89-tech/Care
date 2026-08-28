import { fmt } from '../data/mockGenerators.js'

const LABEL_FONT = { size: 9, weight: 600 }

function fmtOrEmpty(v, unit) {
  return v === null || v === undefined ? '' : fmt(v) + unit
}

// Bar series: label above each bar. `display: 'auto'` lets Chart.js hide
// labels that would collide as bars get narrower (more categories / smaller card).
export function barDataLabels(unit = '', color = '#2B2E34') {
  return {
    display: 'auto',
    anchor: 'end',
    align: 'top',
    clamp: true,
    font: LABEL_FONT,
    color,
    formatter: (v) => fmtOrEmpty(v, unit),
  }
}

// Horizontal bar series: label just past the end of each bar.
export function hBarDataLabels(unit = '', color = '#2B2E34') {
  return {
    display: 'auto',
    anchor: 'end',
    align: 'end',
    clamp: true,
    font: LABEL_FONT,
    color,
    formatter: (v) => fmtOrEmpty(v, unit),
  }
}

// Doughnut/pie slices: percentage of the whole, hidden on slivers too thin to read.
export function doughnutDataLabels() {
  return {
    display: (ctx) => {
      const data = ctx.dataset.data
      const total = data.reduce((a, b) => a + b, 0)
      return total && data[ctx.dataIndex] / total >= 0.03 ? 'auto' : false
    },
    color: '#fff',
    font: { size: 10, weight: 700 },
    formatter: (v, ctx) => {
      const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
      return total ? ((v / total) * 100).toFixed(1) + '%' : ''
    },
  }
}

// Line series: label above each point, same auto-collision handling.
export function lineDataLabels(unit = '', color) {
  return {
    display: 'auto',
    align: 'top',
    offset: 6,
    clamp: true,
    font: LABEL_FONT,
    color: color ?? ((ctx) => ctx.dataset.borderColor),
    formatter: (v) => fmtOrEmpty(v, unit),
  }
}

// Dense line series (many close-together points, e.g. a trend line sharing a chart
// with bars): label only the last point instead of every point, so labels never
// pile up on each other. The full series is still readable via hover/tooltip.
export function lineEndDataLabels(unit = '', color) {
  return {
    display: (ctx) => ctx.dataIndex === ctx.dataset.data.length - 1,
    align: 'top',
    offset: 6,
    clamp: true,
    font: LABEL_FONT,
    color: color ?? ((ctx) => ctx.dataset.borderColor),
    formatter: (v) => fmtOrEmpty(v, unit),
  }
}

// Stacked bar segments: centered, white text, hidden for zero/empty segments
// so thin slivers don't get an unreadable overlapping label.
export function stackedBarDataLabels(unit = '') {
  return {
    display: (ctx) => {
      const v = ctx.dataset.data[ctx.dataIndex]
      return v ? 'auto' : false
    },
    anchor: 'center',
    align: 'center',
    font: { size: 9, weight: 700 },
    color: '#fff',
    formatter: (v) => fmtOrEmpty(v, unit),
  }
}
