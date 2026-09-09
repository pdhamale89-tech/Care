import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { fmt, genKpiValue, hashSeed, getWeeksForQuarter } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels } from '../../charts/datalabels.js'
import InfoBtn from '../common/InfoBtn.jsx'

const SCENARIO_METRICS = [
  { key: 'volume', label: 'Volume', base: 2200, unit: '', decimals: 0 },
  { key: 'caseRate', label: 'Case Rate', base: 12.5, unit: '%', decimals: 1 },
  { key: 'cpsr', label: 'CPSR', base: 4.2, unit: '', decimals: 1 },
  { key: 'crw', label: 'CRW', base: 130, unit: '', decimals: 0 },
  { key: 'orders', label: 'Orders', base: 1150, unit: '', decimals: 0 },
  { key: 'cases', label: 'Cases', base: 3200, unit: '', decimals: 0 },
  { key: 'tcd', label: 'TCD', base: 48000, unit: '', decimals: 0 },
  { key: 'headcount', label: 'Headcount', base: 65, unit: '', decimals: 0 },
]

function getPeriodsForView(view, quarters, weeks) {
  const qList = (quarters || []).filter((q) => q !== 'All')
  const activeQuarters = qList.length ? qList : ['FQ1', 'FQ2', 'FQ3', 'FQ4']
  const allWeeks = activeQuarters.flatMap((q) => getWeeksForQuarter(q))
  const wList = (weeks || []).filter((w) => w !== 'All')
  if (view === 'weekly') return wList.length ? wList : allWeeks
  return activeQuarters
}

const DEFAULT_CHANGES = Object.fromEntries(SCENARIO_METRICS.map((m) => [m.key, 0]))

export default function WhatIfSimulator() {
  const { theme, activeRegions, ccoFilters, ccoView } = useApp()
  const colors = getColors(theme)
  const { subRegion, quarter, week, classification } = ccoFilters

  const [changePct, setChangePct] = useState(DEFAULT_CHANGES)

  function setChange(key, value) {
    setChangePct((prev) => ({ ...prev, [key]: value }))
  }
  function reset() {
    setChangePct(DEFAULT_CHANGES)
  }

  // Baseline — pulled live from the same generation formula CCO Overview uses,
  // so this simulation is grounded in the numbers actually shown there.
  const seed = useMemo(
    () => hashSeed(subRegion.join(',') + quarter.join(',') + week.join(',') + classification.join(',') + activeRegions.join(',') + ccoView),
    [subRegion, quarter, week, classification, activeRegions, ccoView],
  )
  const baseline = useMemo(() => {
    const periods = getPeriodsForView(ccoView, quarter, week)
    const li = periods.length - 1
    return Object.fromEntries(SCENARIO_METRICS.map((m, mi) => {
      const { actual } = genKpiValue(m.base, seed + li * 7 + mi * 3, m.decimals)
      return [m.key, actual]
    }))
  }, [seed, ccoView, quarter, week])

  const scenario = useMemo(() => Object.fromEntries(SCENARIO_METRICS.map((m) => {
    const factor = Math.pow(10, m.decimals)
    const val = Math.round(baseline[m.key] * (1 + changePct[m.key] / 100) * factor) / factor
    return [m.key, val]
  })), [baseline, changePct])

  const varianceChart = useMemo(() => {
    const labels = SCENARIO_METRICS.map((m) => m.label)
    const data = SCENARIO_METRICS.map((m) => changePct[m.key])
    return {
      data: {
        labels,
        datasets: [{
          label: 'Change %',
          data,
          backgroundColor: data.map((v) => (v >= 0 ? colors.accentGreen : colors.accentRed)),
          borderRadius: 4,
          datalabels: barDataLabels('%', colors.textPrimary),
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (v) => v + '%' }, grace: '15%' } },
      },
    }
  }, [changePct, colors])

  const changedMetrics = SCENARIO_METRICS.filter((m) => changePct[m.key] !== 0)

  return (
    <div className="tab-panel active">
      <div className="ai-story">
        <div className="ai-icon-box">🧮</div>
        <div>
          <div className="ai-story-title">Scenario Summary</div>
          <div className="ai-story-text">
            {changedMetrics.length === 0
              ? 'No scenario changes applied — every value below reflects the live baseline from CCO Overview.'
              : <>You've adjusted {changedMetrics.map((m, i) => (
                <span key={m.key}>
                  {i > 0 && ', '}
                  <strong>{m.label} {changePct[m.key] >= 0 ? '+' : ''}{changePct[m.key]}%</strong>
                </span>
              ))} — see the projected value for each metric below.</>}
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>
          Scenario Inputs <InfoBtn tip="<strong>Purpose</strong>Each slider applies a % change directly to that metric's own live baseline from CCO Overview — no staffing model in between." />
        </h2>
      </div>
      <div className="card">
        <div className="wis-grid">
          {SCENARIO_METRICS.map((m) => (
            <div className="wis-control" key={m.key}>
              <div className="wis-control-head"><span>{m.label} Change</span><b>{changePct[m.key] >= 0 ? '+' : ''}{changePct[m.key]}%</b></div>
              <input type="range" min={-30} max={50} step={5} value={changePct[m.key]} onChange={(e) => setChange(m.key, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <div className="filter-clear-row">
          <button type="button" className="clear-all-btn" onClick={reset}>✕ Reset to Baseline</button>
        </div>
      </div>

      <div className="section-div">
        <h2>Projected Impact</h2>
      </div>
      <div className="kpi-grid">
        {SCENARIO_METRICS.map((m) => (
          <div className="kpi-card" key={m.key}>
            <div className="kpi-label">{m.label}</div>
            <div className="kpi-value">{fmt(scenario[m.key])}{m.unit}</div>
            <div className="kpi-sub">Baseline: {fmt(baseline[m.key])}{m.unit}</div>
            <div className="kpi-sub">{changePct[m.key] >= 0 ? '▲' : '▼'} {Math.abs(changePct[m.key])}% change</div>
          </div>
        ))}
      </div>

      <div className="s-grid full">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Change % by Metric</div>
          </div>
          <div className="chart-container" style={{ height: 220 }}>
            <Bar data={varianceChart.data} options={varianceChart.options} />
          </div>
        </div>
      </div>
    </div>
  )
}
