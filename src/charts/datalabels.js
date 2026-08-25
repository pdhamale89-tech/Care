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
