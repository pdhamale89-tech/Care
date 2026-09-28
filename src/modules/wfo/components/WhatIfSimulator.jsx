import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../../core/hooks/useApp.js'
import { fmt, genKpiValue, hashSeed, getWeeksForQuarter } from '../lib/mockGenerators.js'
import { getColors } from '../../../shared/themes/colors.js'
import { barDataLabels } from '../lib/datalabels.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'
import Icon from '../../../shared/components/Icon.jsx'

const QUARTERS = ['FQ1', 'FQ2', 'FQ3', 'FQ4']

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
const CHANGE_MIN = -30
const CHANGE_MAX = 50

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export default function WhatIfSimulator() {
  const { theme, activeRegions, ccoFilters, ccoView } = useApp()
  const colors = getColors(theme)
  const { subRegion, quarter, week, classification, fiscalYear } = ccoFilters

  const [changePct, setChangePct] = useState(DEFAULT_CHANGES)
  const [planQuarter, setPlanQuarter] = useState(QUARTERS[0])
  const [planWeek, setPlanWeek] = useState('All')
  const [planSnapshot, setPlanSnapshot] = useState(null)

  function setChange(key, value) {
    setChangePct((prev) => ({ ...prev, [key]: value }))
  }
  function handleTypedChange(key, raw) {
    // Let the user keep typing (empty string, a lone "-") without snapping the field
    // back to the last committed value — only commit once it parses to a real number.
    if (raw === '' || raw === '-') return
    const num = Number(raw)
    if (Number.isNaN(num)) return
    setChange(key, clamp(num, CHANGE_MIN, CHANGE_MAX))
  }
  function reset() {
    setChangePct(DEFAULT_CHANGES)
  }

  // Plan Snapshot — a separate, explicitly-submitted lookup of a specific Plan
  // Quarter/Week's baseline, pulled via the same deterministic generation formula
  // as everything else (not a new data source), so it can be compared against the
  // current live scenario below. Deliberately deferred behind Submit rather than
  // recomputing live, since picking a plan period is a one-off lookup, not a
  // continuously-adjusted input like the sliders above.
  function handleSubmitPlan() {
    const planWeeksArr = planWeek === 'All' ? ['All'] : [planWeek]
    const planPeriods = getPeriodsForView(ccoView, [planQuarter], planWeeksArr)
    const planLi = planPeriods.length - 1
    const planSeed = hashSeed(subRegion.join(',') + [planQuarter].join(',') + planWeeksArr.join(',') + classification.join(',') + activeRegions.join(',') + ccoView + fiscalYear.join(','))
    const values = Object.fromEntries(SCENARIO_METRICS.map((m, mi) => {
      const { actual } = genKpiValue(m.base, planSeed + planLi * 7 + mi * 3, m.decimals)
      return [m.key, actual]
    }))
    setPlanSnapshot({ label: planQuarter + (planWeek === 'All' ? ' (Full Quarter)' : ' / ' + planWeek), values })
  }

  // Baseline — pulled live from the same generation formula CCO Overview uses,
  // so this simulation is grounded in the numbers actually shown there.
  const seed = useMemo(
    () => hashSeed(subRegion.join(',') + quarter.join(',') + week.join(',') + classification.join(',') + activeRegions.join(',') + ccoView + fiscalYear.join(',')),
    [subRegion, quarter, week, classification, activeRegions, ccoView, fiscalYear],
  )
  // Baseline always uses the most recent period within the active filter selection
  // (e.g. FQ4 / the last filtered week) — surfaced to the user via activePeriodLabel below
  // so "Projected Impact" doesn't read as a fixed/static period.
  const periods = useMemo(() => getPeriodsForView(ccoView, quarter, week), [ccoView, quarter, week])
  const activePeriodLabel = periods[periods.length - 1]
  const baseline = useMemo(() => {
    const li = periods.length - 1
    return Object.fromEntries(SCENARIO_METRICS.map((m, mi) => {
      const { actual } = genKpiValue(m.base, seed + li * 7 + mi * 3, m.decimals)
      return [m.key, actual]
    }))
  }, [seed, periods])

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
        scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, grace: '15%' } },
      },
    }
  }, [changePct, colors])

  const changedMetrics = SCENARIO_METRICS.filter((m) => changePct[m.key] !== 0)

  return (
    <div className="tab-panel active">
      <div className="section-div">
        <h2>
          Plan Snapshot <InfoBtn tip="<strong>Purpose</strong>Pick a specific Plan Quarter/Week to pull that period's baseline as a fixed reference point, independent of the main Fiscal Quarter/Week filters above. Submit to fetch it, then compare against your current scenario below." />
        </h2>
      </div>
      <div className="card">
        <div className="filter-grid">
          <div className="filter-group">
            <label>Plan Quarter</label>
            <select value={planQuarter} onChange={(e) => { setPlanQuarter(e.target.value); setPlanWeek('All') }}>
              {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Plan Week</label>
            <select value={planWeek} onChange={(e) => setPlanWeek(e.target.value)}>
              <option value="All">Full Quarter</option>
              {getWeeksForQuarter(planQuarter).map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div className="filter-clear-row">
          <button type="button" className="btn btn-sm btn-primary" onClick={handleSubmitPlan}>Submit</button>
        </div>

        {planSnapshot && (
          <div className="tw" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Metric</th>
                  <th>Plan ({planSnapshot.label})</th>
                  <th>Current Scenario</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIO_METRICS.map((m) => {
                  const planVal = planSnapshot.values[m.key]
                  const curVal = scenario[m.key]
                  const variance = curVal - planVal
                  return (
                    <tr key={m.key}>
                      <td style={{ textAlign: 'left' }}>{m.label}</td>
                      <td>{fmt(planVal)}{m.unit}</td>
                      <td>{fmt(curVal)}{m.unit}</td>
                      <td className={variance >= 0 ? 'tbl-pos' : 'tbl-neg'}>{variance >= 0 ? '+' : ''}{fmt(variance)}{m.unit}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ai-story">
        <div className="ai-icon-box"><Icon name="calculator" size={18} /></div>
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
              <div className="wis-control-head">
                <span>{m.label} Change</span>
                <span className="wis-num-wrap">
                  <input
                    type="number"
                    className="wis-num-input"
                    min={CHANGE_MIN}
                    max={CHANGE_MAX}
                    step={5}
                    value={changePct[m.key]}
                    onChange={(e) => handleTypedChange(m.key, e.target.value)}
                    onBlur={(e) => { e.target.value = String(changePct[m.key]) }}
                    aria-label={m.label + ' change percent'}
                  />%
                </span>
              </div>
              <input type="range" min={CHANGE_MIN} max={CHANGE_MAX} step={5} value={changePct[m.key]} onChange={(e) => setChange(m.key, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <div className="filter-clear-row">
          <button type="button" className="clear-all-btn" onClick={reset}>✕ Reset to Baseline</button>
        </div>
      </div>

      <div className="section-div">
        <h2>Projected Impact</h2>
        <p>Note: baseline values reflect <strong>{activePeriodLabel}</strong> — the most recent {ccoView === 'weekly' ? 'week' : 'quarter'} in your current filter selection. Adjust the Fiscal Quarter/Week filters above to simulate a different period.</p>
      </div>
      <div className="kpi-grid">
        {SCENARIO_METRICS.map((m) => (
          <div className="kpi-card" key={m.key}>
            <div className="kpi-label">{m.label}</div>
            <div className="kpi-value">{fmt(scenario[m.key])}{m.unit}</div>
            <div className="kpi-sub">Baseline: {fmt(baseline[m.key])}{m.unit}</div>
            <div className={'kpi-sub kpi-delta ' + (changePct[m.key] >= 0 ? 'up' : 'down')}>{changePct[m.key] >= 0 ? '▲' : '▼'} {Math.abs(changePct[m.key])}% change</div>
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
