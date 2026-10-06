function csvCell(value) {
  const s = value == null ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// `meta` (optional) prepends extra context rows ahead of the data — driven by Settings
// > Export Preferences ("Include Timestamp" / "Include Filter Selections").
export function downloadCsv(filename, rows, meta) {
  const metaRows = []
  if (meta?.timestamp) metaRows.push([`Exported: ${meta.timestamp}`])
  if (meta?.filters) metaRows.push([`Filters: ${meta.filters}`])
  if (metaRows.length) metaRows.push([])
  const csv = [...metaRows, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
