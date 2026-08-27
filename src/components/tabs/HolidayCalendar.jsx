import { useMemo, useState } from 'react'
import { HOLIDAY_CALENDAR } from '../../data/holidayCalendarData.js'
import { matchesMulti } from '../../data/mockGenerators.js'
import DownloadBtn from '../common/DownloadBtn.jsx'
import InfoBtn from '../common/InfoBtn.jsx'
import MultiSelectDropdown from '../common/MultiSelectDropdown.jsx'

const ALL = ['All']

function uniqueSorted(values) {
  return [...new Set(values)].sort()
}

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function HolidayCalendar() {
  const [region, setRegion] = useState(ALL)
  const [subRegion, setSubRegion] = useState(ALL)
  const [country, setCountry] = useState(ALL)
  const [fiscalYear, setFiscalYear] = useState(ALL)

  const regionOptions = useMemo(() => uniqueSorted(HOLIDAY_CALENDAR.map((h) => h.region)), [])
  const subRegionOptions = useMemo(
    () => uniqueSorted(HOLIDAY_CALENDAR.filter((h) => matchesMulti(region, h.region)).map((h) => h.subRegion)),
    [region],
  )
  const countryOptions = useMemo(
    () => uniqueSorted(HOLIDAY_CALENDAR.filter((h) => matchesMulti(region, h.region) && matchesMulti(subRegion, h.subRegion)).map((h) => h.country)),
    [region, subRegion],
  )
  const fiscalYearOptions = useMemo(() => uniqueSorted(HOLIDAY_CALENDAR.map((h) => h.fiscalYear)), [])

  function handleRegionChange(v) {
    setRegion(v)
    setSubRegion(ALL)
    setCountry(ALL)
  }
  function handleSubRegionChange(v) {
    setSubRegion(v)
    setCountry(ALL)
  }

  const rows = useMemo(() => HOLIDAY_CALENDAR
    .filter((h) => matchesMulti(region, h.region))
    .filter((h) => matchesMulti(subRegion, h.subRegion))
    .filter((h) => matchesMulti(country, h.country))
    .filter((h) => matchesMulti(fiscalYear, h.fiscalYear))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date)), [region, subRegion, country, fiscalYear])

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          🎉 Holiday Calendar <InfoBtn tip="<strong>Purpose</strong>Region, sub region, country and fiscal year holiday detail." />
        </div>
        <DownloadBtn
          filename="holiday-calendar"
          title="Download holiday calendar"
          rows={[
            ['Date', 'Day', 'Week', 'Quarter', 'Fiscal Year', 'Holiday', 'Country', 'Sub Region', 'Region'],
            ...rows.map((h) => [h.date, h.day, h.week, h.quarter, h.fiscalYear, h.name, h.country, h.subRegion, h.region]),
          ]}
        />
      </div>

      <div className="filter-grid" style={{ marginBottom: 10 }}>
        <div className="filter-group">
          <label>Region</label>
          <MultiSelectDropdown options={regionOptions} selected={region} onChange={handleRegionChange} allLabel="All Regions" />
        </div>
        <div className="filter-group">
          <label>Sub Region</label>
          <MultiSelectDropdown options={subRegionOptions} selected={subRegion} onChange={handleSubRegionChange} allLabel="All Sub-Regions" />
        </div>
        <div className="filter-group">
          <label>Country</label>
          <MultiSelectDropdown options={countryOptions} selected={country} onChange={setCountry} allLabel="All Countries" />
        </div>
        <div className="filter-group">
          <label>Fiscal Year</label>
          <MultiSelectDropdown options={fiscalYearOptions} selected={fiscalYear} onChange={setFiscalYear} allLabel="All Fiscal Years" />
        </div>
      </div>

      <div className="holiday-count">{rows.length} holiday{rows.length === 1 ? '' : 's'}</div>

      <div className="tw holiday-tbl-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Day</th><th>Week</th><th>Quarter</th><th>FY</th><th>Holiday</th><th>Country</th><th>Sub Region</th><th>Region</th></tr>
          </thead>
          <tbody>
            {rows.map((h, i) => (
              <tr key={i}>
                <td>{fmtDate(h.date)}</td>
                <td>{h.day}</td>
                <td>{h.week}</td>
                <td>{h.quarter}</td>
                <td>{h.fiscalYear}</td>
                <td>{h.name}</td>
                <td>{h.country}</td>
                <td>{h.subRegion}</td>
                <td>{h.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
