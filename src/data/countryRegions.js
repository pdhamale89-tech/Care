// Maps every ISO-2 country code the bundled react-svg-worldmap dataset ships with
// to one of the 3 macro regions used by the Forecast Adherence map (AMER/EMEA/APJ —
// the standard 3-region split most support orgs report against).
export const COUNTRY_TO_MACRO_REGION = {
  // Americas
  CA: 'AMER', US: 'AMER', MX: 'AMER', AR: 'AMER', CL: 'AMER', HT: 'AMER', DO: 'AMER',
  BS: 'AMER', FK: 'AMER', GL: 'AMER', UY: 'AMER', BR: 'AMER', BO: 'AMER', PE: 'AMER',
  CO: 'AMER', PA: 'AMER', CR: 'AMER', NI: 'AMER', HN: 'AMER', SV: 'AMER', GT: 'AMER',
  BZ: 'AMER', VE: 'AMER', GY: 'AMER', SR: 'AMER', EC: 'AMER', PR: 'AMER', JM: 'AMER',
  CU: 'AMER', PY: 'AMER', TT: 'AMER',
  // EMEA (Europe, Middle East, Africa)
  TZ: 'EMEA', EH: 'EMEA', CD: 'EMEA', SO: 'EMEA', KE: 'EMEA', SD: 'EMEA', TD: 'EMEA',
  RU: 'EMEA', NO: 'EMEA', ZA: 'EMEA', LS: 'EMEA', FR: 'EMEA', ZW: 'EMEA', BW: 'EMEA',
  NA: 'EMEA', SN: 'EMEA', ML: 'EMEA', MR: 'EMEA', BJ: 'EMEA', NE: 'EMEA', NG: 'EMEA',
  CM: 'EMEA', TG: 'EMEA', GH: 'EMEA', CI: 'EMEA', GN: 'EMEA', GW: 'EMEA', LR: 'EMEA',
  SL: 'EMEA', BF: 'EMEA', CF: 'EMEA', CG: 'EMEA', GA: 'EMEA', GQ: 'EMEA', ZM: 'EMEA',
  MW: 'EMEA', MZ: 'EMEA', SZ: 'EMEA', AO: 'EMEA', BI: 'EMEA', IL: 'EMEA', LB: 'EMEA',
  MG: 'EMEA', PS: 'EMEA', GM: 'EMEA', TN: 'EMEA', DZ: 'EMEA', JO: 'EMEA', AE: 'EMEA',
  QA: 'EMEA', KW: 'EMEA', IQ: 'EMEA', OM: 'EMEA', IR: 'EMEA', SY: 'EMEA', AM: 'EMEA',
  SE: 'EMEA', BY: 'EMEA', UA: 'EMEA', PL: 'EMEA', AT: 'EMEA', HU: 'EMEA', MD: 'EMEA',
  RO: 'EMEA', LT: 'EMEA', LV: 'EMEA', EE: 'EMEA', DE: 'EMEA', BG: 'EMEA', GR: 'EMEA',
  TR: 'EMEA', AL: 'EMEA', HR: 'EMEA', CH: 'EMEA', LU: 'EMEA', BE: 'EMEA', NL: 'EMEA',
  PT: 'EMEA', ES: 'EMEA', IE: 'EMEA', IT: 'EMEA', DK: 'EMEA', GB: 'EMEA', IS: 'EMEA',
  AZ: 'EMEA', GE: 'EMEA', SI: 'EMEA', FI: 'EMEA', SK: 'EMEA', CZ: 'EMEA', ER: 'EMEA',
  YE: 'EMEA', SA: 'EMEA', CY: 'EMEA', MA: 'EMEA', EG: 'EMEA', LY: 'EMEA', ET: 'EMEA',
  DJ: 'EMEA', UG: 'EMEA', RW: 'EMEA', BA: 'EMEA', MK: 'EMEA', RS: 'EMEA', ME: 'EMEA',
  XK: 'EMEA', SS: 'EMEA', CYP: 'EMEA', SOM: 'EMEA',
  // APJ (Asia Pacific & Japan)
  FJ: 'APJ', KZ: 'APJ', UZ: 'APJ', PG: 'APJ', ID: 'APJ', TL: 'APJ', VU: 'APJ',
  KH: 'APJ', TH: 'APJ', LA: 'APJ', MM: 'APJ', VN: 'APJ', KP: 'APJ', KR: 'APJ',
  MN: 'APJ', IN: 'APJ', BD: 'APJ', BT: 'APJ', NP: 'APJ', PK: 'APJ', AF: 'APJ',
  TJ: 'APJ', KG: 'APJ', TM: 'APJ', NC: 'APJ', SB: 'APJ', NZ: 'APJ', AU: 'APJ',
  LK: 'APJ', CN: 'APJ', TW: 'APJ', PH: 'APJ', MY: 'APJ', BN: 'APJ', JP: 'APJ',
}
