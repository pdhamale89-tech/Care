import { useApp } from '../../core/hooks/useApp.js'
import { fmtTimeAgo } from '../../core/utils/notificationsStore.js'

const ICON = { critical: '🔴', warning: '🟠', info: '🔵', success: '🟢' }
const LABEL = { critical: 'Critical', warning: 'Warning', info: 'Information', success: 'Success' }

export default function NotificationItem({ notification, onNavigated, compact = false }) {
  const { navTo, markNotificationRead, deleteNotification } = useApp()

  function handleCta() {
    markNotificationRead(notification.id)
    if (notification.cta?.tab) navTo(notification.cta.tab)
    onNavigated?.()
  }

  return (
    <div className={`notif-item ${notification.type}${notification.read ? '' : ' unread'}`}>
      {!notification.read && <span className="notif-unread-dot" />}
      <span className="notif-dot-ic">{ICON[notification.type]}</span>
      <div className="notif-body">
        <div className="notif-title-row">
          <span className="notif-title">{notification.title}</span>
          <span className={`notif-type-tag ${notification.type}`}>{LABEL[notification.type]}</span>
        </div>
        <div className="notif-msg">{notification.message}</div>
        <div className="notif-meta-row">
          <span>{fmtTimeAgo(notification.at)}</span>
          {notification.region && <span>· {notification.region}</span>}
          {notification.cta && (
            <button type="button" className="notif-panel-mark" onClick={handleCta}>{notification.cta.label}</button>
          )}
          {!notification.read && (
            <button type="button" className="notif-panel-mark" onClick={() => markNotificationRead(notification.id)}>Mark as Read</button>
          )}
          {!compact && (
            <button type="button" className="notif-panel-mark" style={{ color: 'var(--dds-red-70)' }} onClick={() => deleteNotification(notification.id)}>Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}
