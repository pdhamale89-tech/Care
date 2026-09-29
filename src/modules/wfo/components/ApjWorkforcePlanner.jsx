import { useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  APJ_COUNTRIES, defaultStartQuarter, getQuarters,
  buildDummyData, ensureQuarters, calcAllCountries, f0, f1, f2, fp,
} from '../lib/apjWorkforceData.js'
import './ApjWorkforcePlanner.css'

// Ported from a standalone reference tool ("APJ Workforce Planner") supplied as a
// finished HTML file, kept visually as-is (its own Dell navy/blue theme, scoped under
// .apj-wfp so it can never collide with Care's own theme.css). The Excel import/export
// machinery from that source tool is intentionally left out per request — this seeds the
// same data shape with fixed dummy numbers (src/modules/wfo/lib/apjWorkforceData.js)
// instead of requiring an uploaded file, so every screen works with no import step.

function safeNumber(raw) {
  if (raw === '' || raw === '-' || /\.$/.test(raw)) return undefined
  const n = Number(raw)
  return Number.isNaN(n) ? undefined : n
}

function QuarterBar({ quarters, selQ, onSelect }) {
  return (
    <div className="apj-qbar">
      <span className="apj-ql">Quarter:</span>
      {quarters.map((q, i) => (
        <button key={q.key} type="button" className={'apj-qp' + (i === selQ ? ' on' : '')} onClick={() => onSelect(i)}>
          {q.q}<span className="apj-qs">{q.fy}</span>
        </button>
      ))}
    </div>
  )
}

function RegionBar({ selReg, onSelect }) {
  return (
    <div className="apj-qbar">
      <span className="apj-ql">Region:</span>
      <button type="button" className={'apj-qp' + (selReg === 'ALL' ? ' on' : '')} onClick={() => onSelect('ALL')}>APJ Total</button>
      {APJ_COUNTRIES.map((c) => (
        <button key={c.id} type="button" className={'apj-qp' + (selReg === c.id ? ' on' : '')} onClick={() => onSelect(c.id)}>{c.name}</button>
      ))}
    </div>
  )
}

const CHART_OPT_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false, labels: { font: { family: 'Arial' } } } },
  scales: {
    y: { beginAtZero: true, ticks: { font: { family: 'Arial', size: 10 } } },
    x: { ticks: { font: { family: 'Arial', size: 10 } } },
  },
}
const CHART_OPT_LEGEND = {
  ...CHART_OPT_BASE,
  plugins: { legend: { position: 'top', labels: { font: { family: 'Arial', size: 10, weight: 'bold' } } } },
}

const QUICK_SCENARIOS = [
  { key: 'growth', label: 'High Growth (+30% Orders)', mods: { orders: 30 }, text: 'High Growth Scenario', desc: 'Orders increase by 30% — What staffing is needed?' },
  { key: 'efficiency', label: 'Efficiency (+20% CRW)', mods: { crw: 20 }, text: 'Efficiency Gain Scenario', desc: 'CRW productivity improves by 20% — HC reduction potential' },
  { key: 'crisis', label: 'Crisis (+40% CR, +30% CPSR)', mods: { caserate: 40, cpsr: 30 }, text: 'Support Crisis Scenario', desc: 'Case rate +40%, CPSR +30% — Emergency staffing needs' },
  { key: 'optimistic', label: 'Best Case (+20% Ord, +15% CRW)', mods: { orders: 20, crw: 15 }, text: 'Best Case Scenario', desc: 'Orders +20% with +15% productivity — Balanced growth' },
  { key: 'pessimistic', label: 'Worst Case (+40% Ord, +25% CR)', mods: { orders: 40, caserate: 25, cpsr: 20 }, text: 'Worst Case Scenario', desc: 'Orders +40%, CR +25%, CPSR +20% — Maximum HC pressure' },
]
const DEFAULT_MODS = { orders: 0, caserate: 0, cpsr: 0, crw: 0 }
const SENS_RANGE = [-40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

export default function ApjWorkforcePlanner() {
  const [dark, setDark] = useState(false)
  const [activeTab, setActiveTab] = useState('input')
  const [{ startQ, startFY }, setStart] = useState(defaultStartQuarter)
  const quarters = useMemo(() => getQuarters(startQ, startFY), [startQ, startFY])
  const [data, setData] = useState(() => buildDummyData(quarters))
  const [selQ, setSelQ] = useState(0)
  const [selReg, setSelReg] = useState('ALL')
  const [showDet, setShowDet] = useState(false)
  const [mods, setMods] = useState(DEFAULT_MODS)
  const [scenario, setScenario] = useState(null)

  const qk = quarters[selQ]?.key

  function handleStartChange(nextStartQ, nextStartFY) {
    const nextQuarters = getQuarters(nextStartQ, nextStartFY)
    setData((prev) => ensureQuarters(prev, nextQuarters))
    setStart({ startQ: nextStartQ, startFY: nextStartFY })
    setSelQ(0)
  }

  function updOrd(cid, field, raw) {
    const n = safeNumber(raw)
    if (n === undefined) return
    const num = Math.round(n)
    setData((prev) => ({
      ...prev,
      [cid]: { ...prev[cid], quarters: { ...prev[cid].quarters, [qk]: { ...prev[cid].quarters[qk], [field]: num } } },
    }))
  }
  function updPar(cid, field, raw) {
    const n = safeNumber(raw)
    if (n === undefined) return
    const val = (field === 'gsRate' || field === 'csRate') ? n / 100 : n
    setData((prev) => ({ ...prev, [cid]: { ...prev[cid], params: { ...prev[cid].params, [field]: val } } }))
  }
  function resetToSample() {
    if (!window.confirm('Reset all Data Input values back to the sample dataset?')) return
    setData(buildDummyData(quarters))
  }

  function setWI(field, val) {
    setMods((prev) => ({ ...prev, [field]: val }))
  }
  function resetWI() {
    setMods(DEFAULT_MODS)
    setScenario(null)
  }
  function applyScenario(key) {
    const s = QUICK_SCENARIOS.find((x) => x.key === key)
    setMods({ ...DEFAULT_MODS, ...s.mods })
    setScenario({ text: s.text, desc: s.desc })
  }

  function exportCSV() {
    let csv = 'APJ Capacity Plan\nInternal Use - Confidential\n\n'
    quarters.forEach((q) => {
      const all = calcAllCountries(data, q.key)
      const t = all.totals
      csv += `\n${q.label}\nCountry,GS Ord,CS Ord,Total,Cases,CR,TCD,CPSR,CRW,HC\n`
      APJ_COUNTRIES.forEach((c) => {
        const r = all.countries[c.id]
        csv += `${c.name},${r.gsO},${r.csO},${r.totO},${r.totCs.toFixed(2)},${(r.cr * 100).toFixed(2)}%,${r.totTCD.toFixed(2)},${r.cpsr.toFixed(2)},${r.crw},${r.hc}\n`
      })
      csv += `TOTAL,${t.gsO},${t.csO},${t.totO},${t.totCs.toFixed(2)},${(t.cr * 100).toFixed(2)}%,${t.totTCD.toFixed(2)},${t.cpsr.toFixed(2)},,${t.hc}\n`
    })
    if (mods.orders || mods.caserate || mods.cpsr || mods.crw) {
      csv += `\n\nWHAT-IF SCENARIO\nOrders: ${mods.orders > 0 ? '+' : ''}${mods.orders}%  Case Rate: ${mods.caserate > 0 ? '+' : ''}${mods.caserate}%  CPSR: ${mods.cpsr > 0 ? '+' : ''}${mods.cpsr}%  CRW: ${mods.crw > 0 ? '+' : ''}${mods.crw}%\n`
      quarters.forEach((q) => {
        const all = calcAllCountries(data, q.key, mods)
        const base = calcAllCountries(data, q.key)
        csv += `\n${q.label} (SCENARIO)\nCountry,Scen Orders,Scen Cases,Scen HC,Base HC,Delta\n`
        APJ_COUNTRIES.forEach((c) => {
          const r = all.countries[c.id]
          const br = base.countries[c.id]
          csv += `${c.name},${r.totO},${r.totCs.toFixed(2)},${r.hc},${br.hc},${r.hc - br.hc}\n`
        })
      })
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'APJ_Workforce_Plan.csv'
    a.click()
  }

  const [savedFlash, setSavedFlash] = useState(false)
  function saveData() {
    try {
      localStorage.setItem('apj_wfp_dell', JSON.stringify({ data, startQ, startFY }))
    } catch { /* private browsing / quota — nothing to persist, no-op */ }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const allForQ = useMemo(() => calcAllCountries(data, qk), [data, qk])
  const dSel = selReg === 'ALL' ? allForQ.totals : allForQ.countries[selReg]

  const trendSeries = useMemo(() => {
    const labels = quarters.map((q) => q.label)
    const tO = [], tC = [], tT = [], tH = []
    quarters.forEach((q) => {
      const a = calcAllCountries(data, q.key)
      const d = selReg === 'ALL' ? a.totals : a.countries[selReg]
      tO.push(d.totO); tC.push(d.totCs); tT.push(d.totTCD); tH.push(d.hc)
    })
    return { labels, tO, tC, tT, tH }
  }, [data, quarters, selReg])

  const wiBase = useMemo(() => calcAllCountries(data, qk), [data, qk])
  const wiScenario = useMemo(() => calcAllCountries(data, qk, mods), [data, qk, mods])
  const wiBaseSel = selReg === 'ALL' ? wiBase.totals : wiBase.countries[selReg]
  const wiScenSel = selReg === 'ALL' ? wiScenario.totals : wiScenario.countries[selReg]

  const impactMetrics = [
    { label: 'Total Orders', bv: wiBaseSel.totO, sv: wiScenSel.totO },
    { label: 'Total Cases', bv: wiBaseSel.totCs, sv: wiScenSel.totCs },
    { label: 'Total Contacts', bv: wiBaseSel.totTCD, sv: wiScenSel.totTCD },
    { label: 'Case Rate', bv: wiBaseSel.cr * 100, sv: wiScenSel.cr * 100, fmt: 'pct' },
    { label: 'Avg CPSR', bv: wiBaseSel.cpsr, sv: wiScenSel.cpsr, fmt: 'dec' },
    { label: 'HC Required', bv: wiBaseSel.hc, sv: wiScenSel.hc, hl: true },
  ]

  const sensitivity = useMemo(() => {
    const sensOrd = [], sensCR = [], sensCP = [], sensCW = []
    SENS_RANGE.forEach((v) => {
      const pick = (m) => (selReg === 'ALL' ? calcAllCountries(data, qk, m).totals : calcAllCountries(data, qk, m).countries[selReg])
      sensOrd.push(pick({ orders: v }).hc)
      sensCR.push(pick({ caserate: v }).hc)
      sensCP.push(pick({ cpsr: v }).hc)
      sensCW.push(pick({ crw: v }).hc)
    })
    return { sensOrd, sensCR, sensCP, sensCW }
  }, [data, qk, selReg])

  const wiTrend = useMemo(() => {
    const baseQ = [], scenQ = []
    quarters.forEach((q) => {
      const b = selReg === 'ALL' ? calcAllCountries(data, q.key).totals : calcAllCountries(data, q.key).countries[selReg]
      const s = selReg === 'ALL' ? calcAllCountries(data, q.key, mods).totals : calcAllCountries(data, q.key, mods).countries[selReg]
      baseQ.push(b.hc); scenQ.push(s.hc)
    })
    return { labels: quarters.map((q) => q.label), baseQ, scenQ }
  }, [data, quarters, selReg, mods])

  return (
    <div className={'apj-wfp' + (dark ? ' dark' : '')}>
      <div className="apj-hdr">
        <div className="apj-hl"><div className="apj-brand"><h1>APJ Workforce Planner</h1></div></div>
        <div className="apj-hr">
          <button type="button" className="apj-hb" onClick={exportCSV}>Export CSV</button>
          <button type="button" className="apj-hb" onClick={() => window.print()}>Print</button>
          <button type="button" className="apj-hb sv" onClick={saveData}>{savedFlash ? '✅ Saved!' : 'Save'}</button>
          <button type="button" className={'apj-tgl' + (dark ? ' on' : '')} onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" />
        </div>
      </div>
      <div className="apj-accent-bar" />

      <div className="apj-main">
        <div className="apj-tab-bar">
          <button type="button" className={'apj-tab' + (activeTab === 'input' ? ' on' : '')} onClick={() => setActiveTab('input')}>Data Input <span className="apj-bg">1</span></button>
          <button type="button" className={'apj-tab' + (activeTab === 'results' ? ' on' : '')} onClick={() => setActiveTab('results')}>Results <span className="apj-bg">2</span></button>
          <button type="button" className={'apj-tab' + (activeTab === 'whatif' ? ' on' : '')} onClick={() => setActiveTab('whatif')}>What-If <span className="apj-bg">3</span></button>
        </div>

        {activeTab === 'input' && (
          <div className="apj-pnl">
            <div className="apj-sth">
              <h2>Orders + Parameters</h2>
              <div className="apj-acts">
                <button type="button" className="apj-sb g" onClick={resetToSample}>Reset to Sample Data</button>
              </div>
            </div>
            <div className="apj-config-bar">
              <QuarterBar quarters={quarters} selQ={selQ} onSelect={setSelQ} />
              <div className="apj-config-sep" />
              <div className="apj-config-inline">
                <span className="apj-config-label">START QTR:</span>
                <select className="apj-di" style={{ width: 55, padding: 5, margin: 0 }} value={startQ} onChange={(e) => handleStartChange(Number(e.target.value), startFY)}>
                  <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
                </select>
                <span className="apj-config-label">FY:</span>
                <input type="number" className="apj-di" style={{ width: 65, padding: 5, margin: 0 }} value={startFY} onChange={(e) => handleStartChange(startQ, Number(e.target.value) || startFY)} />
              </div>
            </div>
            <div className="apj-divider"><span>Orders + Parameters (Editable, Sample Data)</span></div>
            <div className="apj-dc">
              <table className="apj-dt">
                <colgroup><col style={{ width: 160 }} /><col /><col /><col style={{ width: 70 }} /><col /><col /><col /><col /></colgroup>
                <thead>
                  <tr className="apj-cg">
                    <th></th>
                    <th colSpan={3}>ORDERS <span style={{ fontSize: 9, opacity: .7 }}>({quarters[selQ]?.label})</span></th>
                    <th colSpan={2}>CASE RATE (%)</th>
                    <th>CPSR</th>
                    <th>CRW</th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'left' }}>COUNTRY</th>
                    <th>GS ORDERS</th><th>CS ORDERS</th><th>TOTAL</th><th>GS RATE</th><th>CS RATE</th><th>CPSR</th><th>CRW</th>
                  </tr>
                </thead>
                <tbody>
                  {APJ_COUNTRIES.map((c) => {
                    const o = data[c.id].quarters[qk] || { gs: 0, cs: 0 }
                    const p = data[c.id].params
                    const gv = Math.round(o.gs || 0)
                    const cv = c.hasCS ? Math.round(o.cs || 0) : 0
                    return (
                      <tr key={c.id}>
                        <td><div className="apj-cc-cell"><span className="apj-cd">{c.cc}</span>{c.name}{!c.hasCS && <small style={{ color: 'var(--dell-gray-light)' }}> (GS)</small>}</div></td>
                        <td><input className="apj-di" type="number" step={1} min={0} value={gv} onChange={(e) => updOrd(c.id, 'gs', e.target.value)} /></td>
                        <td>{c.hasCS ? <input className="apj-di" type="number" step={1} min={0} value={cv} onChange={(e) => updOrd(c.id, 'cs', e.target.value)} /> : <input className="apj-di" disabled value="N/A" readOnly />}</td>
                        <td><span className="apj-tot-val">{f0(gv + cv)}</span></td>
                        <td><input className="apj-di" type="number" step={0.01} value={p.gsRate ? Number((p.gsRate * 100).toFixed(3)) : ''} onChange={(e) => updPar(c.id, 'gsRate', e.target.value)} /></td>
                        <td>{c.hasCS ? <input className="apj-di" type="number" step={0.01} value={p.csRate ? Number((p.csRate * 100).toFixed(3)) : ''} onChange={(e) => updPar(c.id, 'csRate', e.target.value)} /> : <input className="apj-di" disabled value="N/A" readOnly />}</td>
                        <td><input className="apj-di" type="number" step={0.01} value={p.cpsr || ''} onChange={(e) => updPar(c.id, 'cpsr', e.target.value)} /></td>
                        <td><input className="apj-di" type="number" step={1} value={p.crw || ''} onChange={(e) => updPar(c.id, 'crw', e.target.value)} /></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>APJ TOTAL</strong></td>
                    <td>{f0(APJ_COUNTRIES.reduce((s, c) => s + (data[c.id].quarters[qk]?.gs || 0), 0))}</td>
                    <td>{f0(APJ_COUNTRIES.reduce((s, c) => s + (data[c.id].quarters[qk]?.cs || 0), 0))}</td>
                    <td><strong>{f0(APJ_COUNTRIES.reduce((s, c) => s + (data[c.id].quarters[qk]?.gs || 0) + (data[c.id].quarters[qk]?.cs || 0), 0))}</strong></td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
              <div className="apj-nb">
                <button type="button" className="apj-sb gn" onClick={() => setActiveTab('results')}>View Results →</button>
                <button type="button" className="apj-sb t" style={{ background: 'var(--dell-royal)' }} onClick={() => setActiveTab('whatif')}>What-If Analysis →</button>
              </div>
            </div>
            <div className="apj-hcs">
              {APJ_COUNTRIES.map((c) => (
                <div className="apj-hcc" key={c.id}><div className="apj-h1">{c.cc}</div><div className="apj-h2">{c.name}</div><div className="apj-h3">{f0(allForQ.countries[c.id].hc)}</div></div>
              ))}
              <div className="apj-hcc tot"><div className="apj-h1">TOTAL HC</div><div className="apj-h2">ALL REGIONS</div><div className="apj-h3">{f0(allForQ.totals.hc)}</div></div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="apj-pnl">
            <div className="apj-config-bar">
              <QuarterBar quarters={quarters} selQ={selQ} onSelect={setSelQ} />
              <div className="apj-config-sep" />
              <RegionBar selReg={selReg} onSelect={setSelReg} />
            </div>
            <div className="apj-kr">
              <div className="apj-kc o1"><div className="apj-kl">TOTAL ORDERS</div><div className="apj-kv">{f0(dSel.totO)}</div></div>
              <div className="apj-kc o2"><div className="apj-kl">CASE RATE</div><div className="apj-kv">{(dSel.cr * 100).toFixed(1)}%</div></div>
              <div className="apj-kc o3"><div className="apj-kl">TOTAL CASES</div><div className="apj-kv">{f0(dSel.totCs)}</div></div>
              <div className="apj-kc o4"><div className="apj-kl">CPSR</div><div className="apj-kv">{f2(dSel.cpsr)}</div></div>
              <div className="apj-kc o5"><div className="apj-kl">TOTAL CONTACTS</div><div className="apj-kv">{f0(dSel.totTCD)}</div></div>
              <div className="apj-kc o6"><div className="apj-kl">HC REQUIRED</div><div className="apj-kv">{f0(dSel.hc)}</div></div>
            </div>
            <div className="apj-ec">
              <div className="apj-eh">
                <h2>{selReg === 'ALL' ? 'Executive Summary' : APJ_COUNTRIES.find((x) => x.id === selReg).name + ' Summary'}</h2>
                <button type="button" className={'apj-dtb' + (showDet ? ' on' : '')} onClick={() => setShowDet((d) => !d)}>{showDet ? 'Summary' : 'Detailed'}</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="apj-et">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>COUNTRY</th>
                      <th>GS ORD</th><th>CS ORD</th><th>TOTAL</th>
                      {showDet && <><th>GS CASES</th><th>CS CASES</th></>}
                      <th>CASES</th><th>CR</th><th>TCD</th><th>CPSR</th><th>CRW</th><th>HC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selReg === 'ALL' ? APJ_COUNTRIES : [APJ_COUNTRIES.find((x) => x.id === selReg)]).map((c) => {
                      const r = allForQ.countries[c.id]
                      return (
                        <tr key={c.id}>
                          <td style={{ textAlign: 'left' }}><b style={{ color: 'var(--dell-gray-mid)', fontSize: 9, marginRight: 4 }}>{c.cc}</b>{c.name}</td>
                          <td>{f0(r.gsO)}</td><td>{c.hasCS ? f0(r.csO) : '—'}</td><td style={{ fontWeight: 700 }}>{f0(r.totO)}</td>
                          {showDet && <><td>{f0(r.gsCs)}</td><td>{c.hasCS ? f0(r.csCs) : '—'}</td></>}
                          <td style={{ fontWeight: 700 }}>{f0(r.totCs)}</td><td>{fp(r.cr)}</td><td>{f0(r.totTCD)}</td><td>{f2(r.cpsr)}</td><td>{f1(r.crw)}</td>
                          <td className="apj-hcv">{f0(r.hc)}</td>
                        </tr>
                      )
                    })}
                    {selReg === 'ALL' && (
                      <tr className="apj-tr">
                        <td style={{ textAlign: 'left' }}><b>APJ TOTAL</b></td>
                        <td>{f0(allForQ.totals.gsO)}</td><td>{f0(allForQ.totals.csO)}</td><td>{f0(allForQ.totals.totO)}</td>
                        {showDet && <><td>{f0(allForQ.totals.gsCs)}</td><td>{f0(allForQ.totals.csCs)}</td></>}
                        <td>{f0(allForQ.totals.totCs)}</td><td>{fp(allForQ.totals.cr)}</td><td>{f0(allForQ.totals.totTCD)}</td><td>{f2(allForQ.totals.cpsr)}</td><td>—</td>
                        <td className="apj-hcv" style={{ fontSize: 15 }}>{f0(allForQ.totals.hc)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="apj-chg">
              <div className="apj-chc"><h3><span className="apj-dot" style={{ background: 'var(--dell-blue)' }} /> Orders Trend</h3><div style={{ position: 'relative', width: '100%', height: 300 }}>
                <Bar data={{ labels: trendSeries.labels, datasets: [{ data: trendSeries.tO, backgroundColor: '#0672CB', borderRadius: 4 }] }} options={CHART_OPT_BASE} />
              </div></div>
              <div className="apj-chc"><h3><span className="apj-dot" style={{ background: 'var(--dell-green)' }} /> Cases Trend</h3><div style={{ position: 'relative', width: '100%', height: 300 }}>
                <Line data={{ labels: trendSeries.labels, datasets: [{ data: trendSeries.tC, borderColor: '#247554', backgroundColor: 'rgba(36,117,84,.08)', fill: true, tension: .3, borderWidth: 3 }] }} options={CHART_OPT_BASE} />
              </div></div>
              <div className="apj-chc"><h3><span className="apj-dot" style={{ background: 'var(--dell-royal)' }} /> Contacts Trend</h3><div style={{ position: 'relative', width: '100%', height: 300 }}>
                <Line data={{ labels: trendSeries.labels, datasets: [{ data: trendSeries.tT, borderColor: '#0C32A4', backgroundColor: 'rgba(12,50,164,.08)', fill: true, tension: .3, borderWidth: 3 }] }} options={CHART_OPT_BASE} />
              </div></div>
              <div className="apj-chc"><h3><span className="apj-dot" style={{ background: 'var(--dell-orange)' }} /> Headcount Trend</h3><div style={{ position: 'relative', width: '100%', height: 300 }}>
                <Bar data={{ labels: trendSeries.labels, datasets: [{ data: trendSeries.tH, backgroundColor: '#FBAE40', borderRadius: 4 }] }} options={CHART_OPT_BASE} />
              </div></div>
            </div>
          </div>
        )}

        {activeTab === 'whatif' && (
          <div className="apj-pnl">
            <div className="apj-config-bar">
              <QuarterBar quarters={quarters} selQ={selQ} onSelect={setSelQ} />
              <div className="apj-config-sep" />
              <RegionBar selReg={selReg} onSelect={setSelReg} />
            </div>
            <div className="apj-wi-container">
              <div className="apj-wi-panel">
                <h3>Scenario Builder</h3>
                {[
                  { field: 'orders', label: 'Orders Change', id: 'wiOrdVal', slider: 'orders', presets: [-20, -10, 0, 10, 20, 50] },
                  { field: 'caserate', label: 'Case Rate Change', id: 'wiCRVal', slider: 'caserate', presets: [-20, -10, 0, 10, 25, 50] },
                  { field: 'cpsr', label: 'CPSR Change', id: 'wiCPVal', slider: 'cpsr', presets: [-20, -10, 0, 10, 25, 50] },
                  { field: 'crw', label: 'CRW (Productivity)', id: 'wiCWVal', slider: 'crw', presets: [-20, -10, 0, 10, 25, 50] },
                ].map((g) => {
                  const v = mods[g.field]
                  const tone = v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'
                  return (
                    <div className="apj-wi-group" key={g.field}>
                      <div className="apj-wi-label"><span>{g.label}</span><span className={'apj-wi-val ' + tone}>{(v > 0 ? '+' : '') + v + '%'}</span></div>
                      <input type="range" className={'apj-wi-slider ' + g.slider} min={-50} max={100} step={1} value={v} onChange={(e) => setWI(g.field, Number(e.target.value))} />
                      <div className="apj-wi-range"><span>-50%</span><span>0%</span><span>+100%</span></div>
                      <div className="apj-wi-preset">
                        {g.presets.map((p) => (
                          <button type="button" key={p} onClick={() => setWI(g.field, p)}>{p === 0 ? 'Base' : (p > 0 ? '+' : '') + p + '%'}</button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                <button type="button" className="apj-wi-reset" onClick={resetWI}>Reset All to Baseline</button>
                <div className="apj-wi-quick-box">
                  <div className="apj-wi-quick-label">QUICK SCENARIOS</div>
                  <div className="apj-wi-quick-list">
                    {QUICK_SCENARIOS.map((s) => (
                      <button type="button" key={s.key} className="apj-sb g" onClick={() => applyScenario(s.key)}>{s.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="apj-wi-right">
                {scenario && (
                  <div className="apj-wi-scenario-name">
                    <div><div className="apj-sn-text">{scenario.text}</div><div className="apj-sn-desc">{scenario.desc}</div></div>
                  </div>
                )}
                <div className="apj-impact-grid">
                  {impactMetrics.map((m) => {
                    const diff = m.sv - m.bv
                    const pct = m.bv === 0 ? 0 : (diff / m.bv * 100)
                    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
                    const sign = diff > 0 ? '+' : ''
                    let bvF, svF, diffF
                    if (m.fmt === 'pct') { bvF = m.bv.toFixed(1) + '%'; svF = m.sv.toFixed(1) + '%'; diffF = sign + diff.toFixed(1) + 'pp' }
                    else if (m.fmt === 'dec') { bvF = f2(m.bv); svF = f2(m.sv); diffF = sign + f2(diff) }
                    else { bvF = f0(m.bv); svF = f0(m.sv); diffF = sign + f0(diff) + ' (' + sign + pct.toFixed(1) + '%)' }
                    return (
                      <div className={'apj-impact-card' + (m.hl ? ' highlight' : '')} key={m.label}>
                        <div className="apj-ic-label">{m.label}</div>
                        <div className="apj-ic-row"><span className="apj-ic-base">{bvF}</span><span className="apj-ic-arrow">→</span><span className="apj-ic-scenario">{svF}</span></div>
                        <div className={'apj-ic-delta ' + cls}>{diffF}</div>
                      </div>
                    )
                  })}
                </div>
                <div className="apj-ec">
                  <div className="apj-eh">
                    <h2>Baseline vs Scenario Comparison</h2>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--dell-gray-mid)' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--dell-card-bg)', border: '1px solid var(--dell-border)', display: 'inline-block' }} />Baseline</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--dell-blue)' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--dell-ice)', border: '1px solid var(--dell-blue)', display: 'inline-block' }} />Scenario</span>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="apj-wi-table">
                      <thead>
                        <tr><th style={{ textAlign: 'left' }}>COUNTRY</th><th>BASE ORD</th><th>SCEN ORD</th><th>&Delta; ORD</th><th>BASE CASES</th><th>SCEN CASES</th><th>&Delta; CASES</th><th>BASE HC</th><th>SCEN HC</th><th>&Delta; HC</th></tr>
                      </thead>
                      <tbody>
                        {(selReg === 'ALL' ? APJ_COUNTRIES : [APJ_COUNTRIES.find((x) => x.id === selReg)]).map((c) => {
                          const br = wiBase.countries[c.id]
                          const sr = wiScenario.countries[c.id]
                          const hcDiff = sr.hc - br.hc
                          const hcCls = hcDiff > 0 ? 'up' : hcDiff < 0 ? 'down' : 'same'
                          return (
                            <tr key={c.id}>
                              <td style={{ textAlign: 'left' }}><b style={{ color: 'var(--dell-gray-mid)', fontSize: 9, marginRight: 4 }}>{c.cc}</b>{c.name}</td>
                              <td>{f0(br.totO)}</td><td>{f0(sr.totO)}</td><td><DeltaBadge base={br.totO} scenario={sr.totO} /></td>
                              <td>{f0(br.totCs)}</td><td>{f0(sr.totCs)}</td><td><DeltaBadge base={br.totCs} scenario={sr.totCs} /></td>
                              <td style={{ fontWeight: 700 }}>{f0(br.hc)}</td><td className="apj-hcv">{f0(sr.hc)}</td>
                              <td><span className={'apj-delta-badge ' + hcCls}>{(hcDiff > 0 ? '+' : '') + f0(hcDiff)}</span></td>
                            </tr>
                          )
                        })}
                        {selReg === 'ALL' && (() => {
                          const bt = wiBase.totals, st = wiScenario.totals, hcD = st.hc - bt.hc, hcC = hcD > 0 ? 'up' : hcD < 0 ? 'down' : 'same'
                          return (
                            <tr className="apj-tr">
                              <td style={{ textAlign: 'left' }}><b>APJ TOTAL</b></td>
                              <td>{f0(bt.totO)}</td><td>{f0(st.totO)}</td><td><DeltaBadge base={bt.totO} scenario={st.totO} /></td>
                              <td>{f0(bt.totCs)}</td><td>{f0(st.totCs)}</td><td><DeltaBadge base={bt.totCs} scenario={st.totCs} /></td>
                              <td style={{ fontWeight: 700, fontSize: 14 }}>{f0(bt.hc)}</td><td className="apj-hcv" style={{ fontSize: 15 }}>{f0(st.hc)}</td>
                              <td><span className={'apj-delta-badge ' + hcC} style={{ fontSize: 12, fontWeight: 900 }}>{(hcD > 0 ? '+' : '') + f0(hcD)}</span></td>
                            </tr>
                          )
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="apj-chg">
                  <div className="apj-chc"><h3><span className="apj-dot" style={{ background: 'var(--dell-blue)' }} /> HC Comparison</h3><div style={{ position: 'relative', width: '100%', height: 300 }}>
                    <Bar
                      data={{
                        labels: selReg === 'ALL' ? APJ_COUNTRIES.map((c) => c.cc) : [APJ_COUNTRIES.find((x) => x.id === selReg).cc],
                        datasets: [
                          { label: 'Baseline', data: selReg === 'ALL' ? APJ_COUNTRIES.map((c) => wiBase.countries[c.id].hc) : [wiBase.countries[selReg].hc], backgroundColor: 'rgba(204,205,224,.4)', borderColor: '#CCCDE0', borderWidth: 2, borderRadius: 4 },
                          { label: 'Scenario', data: selReg === 'ALL' ? APJ_COUNTRIES.map((c) => wiScenario.countries[c.id].hc) : [wiScenario.countries[selReg].hc], backgroundColor: 'rgba(6,114,203,.25)', borderColor: '#0672CB', borderWidth: 2, borderRadius: 4 },
                        ],
                      }}
                      options={CHART_OPT_LEGEND}
                    />
                  </div></div>
                  <div className="apj-chc"><h3><span className="apj-dot" style={{ background: 'var(--dell-royal)' }} /> Impact Delta</h3><div style={{ position: 'relative', width: '100%', height: 300 }}>
                    <Bar
                      data={{
                        labels: selReg === 'ALL' ? APJ_COUNTRIES.map((c) => c.cc) : [APJ_COUNTRIES.find((x) => x.id === selReg).cc],
                        datasets: [{
                          label: 'HC Change',
                          data: selReg === 'ALL' ? APJ_COUNTRIES.map((c) => wiScenario.countries[c.id].hc - wiBase.countries[c.id].hc) : [wiScenario.countries[selReg].hc - wiBase.countries[selReg].hc],
                          backgroundColor: (selReg === 'ALL' ? APJ_COUNTRIES.map((c) => wiScenario.countries[c.id].hc - wiBase.countries[c.id].hc) : [wiScenario.countries[selReg].hc - wiBase.countries[selReg].hc]).map((v) => (v > 0 ? '#E02D4C' : v < 0 ? '#247554' : '#AAAAAA')),
                          borderRadius: 4,
                        }],
                      }}
                      options={CHART_OPT_BASE}
                    />
                  </div></div>
                </div>
                <div className="apj-chg">
                  <div className="apj-chc"><h3><span className="apj-dot" style={{ background: 'var(--dell-green)' }} /> Sensitivity Analysis</h3><div style={{ position: 'relative', width: '100%', height: 300 }}>
                    <Line
                      data={{
                        labels: SENS_RANGE.map((v) => (v > 0 ? '+' : '') + v + '%'),
                        datasets: [
                          { label: 'Orders', data: sensitivity.sensOrd, borderColor: '#0672CB', borderWidth: 2, tension: .3, pointRadius: 2 },
                          { label: 'Case Rate', data: sensitivity.sensCR, borderColor: '#247554', borderWidth: 2, tension: .3, pointRadius: 2 },
                          { label: 'CPSR', data: sensitivity.sensCP, borderColor: '#C93B8C', borderWidth: 2, tension: .3, pointRadius: 2 },
                          { label: 'CRW', data: sensitivity.sensCW, borderColor: '#0C32A4', borderWidth: 2, tension: .3, pointRadius: 2, borderDash: [5, 3] },
                        ],
                      }}
                      options={{ ...CHART_OPT_BASE, plugins: { legend: { position: 'top', labels: { font: { family: 'Arial', size: 9, weight: 'bold' } } } } }}
                    />
                  </div></div>
                  <div className="apj-chc"><h3><span className="apj-dot" style={{ background: 'var(--dell-orange)' }} /> Quarterly HC Trend</h3><div style={{ position: 'relative', width: '100%', height: 300 }}>
                    <Line
                      data={{
                        labels: wiTrend.labels,
                        datasets: [
                          { label: 'Baseline HC', data: wiTrend.baseQ, borderColor: '#AAAAAA', backgroundColor: 'rgba(170,170,170,.08)', fill: true, borderWidth: 2, tension: .3, borderDash: [5, 3] },
                          { label: 'Scenario HC', data: wiTrend.scenQ, borderColor: '#FBAE40', backgroundColor: 'rgba(251,174,64,.08)', fill: true, borderWidth: 3, tension: .3 },
                        ],
                      }}
                      options={CHART_OPT_LEGEND}
                    />
                  </div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="apj-footer">
        <span className="apj-foot-line" />
        Internal Use — Confidential
        <span className="apj-foot-line" />
        <br /><span style={{ fontSize: 9, marginTop: 4, display: 'inline-block' }}>APJ Workforce Planner v2.0 — Sample Data</span>
      </div>
    </div>
  )
}

function DeltaBadge({ base, scenario }) {
  const diff = scenario - base
  const pct = base === 0 ? 0 : (diff / base * 100)
  const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
  const sign = diff > 0 ? '+' : ''
  return <span className={'apj-delta-badge ' + cls}>{sign}{f0(diff)} ({sign}{pct.toFixed(1)}%)</span>
}
