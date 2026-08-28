export const regionCountryMap = {
  APJC: ['All', 'China', 'Japan', 'Korea', 'Australia', 'India', 'Singapore', 'Taiwan'],
  BRAZIL: ['All', 'Brazil'],
  EMEA: ['All', 'United Kingdom', 'Germany', 'France', 'UAE', 'South Africa', 'Spain', 'Italy'],
  GLOBAL: ['All', 'China', 'Japan', 'USA', 'Germany', 'Brazil', 'India', 'UK', 'Mexico'],
  LATAM: ['All', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'Peru'],
  NA: ['All', 'USA', 'Canada'],
  'NA CHANNEL': ['All', 'USA', 'Canada'],
  'NA FED': ['All', 'USA'],
}

export const REGIONS = Object.keys(regionCountryMap)

// `selected` is a multi-select filter value: ['All'] (or empty) means no filter applied.
export function matchesMulti(selected, value) {
  return !selected || selected.length === 0 || selected.includes('All') || selected.includes(value)
}

export function countriesForRegions(regions) {
  const list = (regions || []).filter((r) => r !== 'All')
  const source = list.length ? list : REGIONS
  const set = new Set()
  source.forEach((r) => (regionCountryMap[r] || []).forEach((c) => c !== 'All' && set.add(c)))
  return [...set].sort()
}

export const firstNames = ['Alex', 'Priya', 'Chen', 'Maria', 'Sam', 'Wei', 'Nina', 'Raj', 'Yuki', 'Carlos', 'Emma', 'Liam', 'Sofia', 'Kenji', 'Amara', 'Noah', 'Ling', 'Diego', 'Fatima', 'Tom']
export const lastNames = ['Sharma', 'Wang', 'Silva', 'Khan', 'Lopez', 'Muller', 'Nakamura', 'Costa', 'Patel', 'Kim', 'Rossi', 'Dubois', 'Tanaka', 'Santos', 'Ali']
export const managers = ['J. Anderson', 'P. Menon', 'L. Zhang', 'R. Fernandes', 'K. Suzuki']
export const outageReasons = ['Sick Leave', 'System Outage', 'Internet Issue', 'Emergency Leave', 'Late Login', 'Power Outage', 'Personal Emergency']

export const departments = [
  { name: 'Sales Support', code: 'DEPT-SLS' },
  { name: 'Technical Support', code: 'DEPT-TEC' },
  { name: 'Billing & Order Mgmt', code: 'DEPT-BIL' },
  { name: 'Escalations', code: 'DEPT-ESC' },
  { name: 'Digital Support', code: 'DEPT-DIG' },
]
export const queueNames = ['Voice - Sales', 'Voice - Support', 'Voice - Escalations', 'Email', 'Chat', 'W2C']
export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const vendors = ['Concentrix', 'TaskUs', 'Foundever', 'Alorica', 'Teleperformance']
export const weekEndingDates = [
  'Aug 22, 2026', 'Aug 15, 2026', 'Aug 08, 2026', 'Aug 01, 2026',
  'Jul 25, 2026', 'Jul 18, 2026', 'Jul 11, 2026', 'Jul 04, 2026',
]

const NON_AGENT_TITLES = ['Manager', 'Director', 'Coach', 'Program Manager', 'Area Manager', 'Project Manager', 'Non-Title Employee']
export const EMP_STATUSES = ['Normal', 'Temporary Duty Assignment', 'New Hire', 'Work From Home', 'Leave of Absence']

export const SEGMENTS = ['Customer Care', 'Central', 'Executive Escalations', 'Help a Customer', 'Federal', 'OMS Case Management', 'Automation & Processes']
export const LOCATIONS = ['Bangalore', 'Pune', 'Hyderabad', 'Cairo', 'Twin Falls', 'Bratislava', 'Manila', 'Dalian', 'Casablanca', 'Panama City']
const BUSINESS_UNIT = 'GBS- QIM(Care)'
const EWFM_DEPTS = [
  { code: 'Not Assigned', name: 'Not Assigned' },
  { code: 'CMAM.CESGB.DEMENM', name: 'Consumer Care - EMEA' },
  { code: 'CPAJ.CESGB.DPQENM', name: 'Consumer Care - APJ' },
  { code: '06TFED', name: 'TF Fed (was L2)' },
]
const SWITCHES = ['DCEC01', 'DCEC02', 'DCEC03', 'DCEC04']

export const issueLabels = ['Concession', 'Doc Request', 'Exchange', 'Order Status', 'Other', 'Provide Info', 'Refund', 'Rejected', 'Return']

export const WEEK_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function fmt(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export function pct(a, f) {
  return f === 0 ? 0 : ((a - f) / f) * 100
}

export function varClass(v) {
  return v >= 0 ? 'pos' : 'neg'
}

export function arrow(v) {
  return v >= 0 ? '▲' : '▼'
}

export function seededRandom(seed) {
  const x = Math.sin(seed * 999.9) * 10000
  return x - Math.floor(x)
}

// Global tuning knob: scales every generated metric value down (originally -15%,
// cut a further 10% on top: 0.85 * 0.90 = 0.765, i.e. ~23.5% below the raw base values).
export const VALUE_SCALE = 0.765

export function genKpiValue(base, seed, decimals = 0) {
  const scaledBase = base * VALUE_SCALE
  const actualJitter = (Math.sin(seed * 13.37) + 1) / 2
  const forecastJitter = (Math.sin(seed * 7.91 + 2.1) + 1) / 2
  const factor = Math.pow(10, decimals)
  const actual = Math.round(scaledBase * (0.92 + actualJitter * 0.16) * factor) / factor
  const forecast = Math.round(scaledBase * (0.95 + forecastJitter * 0.10) * factor) / factor
  return { actual, forecast }
}

export function hashSeed(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 9973
  }
  return hash + 1
}

export function getWeeksForQuarter(q) {
  const qNum = parseInt(q.replace('FQ', ''), 10)
  const startWeek = (qNum - 1) * 13 + 1
  const weeks = []
  for (let i = 0; i < 13; i++) weeks.push('FW' + String(startWeek + i).padStart(2, '0'))
  return weeks
}

export function generateAgentRoster(region) {
  const countries = (regionCountryMap[region] || ['USA']).filter((c) => c !== 'All')
  const totalAgents = 60
  const roster = []
  for (let i = 0; i < totalAgents; i++) {
    const seed = i * 13 + hashSeed(region) * 7
    const fn = firstNames[Math.floor(seededRandom(seed) * firstNames.length)]
    const ln = lastNames[Math.floor(seededRandom(seed + 1) * lastNames.length)]
    const manager = managers[Math.floor(seededRandom(seed + 2) * managers.length)]
    const country = countries[Math.floor(seededRandom(seed + 3) * countries.length)]
    const isScheduled = seededRandom(seed + 4) > 0.12
    let status = 'Available'
    let reason = '—'
    let duration = '—'
    let plannedPct = 0
    let unplannedPct = 0
    const shiftMinutes = 480
    if (!isScheduled) {
      status = 'Scheduled Off'
      plannedPct = 100
    } else {
      const isAvailable = seededRandom(seed + 5) > 0.18
      if (isAvailable) {
        status = 'Available'
        plannedPct = Math.round((Math.floor(seededRandom(seed + 10) * 30) / shiftMinutes) * 1000) / 10
      } else {
        status = 'Unplanned Outage'
        reason = outageReasons[Math.floor(seededRandom(seed + 6) * outageReasons.length)]
        const h = Math.floor(seededRandom(seed + 7) * 4) + 1
        const m = Math.floor(seededRandom(seed + 8) * 59)
        duration = h + 'h ' + m + 'm'
        unplannedPct = Math.round(((h * 60 + m) / shiftMinutes) * 1000) / 10
        plannedPct = Math.round((Math.floor(seededRandom(seed + 11) * 20) / shiftMinutes) * 1000) / 10
      }
    }
    const totalPct = Math.round((plannedPct + unplannedPct) * 10) / 10
    roster.push({ name: `${fn} ${ln}`, manager, country, isScheduled, status, reason, duration, plannedPct, unplannedPct, totalPct })
  }
  return roster
}

export function generateEpicenterRoster(region) {
  const countries = (regionCountryMap[region] || ['USA']).filter((c) => c !== 'All')
  const totalAgents = 60
  const roster = []
  for (let i = 0; i < totalAgents; i++) {
    const seed = i * 17 + hashSeed(region) * 11
    const fn = firstNames[Math.floor(seededRandom(seed) * firstNames.length)]
    const ln = lastNames[Math.floor(seededRandom(seed + 1) * lastNames.length)]
    const name = `${fn} ${ln}`
    const badgeId = 'DEMO-' + String(100000 + Math.floor(seededRandom(seed + 2) * 899999))
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@example-demo.test`
    const hireYear = 2018 + Math.floor(seededRandom(seed + 3) * 7)
    const hireMonth = months[Math.floor(seededRandom(seed + 4) * 12)]
    const hireDay = 1 + Math.floor(seededRandom(seed + 5) * 28)
    const hireDate = `${hireMonth} ${hireDay}, ${hireYear}`
    const queue = queueNames[Math.floor(seededRandom(seed + 6) * queueNames.length)]
    const dept = departments[Math.floor(seededRandom(seed + 7) * departments.length)]
    const manager = managers[Math.floor(seededRandom(seed + 8) * managers.length)]
    const country = countries[Math.floor(seededRandom(seed + 9) * countries.length)]
    const dbOsp = seededRandom(seed + 10) > 0.35 ? 'OSP' : 'DB'
    const vendor = dbOsp === 'OSP' ? vendors[Math.floor(seededRandom(seed + 11) * vendors.length)] : 'Internal'
    const weekEnding = weekEndingDates[Math.floor(seededRandom(seed + 12) * weekEndingDates.length)]
    const title = seededRandom(seed + 13) > 0.12 ? 'Agent' : NON_AGENT_TITLES[Math.floor(seededRandom(seed + 14) * NON_AGENT_TITLES.length)]
    const statusRoll = seededRandom(seed + 15)
    const empStatus = statusRoll > 0.18 ? EMP_STATUSES[0]
      : statusRoll > 0.10 ? EMP_STATUSES[1]
      : statusRoll > 0.05 ? EMP_STATUSES[2]
      : statusRoll > 0.02 ? EMP_STATUSES[3]
      : EMP_STATUSES[4]
    const segRoll = seededRandom(seed + 16)
    const segment = segRoll > 0.14 ? SEGMENTS[0]
      : segRoll > 0.115 ? SEGMENTS[1]
      : segRoll > 0.085 ? SEGMENTS[2]
      : segRoll > 0.06 ? SEGMENTS[3]
      : segRoll > 0.035 ? SEGMENTS[4]
      : segRoll > 0.015 ? SEGMENTS[5]
      : SEGMENTS[6]
    const location = LOCATIONS[Math.floor(seededRandom(seed + 17) * LOCATIONS.length)]
    const ewfmDept = seededRandom(seed + 18) > 0.5
      ? EWFM_DEPTS[0]
      : EWFM_DEPTS[1 + Math.floor(seededRandom(seed + 19) * (EWFM_DEPTS.length - 1))]
    const acdExtension = seededRandom(seed + 20) > 0.6 ? 6000000 + Math.floor(seededRandom(seed + 21) * 999999) : 0
    const switchCode = acdExtension ? SWITCHES[Math.floor(seededRandom(seed + 22) * SWITCHES.length)] : ''
    const subQueueDesc = `${queue.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)}${dept.name.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)}.XXXXX.XXX.${location.toUpperCase().replace(/\s/g, '')}XXXX`
    roster.push({
      name, badgeId, email, hireDate, queue, dept: dept.name, deptCode: dept.code, manager, country, dbOsp, vendor, weekEnding, title, empStatus,
      businessUnit: BUSINESS_UNIT, region, segment, location, subQueueDesc,
      ewfmDeptCode: ewfmDept.code, ewfmDeptName: ewfmDept.name,
      ewfmTeamCode: `Care.${region}`, ewfmTeamName: `Care.${region}`,
      acdExtension, switchCode,
    })
  }
  return roster
}
