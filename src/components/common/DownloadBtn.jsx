import { downloadCsv } from '../../utils/csvExport.js'

export default function DownloadBtn({ filename, rows, title }) {
  return (
    <button type="button" className="dl-btn" title={title || 'Download CSV'} onClick={() => downloadCsv(filename, rows)}>⬇</button>
  )
}
