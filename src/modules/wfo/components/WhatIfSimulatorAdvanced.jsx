import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../../core/hooks/useApp.js'
import { fmt, genKpiValue, hashSeed, getWeeksForQuarter } from '../lib/mockGenerators.js'
import { getColors } from '../../../shared/themes/colors.js'
import { barDataLabels } from '../lib/datalabels.js'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'
import Icon from '../../../shared/components/Icon.jsx'
import {
  DEFAULT_AHT_MINUTES, DEFAULT_SHRINKAGE_PCT, DEFAULT_TARGET_SL_PCT,
  computeStaffing, buildTornadoRows, buildRangeRows,
} from '../lib/whatIfModel.js'
import { loadScenarios, saveScenario, deleteScenario } from '../lib/scenarioStorage.js'
import WhatIfHeadcountGap from './WhatIfHeadcountGap.jsx'
import WhatIfTornadoCard from './WhatIfTornadoCard.jsx'
import WhatIfRangeCard from './WhatIfRangeCard.jsx'
import WhatIfScenarioCompare from './WhatIfScenarioCompare.jsx'

// Same 8 independent metrics as the original What-If Simulator tab — unchanged behavior.
// Volume and Headcount also double as inputs to the real Erlang C staffing model below.
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
const DEFAULT_STAFFING_INPUTS = {
  ahtMinutes: DEFAULT_AHT_MINUTES,
  shrinkagePct: DEFAULT_SHRINKAGE_PCT,
  targetSlPct: DEFAULT_TARGET_SL_PCT,
}

export default function WhatIfSimulatorAdvanced() {
  const { theme, activeRegions, ccoFilters, ccoView } = useApp()
  const colors = getColors(theme)
  const { subRegion, quarter, week, classification } = ccoFilters

  const [changePct, setChangePct] = useState(DEFAULT_CHANGES)
  const [staffingInputs, setStaffingInputs] = useState(DEFAULT_STAFFING_INPUTS)
  const [savedScenarios, setSavedScenarios] = useState(() => loadScenarios())

  function setChange(key, value) {
    setChangePct((prev) => ({ ...prev, [key]: value }))
  }
  function setStaffingInput(key, value) {
    setStaffingInputs((prev) => ({ ...prev, [key]: value }))
  }
  function reset() {
    setChangePct(DEFAULT_CHANGES)
    setStaffingInputs(DEFAULT_STAFFING_INPUTS)
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

  const staffingScenarioInputs = useMemo(() => ({
    volume: scenario.volume,
    ahtMinutes: staffingInputs.ahtMinutes,
    shrinkagePct: staffingInputs.shrinkagePct,
    targetSlPct: staffingInputs.targetSlPct,
    ccoView,
    currentHeadcount: scenario.headcount,
  }), [scenario.volume, scenario.headcount, staffingInputs, ccoView])

  const staffing = useMemo(() => computeStaffing(staffingScenarioInputs), [staffingScenarioInputs])
  const tornadoRows = useMemo(() => buildTornadoRows(staffingScenarioInputs), [staffingScenarioInputs])
  const rangeRows = useMemo(() => buildRangeRows(staffingScenarioInputs), [staffingScenarioInputs])

  const currentSnapshot = useMemo(() => ({
    inputs: {
      volumePct: changePct.volume,
      ahtMinutes: staffingInputs.ahtMinutes,
      shrinkagePct: staffingInputs.shrinkagePct,
      targetSlPct: staffingInputs.targetSlPct,
    },
    results: {
      requiredHeadcount: staffing.requiredHeadcount,
      currentHeadcount: Math.round(scenario.headcount),
      gap: staffing.gap,
    },
  }), [changePct.volume, staffingInputs, staffing, scenario.headcount])

  function handleSaveScenario(name) {
    const entry = {
      id: Date.now().toString(36),
      name: name || `Scenario ${savedScenarios.length + 1}`,
      savedAt: new Date().toISOString(),
      ccoViewLabel: [ccoView === 'quarterly' ? 'Quarterly' : 'Weekly', quarter.join('/'), week.join('/')].join(' · '),
      ...currentSnapshot,
    }
    setSavedScenarios(saveScenario(entry))
  }
  function handleDeleteScenario(id) {
    setSavedScenarios(deleteScenario(id))
  }

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
        <h2>
          Staffing Model Inputs <InfoBtn tip="<strong>Purpose</strong>These three inputs, together with the Volume slider above, feed the real Erlang C staffing formula (core/utils/erlangC.js) below — the only genuinely causal relationship in this simulator. Case Rate, CPSR, TCD, Cases, Orders and CRW are intentionally left independent (see the Staffing Gap card's tooltip for why)." />
        </h2>
      </div>
      <div className="card">
        <div className="wis-grid">
          <div className="wis-control">
            <div className="wis-control-head"><span>Average Handle Time</span><b>{staffingInputs.ahtMinutes} min</b></div>
            <input type="range" min={5} max={40} step={1} value={staffingInputs.ahtMinutes} onChange={(e) => setStaffingInput('ahtMinutes', Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Shrinkage</span><b>{staffingInputs.shrinkagePct}%</b></div>
            <input type="range" min={0} max={60} step={1} value={staffingInputs.shrinkagePct} onChange={(e) => setStaffingInput('shrinkagePct', Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Target Service Level</span><b>{staffingInputs.targetSlPct}%</b></div>
            <input type="range" min={50} max={99} step={1} value={staffingInputs.targetSlPct} onChange={(e) => setStaffingInput('targetSlPct', Number(e.target.value))} />
          </div>
        </div>
      </div>

      <WhatIfHeadcountGap
        requiredHeadcount={staffing.requiredHeadcount}
        currentHeadcount={Math.round(scenario.headcount)}
        gap={staffing.gap}
        achieved={staffing.achieved}
      />

      <div className="section-div">
        <h2>Projected Impact</h2>
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

      <div className="section-div">
        <h2>Sensitivity &amp; Range</h2>
      </div>
      <div className="s-grid">
        <WhatIfTornadoCard rows={tornadoRows} colors={colors} />
        <WhatIfRangeCard rows={rangeRows} colors={colors} />
      </div>

      <div className="section-div">
        <h2>Scenario Compare</h2>
      </div>
      <WhatIfScenarioCompare
        savedScenarios={savedScenarios}
        currentSnapshot={currentSnapshot}
        onSave={handleSaveScenario}
        onDelete={handleDeleteScenario}
        colors={colors}
      />
    </div>
  )
}
