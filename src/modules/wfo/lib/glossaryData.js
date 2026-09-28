// Metric definitions sourced directly from the business's own metric/formula reference
// sheet. Descriptions are derived from each formula (not invented business copy) to
// explain in plain English what the calculation represents.
export const GLOSSARY = [
  {
    metric: 'Case Rate',
    formula: 'Total Cases / Total Orders',
    description: 'The share of orders that generate a case — Total Cases divided by Total Orders.',
  },
  {
    metric: 'Cases',
    formula: 'Orders × Case Rate',
    description: 'The number of cases, derived by applying Case Rate to Orders volume.',
  },
  {
    metric: 'Total Contacts',
    formula: 'Cases × CPSR',
    description: 'Total customer contacts, calculated by multiplying Cases by CPSR (Contacts Per Service Request).',
  },
  {
    metric: 'CPSR',
    formula: 'Total Contacts / Total Cases',
    description: 'Contacts Per Service Request — the average number of contacts needed to resolve one case.',
  },
  {
    metric: 'CRW (Contacts per Representative per Week)',
    formula: 'Total Contacts / Agents / Weeks',
    description: 'Average weekly contact volume handled per agent.',
  },
  {
    metric: 'CCpD (Cases Closed per Day)',
    formula: 'Total Cases / 13 / 5 / FL HC',
    description: 'Cases closed per agent per day — Total Cases divided by 13 (weeks in a quarter), 5 (working days in a week), and Full-Load Headcount (FL HC).',
  },
  {
    metric: 'ICW',
    formula: 'Cases / HC / Number of Weeks',
    description: 'Average cases handled per headcount, per week.',
  },
  {
    metric: 'ApC (Activities per Case)',
    formula: 'Activities / Cases',
    description: 'Average number of logged activities per case.',
  },
  {
    metric: 'TTC (Time To Complete)',
    formula: 'Completion Time / Completed Cases',
    description: 'Average time taken to complete a case, from total completion time across completed cases.',
  },
  {
    metric: 'HC Requirement',
    formula: 'Total Contact Forecast / CRW / 13',
    description: 'Estimated headcount needed for a quarter, based on forecasted contacts and CRW.',
  },
  {
    metric: 'CCD',
    formula: "Cases Completed / 'FL HC' / 5",
    description: 'Cases completed per agent per day, on a Full-Load Headcount (FL HC) basis.',
  },
  {
    metric: 'S-Sat %',
    formula: 'Satisfied Responses / Total Responses',
    description: 'Share of survey responses marked satisfied out of all responses received.',
  },
  {
    metric: 'CSAT %',
    formula: "'CSAT Satisfied' / 'CSAT Response'",
    description: 'Share of CSAT survey responses marked satisfied out of total CSAT responses.',
  },
  {
    metric: 'Total Contacts Actual',
    formula: "'Voice Handled' + 'Handled Chats' + 'All Emails Handled'",
    description: 'Actual total contacts handled, summed across Voice, Chat and Email channels.',
  },
  {
    metric: 'TTC',
    formula: "'TTC (Days)' / 'Cases Completed'",
    description: 'Average calendar days to complete a case, per case completed.',
  },
  {
    metric: 'Email/W2C SLA',
    formula: "('Within SLA' + 'Within SLA (Web)') / ('Total Email Offered' + 'Web Cases Offered')",
    description: 'Share of Email and Web-to-Case contacts resolved within the service level target.',
  },
  {
    metric: 'Csat%',
    formula: "'CSAT Satisfied' / 'CSAT Response'",
    description: 'Share of CSAT survey responses marked satisfied out of total CSAT responses (same calculation as CSAT %).',
  },
  {
    metric: 'XPR%',
    formula: "'XPR Satisfied Response' / 'XPR Response'",
    description: 'Share of XPR survey responses marked satisfied out of total XPR responses.',
  },
]
