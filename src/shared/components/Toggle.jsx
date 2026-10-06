export default function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label className={'toggle-switch' + (disabled ? ' disabled' : '')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  )
}
