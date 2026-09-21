import { useState } from 'react'
import { useApp } from '../../core/hooks/useApp.js'
import Icon from './Icon.jsx'

export default function PageHeader({ title, description }) {
  const { lastUpdated, navTo, showToast } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  function handleRefresh() {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 700)
  }

  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="meta">
          <span className="t-caption"><span className="dot"></span>Last refreshed: {lastUpdated}</span>
          <span className="badge badge-info">Auto-refresh: 15 min</span>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-outline" onClick={handleRefresh}>
          <Icon name="refresh" size={15} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
        <button type="button" className="btn btn-neutral" onClick={() => showToast('Use the download icon on individual charts to export their data', 'toast-info')}>
          <Icon name="download" size={15} />
          Export
        </button>
        <button type="button" className="btn btn-primary" onClick={() => navTo('reports')}>+ New report</button>
      </div>
    </div>
  )
}
