import { useState } from 'react'
import { Bar } from 'react-chartjs-2'

export default function WhatIfScenarioCompare({ savedScenarios, currentSnapshot, onSave, onDelete, colors }) {
  const [name, setName] = useState('')
  const atLimit = savedScenarios.length >= 3

  function handleSave() {
    onSave(name.trim())
    setName('')
  }

  const compareChart = {
    data: {
      labels: [...savedScenarios.map((s) => s.name), 'Current (live)'],
      datasets: [{
        label: 'Required Headcount',
        data: [...savedScenarios.map((s) => s.results.requiredHeadcount), currentSnapshot.results.requiredHeadcount],
        backgroundColor: [...savedScenarios.map(() => colors.accentBlue), colors.accentOrange],
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grace: '15%' } },
    },
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Scenario Save &amp; Compare</div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 420 }}>
        <div className="filter-group" style={{ flex: 1 }}>
          <label>Scenario name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={atLimit ? 'Max 3 scenarios saved' : 'e.g. Peak season +20%'}
            disabled={atLimit}
          />
        </div>
        <button type="button" className="btn btn-sm btn-primary" onClick={handleSave} disabled={atLimit}>Save</button>
      </div>

      {savedScenarios.length > 0 && (
        <>
          <div className="tw" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Scenario</th>
                  <th>Saved Under</th>
                  <th>Volume</th>
                  <th>AHT (min)</th>
                  <th>Shrinkage</th>
                  <th>Target SL</th>
                  <th>Required HC</th>
                  <th>Gap</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {savedScenarios.map((s) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'left' }}>{s.name}</td>
                    <td>{s.ccoViewLabel}</td>
                    <td>{s.inputs.volumePct >= 0 ? '+' : ''}{s.inputs.volumePct}%</td>
                    <td>{s.inputs.ahtMinutes}</td>
                    <td>{s.inputs.shrinkagePct}%</td>
                    <td>{s.inputs.targetSlPct}%</td>
                    <td>{s.results.requiredHeadcount}</td>
                    <td>{s.results.gap >= 0 ? '+' : ''}{s.results.gap}</td>
                    <td><button type="button" className="clear-all-btn" onClick={() => onDelete(s.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="chart-container" style={{ height: 200, marginTop: 14 }}>
            <Bar data={compareChart.data} options={compareChart.options} />
          </div>
        </>
      )}
    </div>
  )
}
