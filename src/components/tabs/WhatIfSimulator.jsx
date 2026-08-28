import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { fmt, genKpiValue, hashSeed, getWeeksForQuarter } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels } from '../../charts/datalabels.js'
import { evaluateStaffing, requiredAgents } from '../../utils/erlangC.js'
import InfoBtn from '../common/InfoBtn.jsx'

const OPERATING_HOURS = 9
const TARGET_SECOND_OPTIONS = [10, 20, 30, 60]
// TCD in this app is an aggregate "total contact duration" figure, not a clean
// per-contact handle time — dividing it by Contacts produces an unrealistic ~20min
// AHT. Use a typical contact-center AHT instead so the baseline (0% change) scenario
// is a believable starting point rather than an artificially "understaffed" one.
const BASELINE_AHT_SECONDS = 480

function getPeriodsForView(view, quarters, weeks) {
  const qList = (quarters || []).filter((q) => q !== 'All')
  const activeQuarters = qList.length ? qList : ['FQ1', 'FQ2', 'FQ3', 'FQ4']
  const allWeeks = activeQuarters.flatMap((q) => getWeeksForQuarter(q))
  const wList = (weeks || []).filter((w) => w !== 'All')
  if (view === 'weekly') return wList.length ? wList : allWeeks
  return activeQuarters
}

function fmtSeconds(s) {
  if (!isFinite(s)) return '∞'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function WhatIfSimulator() {
  const { theme, activeRegions, ccoFilters, ccoView } = useApp()
  const colors = getColors(theme)
  const { subRegion, quarter, week, classification } = ccoFilters

  const [volumePct, setVolumePct] = useState(0)
  const [ahtPct, setAhtPct] = useState(0)
  const [shrinkagePct, setShrinkagePct] = useState(30)
  const [targetSlPct, setTargetSlPct] = useState(80)
  const [targetSeconds, setTargetSeconds] = useState(20)

  function reset() {
    setVolumePct(0)
    setAhtPct(0)
    setShrinkagePct(30)
    setTargetSlPct(80)
    setTargetSeconds(20)
  }

  // Baseline — pulled live from the same generation formula CCO Overview uses, so this
  // simulation is grounded in the numbers actually shown there, not invented separately.
  const baseline = useMemo(() => {
    const seed = hashSeed(subRegion.join(',') + quarter.join(',') + week.join(',') + classification.join(',') + activeRegions.join(',') + ccoView)
    const periods = getPeriodsForView(ccoView, quarter, week)
    const li = periods.length - 1
    const dailyVolume = genKpiValue(2200, seed + li * 7, 0).actual
    const reportedSla = genKpiValue(91, seed + li * 7 + 4 * 3, 1).actual
    const currentHeadcount = Math.round(genKpiValue(65, seed + 900).actual)
    return { dailyVolume, reportedSla, currentHeadcount, ahtSeconds: BASELINE_AHT_SECONDS }
  }, [subRegion, quarter, week, classification, activeRegions, ccoView])

  const scenario = useMemo(() => {
    const adjustedVolume = baseline.dailyVolume * (1 + volumePct / 100)
    const adjustedAht = baseline.ahtSeconds * (1 + ahtPct / 100)
    const hourlyVolume = adjustedVolume / OPERATING_HOURS
    const targetServiceLevel = targetSlPct / 100
    const reqAgents = requiredAgents({ volume: hourlyVolume, ahtSeconds: adjustedAht, intervalSeconds: 3600, targetSeconds, targetServiceLevel })
    const requiredHeadcount = Math.ceil(reqAgents / (1 - shrinkagePct / 100))
    const gap = requiredHeadcount - baseline.currentHeadcount
    const agentsOnFloor = baseline.currentHeadcount * (1 - shrinkagePct / 100)
    const atCurrentStaffing = evaluateStaffing({ volume: hourlyVolume, ahtSeconds: adjustedAht, intervalSeconds: 3600, agents: agentsOnFloor, targetSeconds })
    return { adjustedVolume, adjustedAht, hourlyVolume, reqAgents, requiredHeadcount, gap, atCurrentStaffing }
  }, [baseline, volumePct, ahtPct, shrinkagePct, targetSlPct, targetSeconds])

  const headcountChart = useMemo(() => ({
    data: {
      labels: ['Current Headcount', 'Required Headcount'],
      datasets: [{
        label: 'Agents',
        data: [baseline.currentHeadcount, scenario.requiredHeadcount],
        backgroundColor: [colors.textSecondary, scenario.gap > 0 ? colors.accentRed : colors.accentGreen],
        borderRadius: 4,
        datalabels: barDataLabels('', colors.textPrimary),
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  }), [baseline, scenario, colors])

  const slPct = scenario.atCurrentStaffing.serviceLevel * 100
  const slOk = slPct >= targetSlPct

  return (
    <div className="tab-panel active">
      <div className="ai-story">
        <div className="ai-icon-box">🧮</div>
        <div>
          <div className="ai-story-title">What-If Result</div>
          <div className="ai-story-text">
            At {volumePct >= 0 ? '+' : ''}{volumePct}% volume, {ahtPct >= 0 ? '+' : ''}{ahtPct}% AHT and {shrinkagePct}% shrinkage, you'd need{' '}
            <strong>{fmt(scenario.requiredHeadcount)} agents</strong> ({scenario.gap >= 0 ? '+' : ''}{fmt(scenario.gap)} vs today's {fmt(baseline.currentHeadcount)}) to hit{' '}
            {targetSlPct}% service level in {targetSeconds}s. Keeping today's headcount would land service level at{' '}
            <strong>{fmt(slPct)}%</strong>.
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>
          Baseline <InfoBtn tip={`<strong>Purpose</strong>Contact Volume and Headcount are live from CCO Overview's ${ccoView} view. Avg Handle Time uses a typical ${Math.round(BASELINE_AHT_SECONDS / 60)}-minute assumption (this app's TCD figure isn't a clean per-contact handle time). Volume is spread evenly across a ${OPERATING_HOURS}-hour operating day.`} />
        </h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Contact Volume</div>
          <div className="kpi-value">{fmt(baseline.dailyVolume)}</div>
          <div className="kpi-sub">Contacts Offered, Actual</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Handle Time</div>
          <div className="kpi-value">{fmtSeconds(baseline.ahtSeconds)}</div>
          <div className="kpi-sub">Typical assumption</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Current Headcount</div>
          <div className="kpi-value">{fmt(baseline.currentHeadcount)}</div>
          <div className="kpi-sub">Key Metrics Summary</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Reported SLA</div>
          <div className="kpi-value">{fmt(baseline.reportedSla)}%</div>
          <div className="kpi-sub">Overall SLA, Actual</div>
        </div>
      </div>

      <div className="section-div">
        <h2>Scenario Inputs</h2>
      </div>
      <div className="card">
        <div className="wis-grid">
          <div className="wis-control">
            <div className="wis-control-head"><span>Volume Change</span><b>{volumePct >= 0 ? '+' : ''}{volumePct}%</b></div>
            <input type="range" min={-30} max={50} step={5} value={volumePct} onChange={(e) => setVolumePct(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>AHT Change</span><b>{ahtPct >= 0 ? '+' : ''}{ahtPct}%</b></div>
            <input type="range" min={-20} max={30} step={5} value={ahtPct} onChange={(e) => setAhtPct(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Shrinkage</span><b>{shrinkagePct}%</b></div>
            <input type="range" min={15} max={45} step={1} value={shrinkagePct} onChange={(e) => setShrinkagePct(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Target Service Level</span><b>{targetSlPct}%</b></div>
            <input type="range" min={60} max={95} step={5} value={targetSlPct} onChange={(e) => setTargetSlPct(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Answered Within</span><b>{targetSeconds}s</b></div>
            <div className="plan-sel">
              {TARGET_SECOND_OPTIONS.map((s) => (
                <button key={s} type="button" className={'plan-btn' + (targetSeconds === s ? ' active' : '')} onClick={() => setTargetSeconds(s)}>{s}s</button>
              ))}
            </div>
          </div>
        </div>
        <div className="filter-clear-row">
          <button type="button" className="clear-all-btn" onClick={reset}>✕ Reset to Baseline</button>
        </div>
      </div>

      <div className="section-div">
        <h2>Simulation Results</h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Required Headcount</div>
          <div className="kpi-value">{fmt(scenario.requiredHeadcount)}</div>
          <div className="kpi-sub">{scenario.gap >= 0 ? '▲' : '▼'} {fmt(Math.abs(scenario.gap))} vs current</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Projected SLA (current staffing)</div>
          <div className="kpi-value">{fmt(slPct)}%</div>
          <div className="kpi-sub">{slOk ? '▲ Meets target' : '▼ Below target'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Occupancy (current staffing)</div>
          <div className="kpi-value">{fmt(scenario.atCurrentStaffing.occupancy * 100)}%</div>
          <div className="kpi-sub">Agent utilization</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Speed of Answer</div>
          <div className="kpi-value">{fmtSeconds(scenario.atCurrentStaffing.asaSeconds)}</div>
          <div className="kpi-sub">Current staffing</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            Current vs Required Headcount <InfoBtn tip="<strong>Purpose</strong>Erlang C staffing model — required agents to hit the target service level under this scenario, vs today's headcount." />
          </div>
        </div>
        <div className="chart-container" style={{ height: 140 }}>
          <Bar data={headcountChart.data} options={headcountChart.options} />
        </div>
      </div>
    </div>
  )
}
