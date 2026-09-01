import { Fragment, useMemo, useState } from 'react'
import Modal from '../common/Modal.jsx'
import DownloadBtn from '../common/DownloadBtn.jsx'
import { SUBREGIONS_BY_REGION } from '../../data/geoRegions.js'

const CHANNELS = ['Voice', 'Email', 'Chat']
const SEGMENTS = ['Consumer', 'Global Sales']
const REGIONS_ORDER = ['AMER', 'APJ', 'EMEA']

function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function cellVariance(seed, key) {
  const j = (Math.sin((seed + hashCode(key)) * 13.37) + 1) / 2
  return Math.round((j - 0.5) * 160) // roughly -80..+80
}

function buildRow(seed, channel, segment, subsByRegion) {
  const byRegion = {}
  const allLeaf = []
  REGIONS_ORDER.forEach((r) => {
    const subs = subsByRegion[r]
    const cells = {}
    subs.forEach((s) => {
      const v = cellVariance(seed, `${channel}-${segment}-${r}-${s}`)
      cells[s] = v
      allLeaf.push(v)
    })
    cells.Total = Math.round(subs.reduce((sum, s) => sum + cells[s], 0) / subs.length)
    byRegion[r] = cells
  })
  const grandTotal = Math.round(allLeaf.reduce((a, b) => a + b, 0) / allLeaf.length)
  return { label: segment, byRegion, grandTotal }
}

function averageRows(rows, label, subsByRegion) {
  const byRegion = {}
  REGIONS_ORDER.forEach((r) => {
    const subs = subsByRegion[r]
    const cells = {}
    subs.forEach((s) => {
      cells[s] = Math.round(rows.reduce((sum, row) => sum + row.byRegion[r][s], 0) / rows.length)
    })
    cells.Total = Math.round(subs.reduce((sum, s) => sum + cells[s], 0) / subs.length)
    byRegion[r] = cells
  })
  const grandTotal = Math.round(rows.reduce((sum, row) => sum + row.grandTotal, 0) / rows.length)
  return { label, byRegion, grandTotal }
}

function buildMatrix(seed) {
  const subsByRegion = Object.fromEntries(REGIONS_ORDER.map((r) => [r, [...SUBREGIONS_BY_REGION[r]].sort()]))
  const groups = CHANNELS.map((channel) => {
    const rows = SEGMENTS.map((segment) => buildRow(seed, channel, segment, subsByRegion))
    return { key: channel, label: channel, rows: [...rows, averageRows(rows, 'Overall', subsByRegion)] }
  })
  const overall = averageRows(groups.flatMap((g) => g.rows.filter((r) => r.label !== 'Overall')), null, subsByRegion)
  return { regions: REGIONS_ORDER, subsByRegion, groups, overall }
}

function cellClass(v) {
  return v >= 0 ? 'mtx-pos' : 'mtx-neg'
}

export default function OverallSlaDrillModal({ open, onClose, seed }) {
  const [expanded, setExpanded] = useState({})
  const { regions, subsByRegion, groups, overall } = useMemo(() => buildMatrix(seed), [seed])

  function toggleGroup(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function buildCsvRows() {
    const header = ['Channel', 'Segment']
    regions.forEach((r) => { subsByRegion[r].forEach((s) => header.push(`${r} ${s}`)); header.push(`${r} Total`) })
    header.push('Grand Total')
    const rowToCsv = (channelLabel, row) => {
      const cells = [channelLabel, row.label]
      regions.forEach((r) => { subsByRegion[r].forEach((s) => cells.push(row.byRegion[r][s] + '%')); cells.push(row.byRegion[r].Total + '%') })
      cells.push(row.grandTotal + '%')
      return cells
    }
    const rows = [header]
    groups.forEach((g) => g.rows.forEach((row) => rows.push(rowToCsv(g.label, row))))
    rows.push(rowToCsv('Overall', { label: '', ...overall }))
    return rows
  }

  return (
    <Modal open={open} onClose={onClose} title="Overall SLA by Geography — Detail">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <DownloadBtn filename="overall-sla-matrix" title="Download Overall SLA variance matrix" rows={buildCsvRows()} />
      </div>
      <div className="tw scroll">
        <table className="mtx-tbl">
          <thead>
            <tr>
              <th rowSpan={2}>Channel</th>
              <th rowSpan={2}>Segment</th>
              {regions.map((r) => <th key={r} colSpan={subsByRegion[r].length + 1} className="mtx-region-hdr">{r}</th>)}
              <th rowSpan={2}>TOTAL</th>
            </tr>
            <tr>
              {regions.map((r) => (
                <Fragment key={r}>
                  {subsByRegion[r].map((s) => <th key={r + s} className="mtx-sub-hdr">{s}</th>)}
                  <th className="mtx-sub-hdr">Total</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const isOpen = !!expanded[g.key]
              const visibleRows = isOpen ? g.rows : g.rows.filter((row) => row.label === 'Overall')
              return visibleRows.map((row, i) => (
                <tr key={g.key + row.label}>
                  {i === 0 && (
                    <th rowSpan={visibleRows.length}>
                      <button type="button" className="mtx-toggle" onClick={() => toggleGroup(g.key)} title={isOpen ? 'Collapse' : 'Expand to see Consumer/Global Sales split'}>
                        <span className="mtx-toggle-ic">{isOpen ? '▾' : '▸'}</span>{g.label}
                      </button>
                    </th>
                  )}
                  <th>{row.label}</th>
                  {regions.map((r) => (
                    <Fragment key={r}>
                      {subsByRegion[r].map((s) => <td key={s} className={cellClass(row.byRegion[r][s])}>{row.byRegion[r][s]}%</td>)}
                      <td className={cellClass(row.byRegion[r].Total)}>{row.byRegion[r].Total}%</td>
                    </Fragment>
                  ))}
                  <td className={cellClass(row.grandTotal)}>{row.grandTotal}%</td>
                </tr>
              ))
            })}
            <tr className="mtx-overall-row">
              <th colSpan={2}>Overall</th>
              {regions.map((r) => (
                <Fragment key={r}>
                  {subsByRegion[r].map((s) => <td key={s} className={cellClass(overall.byRegion[r][s])}>{overall.byRegion[r][s]}%</td>)}
                  <td className={cellClass(overall.byRegion[r].Total)}>{overall.byRegion[r].Total}%</td>
                </Fragment>
              ))}
              <td className={cellClass(overall.grandTotal)}>{overall.grandTotal}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
