import { useMemo, useState } from 'react'
import WorldMap, { regions as WORLD_REGIONS } from 'react-svg-worldmap'
import { useApp } from '../../context/AppContext.jsx'
import { fmt, hashSeed } from '../../data/mockGenerators.js'
import { COUNTRY_TO_MACRO_REGION } from '../../data/countryRegions.js'
import { getColors } from '../../theme/colors.js'
import InfoBtn from '../common/InfoBtn.jsx'

const MACRO_REGIONS = ['AMER', 'EMEA', 'APJ']
const BASE_ADHERENCE = { AMER: 78, EMEA: 63, APJ: 47 }

function jitter(seed) {
  return (Math.sin(seed * 13.37) + 1) / 2
}

function tier(pct) {
  if (pct >= 90) return { label: 'Excellent', key: 'accentGreen' }
  if (pct >= 80) return { label: 'Good', key: 'accentBlue' }
  if (pct >= 70) return { label: 'Fair', key: 'accentOrange' }
  return { label: 'Critical', key: 'accentRed' }
}

export default function ForecastAdherenceMap() {
  const { theme, ccoFilters, ccoView } = useApp()
  const colors = getColors(theme)
  const [viewBy, setViewBy] = useState('region')
  const [selected, setSelected] = useState(null)

  const seed = useMemo(
    () => hashSeed(ccoFilters.subRegion.join(',') + ccoFilters.quarter.join(',') + ccoFilters.week.join(',') + ccoView + 'forecastAdherence'),
    [ccoFilters, ccoView],
  )

  const adherence = useMemo(
    () => Object.fromEntries(
      MACRO_REGIONS.map((r, i) => {
        const j = jitter(seed + i * 17 + 500)
        const value = Math.round(Math.max(25, Math.min(96, BASE_ADHERENCE[r] + (j - 0.5) * 18)) * 10) / 10
        return [r, value]
      }),
    ),
    [seed],
  )

  const mapData = useMemo(
    () => WORLD_REGIONS.map((r) => ({
      country: r.code,
      value: adherence[COUNTRY_TO_MACRO_REGION[r.code]] ?? adherence.AMER,
    })),
    [adherence],
  )

  const active = selected || { macro: 'EMEA', name: 'EMEA', value: adherence.EMEA }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          🌐 Forecast Adherence <InfoBtn tip="<strong>Purpose</strong>Forecast accuracy by macro region (AMER/EMEA/APJ) — click a region on the map to see its exact figure." />
        </div>
        <div className="plan-sel">
          <button type="button" className={'plan-btn' + (viewBy === 'region' ? ' active' : '')} onClick={() => setViewBy('region')}>Region</button>
          <button type="button" className={'plan-btn' + (viewBy === 'subregion' ? ' active' : '')} onClick={() => setViewBy('subregion')} disabled title="Sub Region drill-down coming soon">Sub Region</button>
        </div>
      </div>

      <div className="fa-layout">
        <div className="fa-map">
          <WorldMap
            size="responsive"
            data={mapData}
            color={colors.accentBlue}
            backgroundColor="transparent"
            borderColor={colors.border}
            tooltipBgColor={colors.textPrimary}
            tooltipTextColor={colors.bgCard}
            styleFunction={(ctx) => ({
              fill: colors[tier(ctx.countryValue).key],
              stroke: colors.bgCard,
              strokeWidth: 0.5,
              cursor: 'pointer',
              outline: 'none',
            })}
            tooltipTextFunction={(ctx) => `${ctx.countryName} · ${COUNTRY_TO_MACRO_REGION[ctx.countryCode] || ''} — ${fmt(ctx.countryValue)}% adherence`}
            onClickFunction={(ctx) => {
              const macro = COUNTRY_TO_MACRO_REGION[ctx.countryCode]
              if (macro) setSelected({ macro, name: macro, value: adherence[macro] })
            }}
          />
        </div>
        <div className="fa-side">
          <div className="fa-callout">
            <div className="fa-callout-region">{active.name}</div>
            <div className="fa-callout-value" style={{ color: colors[tier(active.value).key] }}>{fmt(active.value)}%</div>
            <div className="fa-callout-sub">accuracy</div>
          </div>
        </div>
      </div>

      <div className="fa-legend">
        <span><span className="fa-leg" style={{ background: colors.accentGreen }}></span>≥90% Excellent</span>
        <span><span className="fa-leg" style={{ background: colors.accentBlue }}></span>80–90% Good</span>
        <span><span className="fa-leg" style={{ background: colors.accentOrange }}></span>70–80% Fair</span>
        <span><span className="fa-leg" style={{ background: colors.accentRed }}></span>&lt;70% Critical</span>
      </div>
    </div>
  )
}
