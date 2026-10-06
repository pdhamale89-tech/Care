import { useApp } from '../../../core/hooks/useApp.js'
import Toggle from '../../../shared/components/Toggle.jsx'
import InfoBtn from '../../../shared/components/InfoBtn.jsx'
import { fmtDateTime } from '../lib/userUsageData.js'

const LANDING_PAGES = [
  ['cco', 'CCO Overview'], ['outage', 'Outage Report'], ['epiHc', 'Epi HC'],
  ['apjPlanner', 'What-If Simulator'], ['reports', 'Reports'], ['fiscalCalendar', 'Fiscal Calendar'],
  ['glossary', 'Glossary'], ['userUsage', 'User Usage'],
]
const PERIODS = ['Weekly', 'Monthly', 'Quarterly']
const REGIONS = ['All', 'AMER', 'EMEA', 'APJ', 'LATAM']
const CHANNELS = ['All', 'Voice', 'Chat', 'Email', 'Social', 'Case']
const BUSINESSES = ['All', 'Consumer', 'Global Sales', 'FED']
const REFRESH_INTERVALS = [5, 15, 30, 60]
const EXPORT_FORMATS = ['CSV', 'PPT', 'PDF', 'Excel']

const ALERT_TYPES = [
  ['kpiThreshold', 'KPI Threshold Alerts'],
  ['forecastVariance', 'Forecast Variance'],
  ['capacity', 'Capacity Alerts'],
  ['sla', 'SLA Alerts'],
  ['refreshFailure', 'Data Refresh Alerts'],
  ['dataQuality', 'Data Quality Alerts'],
]

function Row({ label, hint, children }) {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-row-label">{label}</div>
        {hint && <div className="settings-row-hint">{hint}</div>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { settings, updateSetting, updateAlertPref, saveSettingsNow, resetSettingsToDefault, lastRefreshAt, nextRefreshAt } = useApp()

  return (
    <div className="tab-panel active settings-wrap">
      <div className="section-div" style={{ marginTop: 0 }}>
        <h2>Dashboard Preferences</h2>
      </div>
      <div className="card">
        <Row label="Default Landing Page" hint="Which page opens when Care SPOG loads">
          <select className="f-sel" value={settings.landingPage} onChange={(e) => updateSetting('landingPage', e.target.value)}>
            {LANDING_PAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </Row>
        <Row label="Default Period">
          <select className="f-sel" value={settings.defaultPeriod} onChange={(e) => updateSetting('defaultPeriod', e.target.value)}>
            {PERIODS.map((p) => <option key={p} value={p.toLowerCase()}>{p}</option>)}
          </select>
        </Row>
        <Row label="Default Region">
          <select className="f-sel" value={settings.defaultRegion} onChange={(e) => updateSetting('defaultRegion', e.target.value)}>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Row>
        <Row label="Default Channel">
          <select className="f-sel" value={settings.defaultChannel} onChange={(e) => updateSetting('defaultChannel', e.target.value)}>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Row>
        <Row label="Default Business / Offering">
          <select className="f-sel" value={settings.defaultBusiness} onChange={(e) => updateSetting('defaultBusiness', e.target.value)}>
            {BUSINESSES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Row>
        <Row label="Remember Last Selected Filters" hint="Reapplies your most recent filter selections the next time you open the dashboard">
          <Toggle checked={settings.rememberFilters} onChange={(v) => updateSetting('rememberFilters', v)} />
        </Row>
      </div>

      <div className="section-div">
        <h2>Display Preferences</h2>
      </div>
      <div className="card">
        <Row label="Theme">
          <select className="f-sel" value={settings.themePreference} onChange={(e) => updateSetting('themePreference', e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System Default</option>
          </select>
        </Row>
        <Row label="Dashboard Density" hint="Compact tightens spacing across cards and tables">
          <select className="f-sel" value={settings.density} onChange={(e) => updateSetting('density', e.target.value)}>
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </Row>
        <Row label="Show Data Labels" hint="Value labels on chart bars/lines">
          <Toggle checked={settings.showDataLabels} onChange={(v) => updateSetting('showDataLabels', v)} />
        </Row>
        <Row label="Show KPI Explanations" hint="The (i) info icons next to KPI cards and charts">
          <Toggle checked={settings.showKpiExplanations} onChange={(v) => updateSetting('showKpiExplanations', v)} />
        </Row>
        <Row label="Show Chart Legends">
          <Toggle checked={settings.showChartLegends} onChange={(v) => updateSetting('showChartLegends', v)} />
        </Row>
        <Row label="Number Format">
          <select className="f-sel" value={settings.numberFormat} onChange={(e) => updateSetting('numberFormat', e.target.value)}>
            <option value="full">1,234</option>
            <option value="compact">1.2K / 1.2M</option>
          </select>
        </Row>
        <Row label="Percentage Decimal Places">
          <select className="f-sel" value={settings.percentDecimals} onChange={(e) => updateSetting('percentDecimals', Number(e.target.value))}>
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </Row>
      </div>

      <div className="section-div">
        <h2>Data &amp; Refresh <InfoBtn tip="<strong>Purpose</strong>Simulated data pipeline status — this prototype has no live backend, so refreshes are simulated locally on the interval below." /></h2>
      </div>
      <div className="card">
        <div className="data-status-grid" style={{ marginBottom: 16 }}>
          <div>
            <div className="data-status-item-label">Data Status</div>
            <div className="data-status-item-value"><span className="dot dot-g" style={{ marginRight: 6 }} />Connected</div>
          </div>
          <div>
            <div className="data-status-item-label">Last Refresh</div>
            <div className="data-status-item-value">{fmtDateTime(lastRefreshAt)}</div>
          </div>
          <div>
            <div className="data-status-item-label">Data Latency</div>
            <div className="data-status-item-value">12 minutes</div>
          </div>
          <div>
            <div className="data-status-item-label">Next Refresh</div>
            <div className="data-status-item-value">{settings.autoRefresh ? fmtDateTime(nextRefreshAt) : 'Manual'}</div>
          </div>
        </div>
        <Row label="Auto Refresh">
          <Toggle checked={settings.autoRefresh} onChange={(v) => updateSetting('autoRefresh', v)} />
        </Row>
        <Row label="Refresh Interval">
          <select
            className="f-sel" value={settings.refreshInterval} disabled={!settings.autoRefresh}
            onChange={(e) => updateSetting('refreshInterval', Number(e.target.value))}
          >
            {REFRESH_INTERVALS.map((m) => <option key={m} value={m}>{m < 60 ? `${m} minutes` : '1 hour'}</option>)}
          </select>
        </Row>
      </div>

      <div className="section-div">
        <h2>Alert Preferences</h2>
      </div>
      <div className="card">
        {ALERT_TYPES.map(([key, label]) => {
          const pref = settings.alertPrefs[key]
          return (
            <div className="alert-pref-row" key={key}>
              <div className="alert-pref-name">{label}</div>
              <Toggle checked={pref.enabled} onChange={(v) => updateAlertPref(key, 'enabled', v)} />
              <label className="alert-pref-check">
                <input type="checkbox" checked={pref.inApp} disabled={!pref.enabled} onChange={(e) => updateAlertPref(key, 'inApp', e.target.checked)} /> In-App
              </label>
              <label className="alert-pref-check">
                <input type="checkbox" checked={pref.email} disabled={!pref.enabled} onChange={(e) => updateAlertPref(key, 'email', e.target.checked)} /> Email
              </label>
            </div>
          )
        })}
      </div>

      <div className="section-div">
        <h2>Export Preferences</h2>
      </div>
      <div className="card">
        <Row label="Default Export Format" hint="CSV is fully supported today; other formats are saved as your preference">
          <select className="f-sel" value={settings.exportFormat} onChange={(e) => updateSetting('exportFormat', e.target.value)}>
            {EXPORT_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Row>
        <label className="settings-check-row">
          <input type="checkbox" checked={settings.exportCurrentFilters} onChange={(e) => updateSetting('exportCurrentFilters', e.target.checked)} /> Export current filters
        </label>
        <label className="settings-check-row">
          <input type="checkbox" checked={settings.exportCurrentPageOnly} onChange={(e) => updateSetting('exportCurrentPageOnly', e.target.checked)} /> Export current page only
        </label>
        <label className="settings-check-row">
          <input type="checkbox" checked={settings.exportIncludeTimestamp} onChange={(e) => updateSetting('exportIncludeTimestamp', e.target.checked)} /> Include timestamp
        </label>
        <label className="settings-check-row">
          <input type="checkbox" checked={settings.exportIncludeFilters} onChange={(e) => updateSetting('exportIncludeFilters', e.target.checked)} /> Include filter selections
        </label>
      </div>

      <div className="settings-actions">
        <button type="button" className="clear-all-btn" onClick={resetSettingsToDefault}>✕ Reset to Default</button>
        <button type="button" className="btn btn-sm btn-primary" onClick={saveSettingsNow}>Save Changes</button>
      </div>
    </div>
  )
}
