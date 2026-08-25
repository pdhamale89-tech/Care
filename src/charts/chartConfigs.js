import { barDataLabels, lineDataLabels, stackedBarDataLabels } from './datalabels.js'

const LEGEND_BOTTOM = { legend: { position: 'bottom' } }

export function donutConfig(labels, data, colors) {
  return {
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { plugins: LEGEND_BOTTOM },
  }
}

export function actualForecastConfig(labels, actual, forecast, title, unit = '') {
  return {
    data: {
      labels,
      datasets: [
        {
          type: 'bar', label: 'Actual', data: actual, backgroundColor: '#0076CE', order: 2, borderRadius: 6,
          datalabels: barDataLabels(unit, '#0076CE'),
        },
        {
          type: 'line', label: 'Forecast', data: forecast, borderColor: '#D93025', borderWidth: 2, tension: 0.35,
          fill: false, order: 1, pointRadius: 3,
          datalabels: lineDataLabels(unit, '#D93025'),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        ...(title ? { title: { display: true, text: title, font: { size: 12 } } } : {}),
      },
      scales: { y: { beginAtZero: true } },
    },
  }
}

export function dualLineConfig(labels, seriesA, seriesB, unit = '') {
  return {
    data: {
      labels,
      datasets: [
        {
          label: seriesA.label,
          data: seriesA.data,
          borderColor: seriesA.color,
          backgroundColor: seriesA.color + '1a',
          fill: !!seriesA.fill,
          tension: 0.35,
          datalabels: lineDataLabels(unit, seriesA.color),
        },
        {
          label: seriesB.label,
          data: seriesB.data,
          borderColor: seriesB.color,
          backgroundColor: seriesB.color + '1a',
          borderDash: seriesB.dashed ? [6, 4] : undefined,
          fill: !!seriesB.fill,
          tension: 0.35,
          datalabels: lineDataLabels(unit, seriesB.color),
        },
      ],
    },
    options: { responsive: true, plugins: LEGEND_BOTTOM },
  }
}

export function dualAxisBarLineConfig(labels, bar, line) {
  return {
    data: {
      labels,
      datasets: [
        {
          type: 'bar', label: bar.label, data: bar.data, backgroundColor: bar.color,
          datalabels: barDataLabels(bar.unit ?? '', bar.color),
        },
        {
          type: 'line', label: line.label, data: line.data, borderColor: line.color, yAxisID: 'y1', tension: 0.3,
          datalabels: lineDataLabels(line.unit ?? '', line.color),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: LEGEND_BOTTOM,
      scales: {
        y: { beginAtZero: true },
        y1: { position: 'right', grid: { drawOnChartArea: false } },
      },
    },
  }
}

export function issueComboConfig(labels, actual, forecast, variance, unit = '') {
  return {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Actual', data: actual, backgroundColor: '#0076CE', datalabels: barDataLabels(unit, '#0076CE') },
        { type: 'bar', label: 'Forecast', data: forecast, backgroundColor: '#C9D6E0', datalabels: barDataLabels(unit, '#5A5F68') },
        { type: 'line', label: 'Variance', data: variance, borderColor: '#D93025', yAxisID: 'y1', tension: 0.3, datalabels: lineDataLabels(unit, '#D93025') },
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

export function barConfig(labels, label, data, color, unit = '') {
  return {
    data: { labels, datasets: [{ label, data, backgroundColor: color, datalabels: barDataLabels(unit, color) }] },
    options: { responsive: true, plugins: LEGEND_BOTTOM, scales: { y: { beginAtZero: true } } },
  }
}
