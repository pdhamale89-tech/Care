import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../core/hooks/useApp.js'
import NotificationItem from './NotificationItem.jsx'

const TABS = [
  ['all', 'All'], ['critical', 'Critical'], ['warning', 'Warning'], ['info', 'Information'],
]

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllNotificationsRead, navTo } = useApp()
  const [filter, setFilter] = useState('all')
  const rootRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [onClose])

  const list = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => b.at - a.at)
    const filtered = filter === 'all' ? sorted : sorted.filter((n) => n.type === filter)
    return filtered.slice(0, 8)
  }, [notifications, filter])

  return (
    <div className="notif-panel" ref={rootRef}>
      <div className="notif-panel-head">
        <span className="notif-panel-title">Notifications</span>
        <button type="button" className="notif-panel-mark" onClick={markAllNotificationsRead}>Mark all as read</button>
      </div>
      <div className="notif-panel-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} className="tab" onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      <div className="notif-panel-list">
        {list.length === 0 && <div className="notif-panel-empty">No notifications here.</div>}
        {list.map((n) => (
          <NotificationItem key={n.id} notification={n} onNavigated={onClose} compact />
        ))}
      </div>
      <div className="notif-panel-foot">
        <button type="button" onClick={() => { navTo('notifications'); onClose() }}>View All Notifications</button>
      </div>
    </div>
  )
}
