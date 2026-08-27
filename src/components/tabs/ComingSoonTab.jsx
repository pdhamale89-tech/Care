export default function ComingSoonTab({ title }) {
  return (
    <div className="tab-panel active">
      <div className="section-div">
        <h2>{title}</h2>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🚧</div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)' }}>Coming Soon</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{title} isn&apos;t available in this demo yet.</div>
      </div>
    </div>
  )
}
