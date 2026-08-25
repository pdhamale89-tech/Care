const LEGEND_BOTTOM = { legend: { position: 'bottom' } }

export function donutConfig(labels, data, colors) {
  return {
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { plugins: LEGEND_BOTTOM },
  }
}

export function actualForecastConfig(labels, actual, forecast, title) {
  return {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Actual', data: actual, backgroundColor: '#0076CE', order: 2, borderRadius: 6 },
        { type: 'line', label: 'Forecast', data: forecast, borderColor: '#D93025', borderWidth: 2, tension: 0.35, fill: false, order: 1, pointRadius: 3 },
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

export function dualLineConfig(labels, seriesA, seriesB) {
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
        },
        {
          label: seriesB.label,
          data: seriesB.data,
          borderColor: seriesB.color,
          backgroundColor: seriesB.color + '1a',
          borderDash: seriesB.dashed ? [6, 4] : undefined,
          fill: !!seriesB.fill,
          tension: 0.35,
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
        { type: 'bar', label: bar.label, data: bar.data, backgroundColor: bar.color },
        { type: 'line', label: line.label, data: line.data, borderColor: line.color, yAxisID: 'y1', tension: 0.3 },
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

export function issueComboConfig(labels, actual, forecast, variance) {
  return {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Actual', data: actual, backgroundColor: '#0076CE' },
        { type: 'bar', label: 'Forecast', data: forecast, backgroundColor: '#C9D6E0' },
        { type: 'line', label: 'Variance', data: variance, borderColor: '#D93025', yAxisID: 'y1', tension: 0.3 },
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

export function stackedBarConfig(labels, datasets) {
  return {
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: LEGEND_BOTTOM,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    },
  }
}

export function barConfig(labels, label, data, color) {
  return {
    data: { labels, datasets: [{ label, data, backgroundColor: color }] },
    options: { responsive: true, plugins: LEGEND_BOTTOM, scales: { y: { beginAtZero: true } } },
  }
}
