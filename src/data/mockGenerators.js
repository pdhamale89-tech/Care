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

// Global tuning knob: scales every generated metric value down by 15%.
export const VALUE_SCALE = 0.85

export function genKpiValue(base, seed) {
  const scaledBase = base * VALUE_SCALE
  const jitter = (Math.sin(seed * 13.37) + 1) / 2
  const actual = Math.round(scaledBase * (0.92 + jitter * 0.16) * 100) / 100
  const forecast = Math.round(scaledBase * 100) / 100
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
    const seed = i * 13 + region.length * 7
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
    const seed = i * 17 + region.length * 11
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
    roster.push({ name, badgeId, email, hireDate, queue, dept: dept.name, deptCode: dept.code, manager, country })
  }
  return roster
}
