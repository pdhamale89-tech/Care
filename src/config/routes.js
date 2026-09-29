import CcoDashboard from '../modules/wfo/components/CcoDashboard.jsx'
import OutageReport from '../modules/wfo/components/OutageReport.jsx'
import EpiHc from '../modules/wfo/components/EpiHc.jsx'
import Reports from '../modules/wfo/components/Reports.jsx'
import FiscalCalendar from '../modules/wfo/components/FiscalCalendar.jsx'
import WhatIfSimulator from '../modules/wfo/components/WhatIfSimulator.jsx'
import Glossary from '../modules/wfo/components/Glossary.jsx'
import ApjWorkforcePlanner from '../modules/wfo/components/ApjWorkforcePlanner.jsx'

// Single source of truth for tab id -> page component. Unlisted tabs either fall
// back to CCO Overview (unknown id) or render ComingSoonTab via COMING_SOON_TITLES below.
export const ROUTES = {
  cco: CcoDashboard,
  outage: OutageReport,
  epiHc: EpiHc,
  whatIf: WhatIfSimulator,
  apjPlanner: ApjWorkforcePlanner,
  reports: Reports,
  fiscalCalendar: FiscalCalendar,
  glossary: Glossary,
}

// Tabs with no real page yet — TabRouter renders a placeholder with this title.
export const COMING_SOON_TITLES = {
  calendar: 'Calendar',
  notifications: 'Notifications',
  settings: 'Settings',
}
