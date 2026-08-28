// Forecast Adherence map data — region/sub-region country groupings and their
// accuracy figures. Structure and base values mirror the SPOG_CSG reference
// implementation's src/data/regions.js.
export const REGION_COUNTRIES = {
  AMER: ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'DO', 'CU', 'HT', 'JM', 'TT', 'GY', 'SR', 'BZ', 'GL'],
  EMEA: ['GB', 'IE', 'FR', 'DE', 'ES', 'PT', 'IT', 'NL', 'BE', 'LU', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'SI', 'RS', 'BA', 'MK', 'AL', 'ME', 'XK', 'EE', 'LV', 'LT', 'UA', 'BY', 'MD', 'RU', 'TR', 'CY', 'MT', 'ZA', 'EG', 'NG', 'KE', 'MA', 'DZ', 'TN', 'LY', 'SA', 'AE', 'IL', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'IQ', 'IR', 'GH', 'ET', 'TZ', 'UG', 'AO', 'MZ', 'ZM', 'ZW', 'SN', 'CI', 'CM'],
  APJ: ['CN', 'JP', 'KR', 'IN', 'AU', 'NZ', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'TW', 'HK', 'PK', 'BD', 'LK', 'NP', 'MM', 'KH', 'LA', 'MN', 'BN', 'MO', 'FJ', 'PG', 'KZ', 'UZ', 'AF'],
}

export const REGION_ACC = { AMER: 78, EMEA: 66, APJ: 48 }

export const COUNTRY_REGION = Object.keys(REGION_COUNTRIES).reduce((acc, region) => {
  REGION_COUNTRIES[region].forEach((code) => { acc[code] = region })
  return acc
}, {})

function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Deterministic per-country accuracy derived from its region's baseline (no live country-level feed).
export const COUNTRY_ACC = Object.keys(COUNTRY_REGION).reduce((acc, code) => {
  const base = REGION_ACC[COUNTRY_REGION[code]]
  const variance = (hashCode(code) % 21) - 10 // -10..+10
  acc[code] = Math.max(30, Math.min(96, base + variance))
  return acc
}, {})

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

// Sub-region accuracy is the average of its member countries' accuracy.
export const SUBREGION_ACC = Object.keys(SUBREGION_MEMBERS).reduce((acc, sub) => {
  const members = SUBREGION_MEMBERS[sub].filter((code) => COUNTRY_ACC[code] != null)
  acc[sub] = Math.round(members.reduce((s, code) => s + COUNTRY_ACC[code], 0) / members.length)
  return acc
}, {})

export function accTier(val) {
  if (val >= 90) return 'excellent'
  if (val >= 80) return 'good'
  if (val >= 70) return 'fair'
  return 'critical'
}
