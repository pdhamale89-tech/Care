import Icon from '../../../shared/components/Icon.jsx'

export default function ComingSoonTab({ title }) {
  return (
    <div className="tab-panel active">
      <div className="section-div">
        <h2>{title}</h2>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}><Icon name="gear" size={28} /></div>
        <div style={{ fontWeight: 500, fontSize: '1rem', marginBottom: 4, color: 'var(--text-primary)' }}>Coming Soon</div>
        <div style={{ fontSize: '.8125rem', color: 'var(--text-secondary)' }}>{title} isn&apos;t available in this demo yet.</div>
      </div>
    </div>
  )
}
