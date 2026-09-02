import { useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { fmt, genKpiValue, hashSeed, getWeeksForQuarter, generateEpicenterRoster, REGIONS } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { barDataLabels, lineDataLabels } from '../../charts/datalabels.js'
import { evaluateStaffing, requiredAgents } from '../../utils/erlangC.js'
import InfoBtn from '../common/InfoBtn.jsx'

const OPERATING_HOURS = 9
const TARGET_SECOND_OPTIONS = [10, 20, 30, 60]
// TCD in this app is an aggregate "total contact duration" figure, not a clean
// per-contact handle time — dividing it by Contacts produces an unrealistic ~20min
// AHT. Use a typical contact-center AHT instead so the baseline (0% change) scenario
// is a believable starting point rather than an artificially "understaffed" one.
const BASELINE_AHT_SECONDS = 480
const HIRING_WEEKS = 12
const BACKLOG_WEEKS = 8

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
  const [ospTargetPct, setOspTargetPct] = useState(35)
  const [attritionPct, setAttritionPct] = useState(3)
  const [rampWeeks, setRampWeeks] = useState(6)
  const [weeklyHires, setWeeklyHires] = useState(2)
  const [backlogChangePct, setBacklogChangePct] = useState(0)
  const [inflowPct, setInflowPct] = useState(20)

  function reset() {
    setVolumePct(0); setAhtPct(0); setShrinkagePct(30); setTargetSlPct(80); setTargetSeconds(20)
    setOspTargetPct(35); setAttritionPct(3); setRampWeeks(6); setWeeklyHires(2)
    setBacklogChangePct(0); setInflowPct(20)
  }

  // Baseline — pulled live from the same generation formulas CCO Overview and
  // Epi HC use, so this simulation is grounded in the numbers actually shown
  // there, not invented separately.
  const seed = useMemo(
    () => hashSeed(subRegion.join(',') + quarter.join(',') + week.join(',') + classification.join(',') + activeRegions.join(',') + ccoView),
    [subRegion, quarter, week, classification, activeRegions, ccoView],
  )
  const baseline = useMemo(() => {
    const periods = getPeriodsForView(ccoView, quarter, week)
    const li = periods.length - 1
    const dailyVolume = genKpiValue(2200, seed + li * 7, 0).actual
    const reportedSla = genKpiValue(91, seed + li * 7 + 4 * 3, 1).actual
    const assigned = Math.round(genKpiValue(2800, seed + 401).actual)
    const unassigned = Math.round(genKpiValue(650, seed + 402).actual)
    return { dailyVolume, reportedSla, ahtSeconds: BASELINE_AHT_SECONDS, assigned, unassigned }
  }, [seed, ccoView, quarter, week])

  const roster = useMemo(() => {
    const regions = activeRegions.includes('All') ? REGIONS : activeRegions
    return regions.flatMap((r) => generateEpicenterRoster(r))
  }, [activeRegions])
  const currentHeadcount = roster.length
  const dbCount = useMemo(() => roster.filter((a) => a.dbOsp === 'DB').length, [roster])
  const ospCount = currentHeadcount - dbCount
  const ospPct = currentHeadcount ? (ospCount / currentHeadcount) * 100 : 0

  // Section 1 — Staffing & Service Level (Erlang C)
  const scenario = useMemo(() => {
    const adjustedVolume = baseline.dailyVolume * (1 + volumePct / 100)
    const adjustedAht = baseline.ahtSeconds * (1 + ahtPct / 100)
    const hourlyVolume = adjustedVolume / OPERATING_HOURS
    const targetServiceLevel = targetSlPct / 100
    const reqAgents = requiredAgents({ volume: hourlyVolume, ahtSeconds: adjustedAht, intervalSeconds: 3600, targetSeconds, targetServiceLevel })
    const requiredHeadcount = Math.ceil(reqAgents / (1 - shrinkagePct / 100))
    const gap = requiredHeadcount - currentHeadcount
    const agentsOnFloor = currentHeadcount * (1 - shrinkagePct / 100)
    const atCurrentStaffing = evaluateStaffing({ volume: hourlyVolume, ahtSeconds: adjustedAht, intervalSeconds: 3600, agents: agentsOnFloor, targetSeconds })
    return { adjustedVolume, adjustedAht, hourlyVolume, reqAgents, requiredHeadcount, gap, atCurrentStaffing }
  }, [baseline, volumePct, ahtPct, shrinkagePct, targetSlPct, targetSeconds, currentHeadcount])

  const headcountChart = useMemo(() => ({
    data: {
      labels: ['Current Headcount', 'Required Headcount'],
      datasets: [{
        label: 'Agents',
        data: [currentHeadcount, scenario.requiredHeadcount],
        backgroundColor: [colors.textSecondary, scenario.gap > 0 ? colors.accentRed : colors.accentGreen],
        borderRadius: 4,
        datalabels: barDataLabels('', colors.textPrimary),
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  }), [currentHeadcount, scenario, colors])

  // SLA sensitivity — the service level you'd hit at a *range* of staffing
  // levels around the required number, not just the single current-vs-required
  // point, so trade-offs (e.g. "what if we're 5 short?") are visible directly.
  const slaSensitivityChart = useMemo(() => {
    const center = Math.max(3, scenario.requiredHeadcount)
    const lo = Math.max(1, center - 10)
    const hi = center + 12
    const points = []
    for (let hc = lo; hc <= hi; hc++) points.push(hc)
    const slValues = points.map((hc) => {
      const onFloor = hc * (1 - shrinkagePct / 100)
      const r = evaluateStaffing({ volume: scenario.hourlyVolume, ahtSeconds: scenario.adjustedAht, intervalSeconds: 3600, agents: onFloor, targetSeconds })
      return Math.round(r.serviceLevel * 1000) / 10
    })
    return {
      data: {
        labels: points.map(String),
        datasets: [
          { label: 'Projected SLA', data: slValues, borderColor: colors.accentBlue, backgroundColor: colors.accentBlue, tension: 0.3, pointRadius: 2, borderWidth: 2, datalabels: { display: false } },
          { label: `Target (${targetSlPct}%)`, data: points.map(() => targetSlPct), borderColor: colors.accentRed, borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5, datalabels: { display: false } },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { title: { display: true, text: 'Headcount', font: { size: 9 } }, ticks: { font: { size: 8 }, maxTicksLimit: 10 } },
          y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } },
        },
      },
    }
  }, [scenario, shrinkagePct, targetSeconds, targetSlPct, colors])

  // Section 2 — Hiring & Ramp Plan
  const hiringPlan = useMemo(() => {
    const weeklyAttritionRate = attritionPct / 100 / 4.33
    let hc = currentHeadcount
    const rows = []
    for (let w = 1; w <= HIRING_WEEKS; w++) {
      hc = hc * (1 - weeklyAttritionRate) + weeklyHires
      // New hires ramp linearly to full productivity over `rampWeeks`; approximate
      // the still-ramping cohort's shortfall as half of however many were hired
      // within the last rampWeeks (their average completion is ~50%).
      const rampingCount = weeklyHires * Math.min(w, rampWeeks)
      const effective = hc - rampingCount * 0.5
      rows.push({ week: w, headcount: Math.round(hc), effective: Math.round(effective) })
    }
    const closeWeek = rows.find((r) => r.effective >= scenario.requiredHeadcount)
    return { rows, weeksToClose: closeWeek ? closeWeek.week : null }
  }, [currentHeadcount, attritionPct, weeklyHires, rampWeeks, scenario.requiredHeadcount])

  const hiringPlanChart = useMemo(() => ({
    data: {
      labels: hiringPlan.rows.map((r) => `W${r.week}`),
      datasets: [
        { label: 'Headcount', data: hiringPlan.rows.map((r) => r.headcount), borderColor: colors.textSecondary, backgroundColor: colors.textSecondary, tension: 0.3, pointRadius: 2, borderWidth: 2, datalabels: { display: false } },
        { label: 'Effective (Ramp-Adjusted)', data: hiringPlan.rows.map((r) => r.effective), borderColor: colors.accentBlue, backgroundColor: colors.accentBlue, tension: 0.3, pointRadius: 2, borderWidth: 2, datalabels: lineDataLabels('', colors.accentBlue) },
        { label: 'Required', data: hiringPlan.rows.map(() => scenario.requiredHeadcount), borderColor: colors.accentRed, borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5, datalabels: { display: false } },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
      scales: { y: { beginAtZero: false, grace: '15%' } },
    },
  }), [hiringPlan, scenario.requiredHeadcount, colors])

  // Section 3 — Sourcing Mix
  const sourcingTarget = useMemo(() => {
    const totalTarget = scenario.requiredHeadcount
    const targetOsp = Math.round(totalTarget * (ospTargetPct / 100))
    const targetDb = totalTarget - targetOsp
    return { targetOsp, targetDb, deltaOsp: targetOsp - ospCount, deltaDb: targetDb - dbCount }
  }, [scenario.requiredHeadcount, ospTargetPct, ospCount, dbCount])

  const sourcingChart = useMemo(() => ({
    data: {
      labels: ['DB', 'OSP'],
      datasets: [
        { label: 'Current', data: [dbCount, ospCount], backgroundColor: colors.textSecondary, borderRadius: 4, datalabels: barDataLabels('', colors.textPrimary) },
        { label: 'Target', data: [sourcingTarget.targetDb, sourcingTarget.targetOsp], backgroundColor: colors.accentOrange, borderRadius: 4, datalabels: barDataLabels('', colors.accentOrange) },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, grace: '15%' } },
    },
  }), [dbCount, ospCount, sourcingTarget, colors])

  // Section 4 — Backlog Clearance
  const backlogPlan = useMemo(() => {
    // Baseline assumption: at today's pace, current unassigned backlog would
    // clear in ~4 weeks — stated explicitly so the assumption is visible, not
    // hidden inside the math.
    const baselineWeeklyClearance = baseline.unassigned / 4
    const clearance = baselineWeeklyClearance * (1 + backlogChangePct / 100)
    const weeklyInflow = baseline.unassigned * (inflowPct / 100)
    let scenarioBl = baseline.unassigned
    let baselineBl = baseline.unassigned
    const rows = []
    for (let w = 1; w <= BACKLOG_WEEKS; w++) {
      scenarioBl = Math.max(0, scenarioBl + weeklyInflow - clearance)
      baselineBl = Math.max(0, baselineBl + weeklyInflow - baselineWeeklyClearance)
      rows.push({ week: w, scenario: Math.round(scenarioBl), baseline: Math.round(baselineBl) })
    }
    const clearedWeek = rows.find((r) => r.scenario <= 0)
    const growing = clearance <= weeklyInflow
    return { rows, weeksToClear: clearedWeek ? clearedWeek.week : null, growing }
  }, [baseline.unassigned, backlogChangePct, inflowPct])

  const backlogChart = useMemo(() => ({
    data: {
      labels: backlogPlan.rows.map((r) => `W${r.week}`),
      datasets: [
        { label: 'No Change', data: backlogPlan.rows.map((r) => r.baseline), borderColor: colors.textSecondary, backgroundColor: colors.textSecondary, tension: 0.3, pointRadius: 2, borderWidth: 2, borderDash: [5, 4], datalabels: { display: false } },
        { label: 'This Scenario', data: backlogPlan.rows.map((r) => r.scenario), borderColor: colors.accentPurple, backgroundColor: colors.accentPurple, tension: 0.3, pointRadius: 2, borderWidth: 2, datalabels: lineDataLabels('', colors.accentPurple) },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } },
    },
  }), [backlogPlan, colors])

  const slPct = scenario.atCurrentStaffing.serviceLevel * 100
  const slOk = slPct >= targetSlPct

  return (
    <div className="tab-panel active">
      <div className="ai-story">
        <div className="ai-icon-box">🧮</div>
        <div>
          <div className="ai-story-title">Scenario Summary</div>
          <div className="ai-story-text">
            At {volumePct >= 0 ? '+' : ''}{volumePct}% volume, {ahtPct >= 0 ? '+' : ''}{ahtPct}% AHT and {shrinkagePct}% shrinkage, you'd need{' '}
            <strong>{fmt(scenario.requiredHeadcount)} agents</strong> ({scenario.gap >= 0 ? '+' : ''}{fmt(scenario.gap)} vs today's {fmt(currentHeadcount)}) to hit{' '}
            {targetSlPct}% service level in {targetSeconds}s — keeping today's headcount lands at <strong>{fmt(slPct)}%</strong>.{' '}
            At {weeklyHires} hires/week with {attritionPct}% monthly attrition, that gap closes in{' '}
            <strong>{hiringPlan.weeksToClose ? `${hiringPlan.weeksToClose} weeks` : `>${HIRING_WEEKS} weeks`}</strong>.{' '}
            The current backlog {backlogPlan.growing ? 'keeps growing' : `clears in ${backlogPlan.weeksToClear ? `${backlogPlan.weeksToClear} weeks` : `>${BACKLOG_WEEKS} weeks`}`} at this scenario's resolution pace.
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>
          Baseline <InfoBtn tip={`<strong>Purpose</strong>Contact Volume, Reported SLA and Backlog are live from CCO Overview's ${ccoView} view; Headcount and DB/OSP split are live from Epi HC's roster generation. Avg Handle Time uses a typical ${Math.round(BASELINE_AHT_SECONDS / 60)}-minute assumption. Volume is spread evenly across a ${OPERATING_HOURS}-hour operating day.`} />
        </h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Contact Volume</div>
          <div className="kpi-value">{fmt(baseline.dailyVolume)}</div>
          <div className="kpi-sub">Contacts Offered, Actual</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Current Headcount</div>
          <div className="kpi-value">{fmt(currentHeadcount)}</div>
          <div className="kpi-sub">{fmt(dbCount)} DB / {fmt(ospCount)} OSP ({fmt(ospPct)}%)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Reported SLA</div>
          <div className="kpi-value">{fmt(baseline.reportedSla)}%</div>
          <div className="kpi-sub">Overall SLA, Actual</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Backlog</div>
          <div className="kpi-value">{fmt(baseline.assigned + baseline.unassigned)}</div>
          <div className="kpi-sub">{fmt(baseline.unassigned)} unassigned</div>
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
          <div className="wis-control">
            <div className="wis-control-head"><span>Monthly Attrition</span><b>{attritionPct}%</b></div>
            <input type="range" min={0} max={10} step={0.5} value={attritionPct} onChange={(e) => setAttritionPct(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Hires / Week</span><b>{weeklyHires}</b></div>
            <input type="range" min={0} max={15} step={1} value={weeklyHires} onChange={(e) => setWeeklyHires(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Ramp Time</span><b>{rampWeeks} wks</b></div>
            <input type="range" min={2} max={12} step={1} value={rampWeeks} onChange={(e) => setRampWeeks(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Target OSP Mix</span><b>{ospTargetPct}%</b></div>
            <input type="range" min={0} max={100} step={5} value={ospTargetPct} onChange={(e) => setOspTargetPct(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Backlog Resolution</span><b>{backlogChangePct >= 0 ? '+' : ''}{backlogChangePct}%</b></div>
            <input type="range" min={-30} max={50} step={5} value={backlogChangePct} onChange={(e) => setBacklogChangePct(Number(e.target.value))} />
          </div>
          <div className="wis-control">
            <div className="wis-control-head"><span>Weekly Backlog Inflow</span><b>{inflowPct}%</b></div>
            <input type="range" min={0} max={50} step={5} value={inflowPct} onChange={(e) => setInflowPct(Number(e.target.value))} />
          </div>
        </div>
        <div className="filter-clear-row">
          <button type="button" className="clear-all-btn" onClick={reset}>✕ Reset to Baseline</button>
        </div>
      </div>

      <div className="section-div">
        <h2>
          Staffing &amp; Service Level <InfoBtn tip="<strong>Purpose</strong>Erlang C staffing model — required agents to hit the target service level under this scenario, and the service level you'd get across a range of staffing levels around that number." />
        </h2>
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
      <div className="s-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Current vs Required Headcount</div>
          </div>
          <div className="chart-container" style={{ height: 180 }}>
            <Bar data={headcountChart.data} options={headcountChart.options} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">SLA Sensitivity by Staffing Level</div>
          </div>
          <div className="chart-container" style={{ height: 180 }}>
            <Line data={slaSensitivityChart.data} options={slaSensitivityChart.options} />
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>
          Hiring &amp; Ramp Plan <InfoBtn tip="<strong>Purpose</strong>Projects headcount over 12 weeks given a constant hiring rate and monthly attrition. New hires ramp to full productivity linearly over the ramp time; the 'Effective' line discounts the still-ramping cohort accordingly." />
        </h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Weeks to Close Gap</div>
          <div className="kpi-value">{hiringPlan.weeksToClose ?? `>${HIRING_WEEKS}`}</div>
          <div className="kpi-sub">At {weeklyHires} hires/week</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Hires (12 wks)</div>
          <div className="kpi-value">{fmt(weeklyHires * HIRING_WEEKS)}</div>
          <div className="kpi-sub">Gross, before attrition</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Net Headcount Change</div>
          <div className="kpi-value">{hiringPlan.rows.length ? fmt(hiringPlan.rows[hiringPlan.rows.length - 1].headcount - currentHeadcount) : 0}</div>
          <div className="kpi-sub">After 12 weeks of attrition</div>
        </div>
      </div>
      <div className="s-grid full">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Projected Headcount — 12 Week Plan</div>
          </div>
          <div className="chart-container" style={{ height: 220 }}>
            <Line data={hiringPlanChart.data} options={hiringPlanChart.options} />
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>
          Sourcing Mix <InfoBtn tip="<strong>Purpose</strong>Applies a target OSP % to the required headcount from the staffing scenario above, showing how many DB and OSP agents that implies vs today's split." />
        </h2>
      </div>
      <div className="s-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Current vs Target — DB / OSP</div>
          </div>
          <div className="chart-container" style={{ height: 200 }}>
            <Bar data={sourcingChart.data} options={sourcingChart.options} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Delta to Target</div>
          </div>
          <div className="kpi-grid" style={{ padding: 12 }}>
            <div className="kpi-card">
              <div className="kpi-label">DB Δ</div>
              <div className="kpi-value">{sourcingTarget.deltaDb >= 0 ? '+' : ''}{fmt(sourcingTarget.deltaDb)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">OSP Δ</div>
              <div className="kpi-value">{sourcingTarget.deltaOsp >= 0 ? '+' : ''}{fmt(sourcingTarget.deltaOsp)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-div">
        <h2>
          Backlog Clearance <InfoBtn tip="<strong>Purpose</strong>Projects the unassigned backlog over 8 weeks under this scenario's resolution-capacity change and a weekly new-inflow assumption (% of today's unassigned backlog), against a 'No Change' baseline for comparison." />
        </h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Weeks to Clear</div>
          <div className="kpi-value">{backlogPlan.growing ? 'Growing' : (backlogPlan.weeksToClear ?? `>${BACKLOG_WEEKS}`)}</div>
          <div className="kpi-sub">{backlogPlan.growing ? 'Inflow exceeds clearance' : 'This scenario'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Unassigned Today</div>
          <div className="kpi-value">{fmt(baseline.unassigned)}</div>
          <div className="kpi-sub">Baseline, live from CCO Overview</div>
        </div>
      </div>
      <div className="s-grid full">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Unassigned Backlog — 8 Week Projection</div>
          </div>
          <div className="chart-container" style={{ height: 200 }}>
            <Line data={backlogChart.data} options={backlogChart.options} />
          </div>
        </div>
      </div>
    </div>
  )
}
