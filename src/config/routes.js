import CcoDashboard from '../modules/wfo/components/CcoDashboard.jsx'
import OutageReport from '../modules/wfo/components/OutageReport.jsx'
import EpiHc from '../modules/wfo/components/EpiHc.jsx'
import Reports from '../modules/wfo/components/Reports.jsx'
import FiscalCalendar from '../modules/wfo/components/FiscalCalendar.jsx'
import WhatIfSimulator from '../modules/wfo/components/WhatIfSimulator.jsx'
import Home from '../pages/Home.jsx'

// Single source of truth for tab id -> page component. Unlisted tabs either fall
// back to Home (unknown id) or render ComingSoonTab via COMING_SOON_TITLES below.
export const ROUTES = {
  home: Home,
  cco: CcoDashboard,
  outage: OutageReport,
  epiHc: EpiHc,
  whatIf: WhatIfSimulator,
  reports: Reports,
  fiscalCalendar: FiscalCalendar,
}

// Tabs with no real page yet — TabRouter renders a placeholder with this title.
export const COMING_SOON_TITLES = {
  calendar: 'Calendar',
  glossary: 'Glossary',
  notifications: 'Notifications',
  settings: 'Settings',
}
