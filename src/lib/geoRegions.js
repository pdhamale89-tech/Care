// Overall SLA map data — region/sub-region country groupings, plus a seeded
// accuracy computation so the map/drill-down respond to the Weekly/Quarterly
// selector like the rest of CCO Overview. Structure mirrors the
// SPOG_CSG reference implementation's src/data/regions.js.
export const REGION_COUNTRIES = {
  AMER: ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'DO', 'CU', 'HT', 'JM', 'TT', 'GY', 'SR', 'BZ', 'GL'],
  EMEA: ['GB', 'IE', 'FR', 'DE', 'ES', 'PT', 'IT', 'NL', 'BE', 'LU', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'SI', 'RS', 'BA', 'MK', 'AL', 'ME', 'XK', 'EE', 'LV', 'LT', 'UA', 'BY', 'MD', 'RU', 'TR', 'CY', 'MT', 'ZA', 'EG', 'NG', 'KE', 'MA', 'DZ', 'TN', 'LY', 'SA', 'AE', 'IL', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'IQ', 'IR', 'GH', 'ET', 'TZ', 'UG', 'AO', 'MZ', 'ZM', 'ZW', 'SN', 'CI', 'CM'],
  APJ: ['CN', 'JP', 'KR', 'IN', 'AU', 'NZ', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'TW', 'HK', 'PK', 'BD', 'LK', 'NP', 'MM', 'KH', 'LA', 'MN', 'BN', 'MO', 'FJ', 'PG', 'KZ', 'UZ', 'AF'],
}

const BASE_REGION_ACC = { AMER: 78, EMEA: 66, APJ: 48 }

export const COUNTRY_REGION = Object.keys(REGION_COUNTRIES).reduce((acc, region) => {
  REGION_COUNTRIES[region].forEach((code) => { acc[code] = region })
  return acc
}, {})

function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function jitter(seed) {
  return (Math.sin(seed * 13.37) + 1) / 2
}

// Sub-region buckets, one level below the top-level Region grouping above.
// EMEA's SER bucket absorbs everything else in the region (Southern Europe,
// Middle East, Africa) so every country still resolves to exactly one sub-region.
const SUBREGION_MEMBERS = {
  NA: ['US', 'CA'],
  Brazil: ['BR'],
  MMCLA: REGION_COUNTRIES.AMER.filter((c) => !['US', 'CA', 'BR'].includes(c)),
  UKI: ['GB', 'IE'],
  NER: ['SE', 'NO', 'DK', 'FI', 'IS', 'EE', 'LV', 'LT', 'PL'],
  CER: ['DE', 'FR', 'NL', 'BE', 'LU', 'CH', 'AT', 'CZ', 'SK', 'HU'],
  SER: REGION_COUNTRIES.EMEA.filter((c) => !['GB', 'IE', 'SE', 'NO', 'DK', 'FI', 'IS', 'EE', 'LV', 'LT', 'PL', 'DE', 'FR', 'NL', 'BE', 'LU', 'CH', 'AT', 'CZ', 'SK', 'HU'].includes(c)),
  JPN: ['JP'],
  KOR: ['KR'],
  IND: ['IN'],
  ANZ: ['AU', 'NZ', 'FJ', 'PG'],
  SubAsia: ['PK', 'BD', 'LK', 'NP', 'MM', 'KH', 'LA', 'MN', 'AF', 'BN'],
  CCC: REGION_COUNTRIES.APJ.filter((c) => !['JP', 'KR', 'IN', 'AU', 'NZ', 'FJ', 'PG', 'PK', 'BD', 'LK', 'NP', 'MM', 'KH', 'LA', 'MN', 'AF', 'BN'].includes(c)),
}

export const SUBREGIONS_BY_REGION = {
  AMER: ['NA', 'Brazil', 'MMCLA'],
  EMEA: ['UKI', 'NER', 'CER', 'SER'],
  APJ: ['JPN', 'KOR', 'IND', 'ANZ', 'SubAsia', 'CCC'],
}

export const COUNTRY_SUBREGION = Object.keys(SUBREGION_MEMBERS).reduce((acc, sub) => {
  SUBREGION_MEMBERS[sub].forEach((code) => { acc[code] = sub })
  return acc
}, {})

// Region accuracy varies with the given seed (tie it to CCO Overview's
// Weekly/Quarterly view + filters); sub-region and country accuracy are
// derived from it so the map, its labels and the drill-down modal all agree.
export function computeAccuracy(seed) {
  const regionAcc = Object.fromEntries(
    Object.entries(BASE_REGION_ACC).map(([region, base], i) => {
      const j = jitter(seed + i * 17 + 500)
      return [region, Math.round(Math.max(25, Math.min(96, base + (j - 0.5) * 18)))]
    }),
  )
  const countryAcc = Object.keys(COUNTRY_REGION).reduce((acc, code) => {
    const base = regionAcc[COUNTRY_REGION[code]]
    const variance = (hashCode(code) % 21) - 10 // -10..+10
    acc[code] = Math.max(20, Math.min(99, base + variance))
    return acc
  }, {})
  const subregionAcc = Object.keys(SUBREGION_MEMBERS).reduce((acc, sub) => {
    const members = SUBREGION_MEMBERS[sub].filter((code) => countryAcc[code] != null)
    acc[sub] = Math.round(members.reduce((s, code) => s + countryAcc[code], 0) / members.length)
    return acc
  }, {})
  return { regionAcc, subregionAcc, countryAcc }
}

export function accTier(val) {
  if (val >= 90) return 'excellent'
  if (val >= 80) return 'good'
  if (val >= 70) return 'fair'
  return 'critical'
}
