import { downloadCsv } from '../../core/utils/csvExport.js'
import { useApp } from '../../core/hooks/useApp.js'

export default function DownloadBtn({ filename, rows, title, source, filtersUsed }) {
  const { logExport } = useApp()
  const handleClick = () => {
    downloadCsv(filename, rows)
    logExport(source || title || filename, filtersUsed)
  }
  return (
    <button type="button" className="dl-btn" title={title || 'Download CSV'} onClick={handleClick}>⬇</button>
  )
}
