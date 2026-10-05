import { useMemo, useState } from 'react'
import { GLOSSARY } from '../lib/glossaryData.js'
import DownloadBtn from '../../../shared/components/DownloadBtn.jsx'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'

export default function Glossary() {
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return GLOSSARY
    return GLOSSARY.filter((g) =>
      g.metric.toLowerCase().includes(q)
      || g.description.toLowerCase().includes(q)
      || g.formula.toLowerCase().includes(q))
  }, [search])

  return (
    <div className="tab-panel active">
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            Metric Glossary <InfoBtn tip="<strong>Purpose</strong>Definitions and formulas for every metric used across the dashboard, sourced from the standard metric reference sheet." />
          </div>
          <DownloadBtn
            filename="metric-glossary"
            title="Download glossary"
            source="Glossary — Metric Glossary"
            rows={[
              ['Metric', 'Description', 'Formula'],
              ...rows.map((g) => [g.metric, g.description, g.formula]),
            ]}
          />
        </div>

        <div className="filter-group" style={{ maxWidth: 320, marginBottom: 12 }}>
          <label>Search</label>
          <input type="text" placeholder="Search metric, description or formula..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Metric</th>
                <th style={{ textAlign: 'left' }}>Description</th>
                <th style={{ textAlign: 'left' }}>Formula</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.metric}>
                  <td style={{ textAlign: 'left', fontWeight: 500 }}>{g.metric}</td>
                  <td style={{ textAlign: 'left', whiteSpace: 'normal' }}>{g.description}</td>
                  <td style={{ textAlign: 'left', whiteSpace: 'normal', fontVariantNumeric: 'tabular-nums' }}>{g.formula}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No metrics match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
