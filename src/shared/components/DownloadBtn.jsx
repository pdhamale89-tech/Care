import { downloadCsv } from '../../core/utils/csvExport.js'
import { useApp } from '../../core/hooks/useApp.js'
import { formatIST } from '../../core/utils/dateUtils.js'

export default function DownloadBtn({ filename, rows, title, source, filtersUsed }) {
  const { logExport, settings } = useApp()
  const handleClick = () => {
    downloadCsv(filename, rows, {
      timestamp: settings.exportIncludeTimestamp ? formatIST(new Date()) : null,
      filters: settings.exportIncludeFilters ? (filtersUsed || 'No filters applied') : null,
    })
    logExport(source || title || filename, filtersUsed)
  }
  return (
    <button type="button" className="dl-btn" title={title || 'Download CSV'} onClick={handleClick}>⬇</button>
  )
}
