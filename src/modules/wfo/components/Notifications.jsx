import { useMemo, useState } from 'react'
import { useApp } from '../../../core/hooks/useApp.js'
import { fmtTimeAgo } from '../../../core/utils/notificationsStore.js'
import NotificationItem from '../../../shared/components/NotificationItem.jsx'
import CreateAlertModal from '../../../shared/components/CreateAlertModal.jsx'
import Icon from '../../../shared/components/Icon.jsx'

const TYPE_TABS = [
  ['all', 'All'], ['critical', 'Critical'], ['warning', 'Warning'], ['info', 'Information'], ['success', 'Success'],
]
const READ_OPTIONS = [['all', 'All'], ['unread', 'Unread'], ['read', 'Read']]
const DATE_OPTIONS = [['all', 'All Time'], ['today', 'Today'], ['week', 'This Week']]
const DAY_MS = 24 * 60 * 60 * 1000

export default function Notifications() {
  const { notifications, markAllNotificationsRead, clearNotificationHistory, alerts, toggleAlertStatus, deleteAlert } = useApp()
  const [typeFilter, setTypeFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('All')
  const [readFilter, setReadFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState(null)
  // Captured once (not re-read on every render) — exact-to-the-second precision isn't
  // needed for a Today/This Week filter boundary.
  const [now] = useState(() => Date.now())

  const regions = useMemo(() => ['All', ...new Set(notifications.filter((n) => n.region).map((n) => n.region))], [notifications])

  const filtered = useMemo(() => {
    return [...notifications]
      .sort((a, b) => b.at - a.at)
      .filter((n) => typeFilter === 'all' || n.type === typeFilter)
      .filter((n) => regionFilter === 'All' || n.region === regionFilter)
      .filter((n) => readFilter === 'all' || (readFilter === 'unread' ? !n.read : n.read))
      .filter((n) => {
        if (dateFilter === 'all') return true
        if (dateFilter === 'today') return now - n.at < DAY_MS
        return now - n.at < 7 * DAY_MS
      })
  }, [notifications, typeFilter, regionFilter, readFilter, dateFilter, now])

  function openCreate() {
    setEditingAlert(null)
    setModalOpen(true)
  }
  function openEdit(alert) {
    setEditingAlert(alert)
    setModalOpen(true)
  }

  return (
    <div className="tab-panel active settings-wrap">
      <div className="section-div" style={{ marginTop: 0 }}>
        <h2>Notifications</h2>
      </div>
      <div className="card" style={{ marginBottom: 'var(--dds-spacing-lg)' }}>
        <div className="card-header">
          <div className="tabs" role="tablist" aria-label="Notification type" style={{ margin: 0, border: 'none' }}>
            {TYPE_TABS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={typeFilter === id} className="tab" onClick={() => setTypeFilter(id)}>{label}</button>
            ))}
          </div>
          <button type="button" className="notif-panel-mark" onClick={markAllNotificationsRead}>Mark all as read</button>
        </div>

        <div className="filter-grid" style={{ margin: '12px 0' }}>
          <div className="filter-group">
            <label>Region</label>
            <select className="f-sel" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Read / Unread</label>
            <select className="f-sel" value={readFilter} onChange={(e) => setReadFilter(e.target.value)}>
              {READ_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Date</label>
            <select className="f-sel" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              {DATE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: '.75rem', color: 'var(--text-secondary)' }}>Showing {filtered.length} of {notifications.length}</span>
          {notifications.length > 0 && (
            <button type="button" className="clear-all-btn" onClick={clearNotificationHistory}>✕ Clear History</button>
          )}
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--dds-radius-md)', overflow: 'hidden' }}>
          {filtered.length === 0 && <div className="notif-panel-empty">No notifications match the selected filters.</div>}
          {filtered.map((n) => <NotificationItem key={n.id} notification={n} />)}
        </div>
      </div>

      <div className="section-div">
        <h2>My Alerts</h2>
      </div>
      <div className="card">
        {alerts.length === 0 && <div className="notif-panel-empty">No alerts yet — create one to get notified when a KPI crosses a threshold.</div>}
        {alerts.map((a) => (
          <div className="alert-card" key={a.id}>
            <div className="alert-card-main">
              <div className="alert-card-name">{a.name}</div>
              <div className="alert-card-sub">{a.region} {a.channel && a.channel !== 'All Channels' ? `· ${a.channel}` : ''}</div>
              <div className="alert-card-meta">
                <span className="alert-card-meta-item">Condition: <strong>{a.condition === 'above' ? 'Above' : a.condition === 'below' ? 'Below' : 'Equal to'} {a.threshold}{a.kpi.includes('Rate') || a.kpi.includes('Level') || a.kpi.includes('Variance') || a.kpi.includes('Gap') ? '%' : ''}</strong></span>
                <span className="alert-card-meta-item">Notifications: <strong>{[a.inApp && 'In-App', a.email && 'Email'].filter(Boolean).join(' + ') || 'None'}</strong></span>
                <span className="alert-card-meta-item">Status: <strong style={{ color: a.status === 'active' ? 'var(--dds-green-70)' : 'var(--text-muted)' }}>{a.status === 'active' ? 'Active' : 'Paused'}</strong></span>
                <span className="alert-card-meta-item">Created {fmtTimeAgo(a.createdAt)}</span>
              </div>
            </div>
            <div className="alert-card-actions">
              <button type="button" className="btn btn-sm btn-neutral" onClick={() => openEdit(a)}><Icon name="edit" size={14} />&nbsp;Edit</button>
              <button type="button" className="btn btn-sm btn-neutral" onClick={() => toggleAlertStatus(a.id)}>
                <Icon name={a.status === 'active' ? 'pause' : 'play'} size={14} />&nbsp;{a.status === 'active' ? 'Pause' : 'Resume'}
              </button>
              <button type="button" className="clear-all-btn" onClick={() => deleteAlert(a.id)}><Icon name="trash" size={13} />&nbsp;Delete</button>
            </div>
          </div>
        ))}
        <div style={{ marginTop: alerts.length ? 16 : 0 }}>
          <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}><Icon name="plus" size={14} />&nbsp;Create Alert</button>
        </div>
      </div>

      <CreateAlertModal key={modalOpen ? (editingAlert?.id || 'new') : 'idle'} open={modalOpen} onClose={() => setModalOpen(false)} editing={editingAlert} />
    </div>
  )
}
