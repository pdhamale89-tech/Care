import { useEffect, useRef, useState } from 'react'

// `options` is the list of real values (never include 'All' — it's handled here).
// `selected` is either ['All'] (no filter applied) or an array of chosen values.
export default function MultiSelectDropdown({ options, selected, onChange, allLabel = 'All' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const isAll = selected.length === 0 || selected.includes('All')

  function toggleAll() {
    onChange(['All'])
  }

  function toggleOption(opt) {
    const current = isAll ? [] : selected
    const next = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt]
    onChange(next.length ? next : ['All'])
  }

  const buttonLabel = isAll ? allLabel : selected.length === 1 ? selected[0] : `${selected.length} selected`

  return (
    <div className="multiselect" ref={rootRef}>
      <button type="button" className="multiselect-btn" onClick={() => setOpen((o) => !o)}>
        <span className="multiselect-btn-label">{buttonLabel}</span>
        <span className="multiselect-caret">▾</span>
      </button>
      {open && (
        <div className="multiselect-menu">
          <label className="multiselect-item">
            <input type="checkbox" checked={isAll} onChange={toggleAll} />
            {allLabel}
          </label>
          {options.map((opt) => (
            <label className="multiselect-item" key={opt}>
              <input type="checkbox" checked={!isAll && selected.includes(opt)} onChange={() => toggleOption(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
