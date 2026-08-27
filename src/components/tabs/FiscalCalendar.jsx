import { useState } from 'react'
import { FISCAL_QUARTERS } from '../../data/fiscalCalendar.js'
import { getHolidaysForWeek } from '../../data/holidays.js'
import HolidayCalendar from './HolidayCalendar.jsx'
import InfoBtn from '../common/InfoBtn.jsx'

export default function FiscalCalendar() {
  const [view, setView] = useState('calendar')
  const [tip, setTip] = useState({ show: false, wks: null, x: 0, y: 0 })

  function handleEnter(e, wks) {
    const rect = e.currentTarget.getBoundingClientRect()
    setTip({
      show: true,
      wks,
      x: Math.min(rect.right + 8, window.innerWidth - 390),
      y: Math.max(rect.top - 10, 8),
    })
  }
  function handleLeave() {
    setTip((t) => ({ ...t, show: false }))
  }

  const hols = tip.wks != null ? getHolidaysForWeek(tip.wks) : []

  return (
    <div className="tab-panel active">
      <div className="section-div" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {view === 'calendar' ? 'Fiscal Calendar' : 'Holiday Calendar'}
          {view === 'calendar' && <InfoBtn tip="<strong>Purpose</strong>4-13-4 fiscal calendar with Quarter Weeks (QWKS), Fiscal Weeks (WKS), SCO, Holiday and Pay Date markers for FY2027." />}
        </h2>
        <div className="plan-sel">
          <button type="button" className={'plan-btn' + (view === 'calendar' ? ' active' : '')} onClick={() => setView('calendar')}>Fiscal Calendar</button>
          <button type="button" className={'plan-btn' + (view === 'holidays' ? ' active' : '')} onClick={() => setView('holidays')}>Holiday Calendar</button>
        </div>
      </div>

      {view === 'calendar' ? (
        <>
          <div className="fc-wrap">
            <div className="fc-subtitle">Fiscal Year 2027</div>
            <div className="fc-daterange">(January 31, 2026 - January 29, 2027)</div>
            <div className="fc-grid">
              {FISCAL_QUARTERS.map((qtr) => (
                <div className="fc-qtr" key={qtr.label}>
                  <div className="fc-qtr-hdr">{qtr.label}</div>
                  {qtr.months.map((month) => (
                    <div className="fc-month-block" key={month.name}>
                      <div className="fc-month-name">{month.name}</div>
                      <table className="fc-tbl">
                        <thead>
                          <tr>
                            <th className="fc-qw">QWKS</th><th className="fc-wk">WKS</th>
                            <th>S</th><th>S</th><th>M</th><th>T</th><th>W</th><th>T</th><th>F</th>
                          </tr>
                        </thead>
                        <tbody>
                          {month.rows.map((row) => (
                            <tr key={row.w} className="fc-wk-row" onMouseEnter={(e) => handleEnter(e, row.w)} onMouseLeave={handleLeave}>
                              <td className="fc-qwc">{row.q}</td>
                              <td className="fc-wkc">{row.w}</td>
                              {row.d.map((day, di) => {
                                let cls = ''
                                if (row.sco && row.sco.includes(day)) cls = 'fc-sco'
                                else if (row.hol && row.hol.includes(day)) cls = 'fc-hol'
                                else if (row.pay && row.pay.includes(day)) cls = 'fc-pay'
                                return <td key={di} className={cls}>{day}</td>
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="fc-legend">
              <span><span className="fc-leg" style={{ background: '#1a1f36' }}></span>QWKS</span>
              <span><span className="fc-leg" style={{ background: '#374151' }}></span>WKS</span>
              <span><span className="fc-leg" style={{ background: '#fef3c7', border: '1px solid #92400e' }}></span><u>SCO</u></span>
              <span><span className="fc-leg" style={{ background: '#d1fae5', border: '1px solid #065f46' }}></span>Holiday</span>
              <span><span className="fc-leg" style={{ border: '2px solid var(--accent-blue)', background: 'transparent' }}></span>⭕ Pay Date</span>
            </div>
          </div>

          <div id="holTip" className={tip.show ? 'show' : ''} style={{ left: tip.x + 'px', top: tip.y + 'px' }}>
            <div className="ht-title">Week {tip.wks} Holidays</div>
            {hols.length === 0 && <div className="ht-none">No holidays this week</div>}
            {hols.map((ho, i) => (
              <div className="ht-row" key={i}>
                <span className="ht-date">{ho.date}</span> — <span className="ht-name">{ho.name}</span><br />
                <span className="ht-meta">{ho.country} · {ho.region}{ho.sub ? ' · ' + ho.sub : ''}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <HolidayCalendar />
      )}
    </div>
  )
}
