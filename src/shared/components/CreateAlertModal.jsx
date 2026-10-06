import { useState } from 'react'
import Modal from './Modal.jsx'
import { useApp } from '../../core/hooks/useApp.js'

const KPIS = ['Service Level', 'Abandon Rate', 'AHT', 'Contacts', 'Forecast Variance', 'Capacity Gap', 'Headcount Variance']
const REGIONS = ['All Regions', 'AMER', 'EMEA', 'APJ', 'LATAM']
const CHANNELS = ['All Channels', 'Voice', 'Chat', 'Email', 'Social', 'Case']

const BLANK = { name: '', kpi: KPIS[0], condition: 'above', threshold: 80, region: REGIONS[0], channel: CHANNELS[0], inApp: true, email: false, frequency: 'immediate' }

// The parent remounts this component with a fresh `key` every time it opens (see
// Notifications.jsx), so the form's initial state can just be derived once from
// `editing` here — no effect needed to re-sync it when the editing target changes.
export default function CreateAlertModal({ open, onClose, editing }) {
  const { createAlert, updateAlertRule } = useApp()
  const [form, setForm] = useState(() => (editing ? { ...BLANK, ...editing } : BLANK))

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const payload = { ...form, threshold: Number(form.threshold) }
    if (editing) updateAlertRule(editing.id, payload)
    else createAlert(payload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Alert' : 'Create Alert'}>
      <form onSubmit={handleSubmit}>
        <div className="alert-form-grid">
          <div className="alert-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Alert Name</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. AMER Voice Service Level" required />
          </div>
          <div className="alert-form-field">
            <label>KPI</label>
            <select value={form.kpi} onChange={(e) => set('kpi', e.target.value)}>
              {KPIS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="alert-form-field">
            <label>Condition</label>
            <select value={form.condition} onChange={(e) => set('condition', e.target.value)}>
              <option value="above">Above</option>
              <option value="below">Below</option>
              <option value="equal">Equal to</option>
            </select>
          </div>
          <div className="alert-form-field">
            <label>Threshold</label>
            <input type="number" value={form.threshold} onChange={(e) => set('threshold', e.target.value)} />
          </div>
          <div className="alert-form-field">
            <label>Region</label>
            <select value={form.region} onChange={(e) => set('region', e.target.value)}>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="alert-form-field">
            <label>Channel</label>
            <select value={form.channel} onChange={(e) => set('channel', e.target.value)}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="alert-form-field">
            <label>Frequency</label>
            <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
              <option value="immediate">Immediately</option>
              <option value="daily">Daily Summary</option>
              <option value="weekly">Weekly Summary</option>
            </select>
          </div>
          <div className="alert-form-field">
            <label>Notification Method</label>
            <div className="alert-form-checks">
              <label className="settings-check-row" style={{ padding: 0 }}>
                <input type="checkbox" checked={form.inApp} onChange={(e) => set('inApp', e.target.checked)} /> In-App
              </label>
              <label className="settings-check-row" style={{ padding: 0 }}>
                <input type="checkbox" checked={form.email} onChange={(e) => set('email', e.target.checked)} /> Email
              </label>
            </div>
          </div>
        </div>
        <div className="settings-actions" style={{ marginTop: 18 }}>
          <button type="button" className="btn btn-sm btn-neutral" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-sm btn-primary">{editing ? 'Save Alert' : 'Create Alert'}</button>
        </div>
      </form>
    </Modal>
  )
}
