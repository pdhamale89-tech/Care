import { useEffect, useMemo, useRef, useState } from 'react'
import jsVectorMap from 'jsvectormap'
import 'jsvectormap/dist/maps/world.js'
import 'jsvectormap/dist/jsvectormap.min.css'
import { REGION_COUNTRIES, COUNTRY_REGION, COUNTRY_SUBREGION, SUBREGIONS_BY_REGION } from '../../data/geoRegions.js'
import { getColors } from '../../theme/colors.js'
import InfoBtn from '../common/InfoBtn.jsx'

// The roster's `country` field holds full country names (mockGenerators.js's own
// region taxonomy), not the ISO-2 codes geoRegions.js's AMER/EMEA/APJ map uses —
// bridge the ~23 country names that actually appear in the roster data.
const COUNTRY_NAME_TO_ISO2 = {
  USA: 'US', UK: 'GB', 'United Kingdom': 'GB', Canada: 'CA', Mexico: 'MX', Brazil: 'BR',
  Argentina: 'AR', Chile: 'CL', Colombia: 'CO', Peru: 'PE',
  Germany: 'DE', France: 'FR', UAE: 'AE', 'South Africa': 'ZA', Spain: 'ES', Italy: 'IT',
  China: 'CN', Japan: 'JP', Korea: 'KR', Australia: 'AU', India: 'IN', Singapore: 'SG', Taiwan: 'TW',
}

const REGION_LABEL_COORDS = { AMER: [32, -97], EMEA: [50, 10], APJ: [19, 100] }
const SUBREGION_LABEL_COORDS = {
  NA: [45, -100], Brazil: [-10, -55], MMCLA: [15, -85],
  UKI: [54, -3], NER: [60, 15], CER: [50, 10], SER: [40, 22],
  JPN: [36, 138], KOR: [36, 128], IND: [22, 78], ANZ: [-25, 135], SubAsia: [28, 70], CCC: [25, 105],
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

// Sequential (one hue, light -> dark) shading by share of the max group, not a
// fixed tier scheme — this is a magnitude (headcount), not a performance grade.
function shadeFor(t, baseHex) {
  const alpha = 0.22 + Math.max(0, Math.min(1, t)) * 0.78
  return `rgba(${hexToRgb(baseHex)}, ${alpha})`
}

export default function EpiHcLocationMap({ agents, onDrill, theme }) {
  const colors = getColors(theme)
  const [mode, setMode] = useState('region')
  const [sourcing, setSourcing] = useState('DB')
  const [hover, setHover] = useState(null)
  const mapRef = useRef(null)
  const wrapRef = useRef(null)

  const geoAgents = useMemo(
    () => agents
      .map((a) => ({ ...a, iso2: COUNTRY_NAME_TO_ISO2[a.country] }))
      .filter((a) => a.iso2 && COUNTRY_REGION[a.iso2]),
    [agents],
  )

  const sourceColor = sourcing === 'DB' ? colors.accentBlue : colors.accentOrange

  const groups = useMemo(
    () => (mode === 'subregion' ? Object.values(SUBREGIONS_BY_REGION).flat() : Object.keys(REGION_COUNTRIES)),
    [mode],
  )

  const counts = useMemo(() => {
    const groupOf = mode === 'subregion' ? COUNTRY_SUBREGION : COUNTRY_REGION
    const c = Object.fromEntries(groups.map((g) => [g, 0]))
    geoAgents.forEach((a) => {
      if (a.dbOsp !== sourcing) return
      const g = groupOf[a.iso2]
      if (g in c) c[g] += 1
    })
    return c
  }, [geoAgents, groups, mode, sourcing])

  const maxCount = useMemo(() => Math.max(1, ...Object.values(counts)), [counts])

  function drillGroup(group) {
    const groupOf = mode === 'subregion' ? COUNTRY_SUBREGION : COUNTRY_REGION
    const rows = geoAgents.filter((a) => a.dbOsp === sourcing && groupOf[a.iso2] === group)
    onDrill(`${group} — ${sourcing}`, rows)
  }

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.destroy()
      mapRef.current = null
    }
    setHover(null)
    // jsvectormap's own destroy() doesn't reliably remove marker-label <text>
    // nodes it injected via labels.markers.render — without this, switching
    // Region/Sub Region (or DB/OSP) leaves the previous instance's labels
    // behind, stacked underneath the new ones.
    const container = document.getElementById('epiHcLocationMap')
    if (container) container.innerHTML = ''
    const isSubregion = mode === 'subregion'
    const groupOf = isSubregion ? COUNTRY_SUBREGION : COUNTRY_REGION
    const labelCoords = isSubregion ? SUBREGION_LABEL_COORDS : REGION_LABEL_COORDS

    const seriesConfig = {
      attribute: 'fill',
      scale: Object.fromEntries(groups.map((g) => [g, shadeFor(counts[g] / maxCount, sourceColor)])),
      values: groupOf,
    }

    const labelHalo = { fill: '#fff', stroke: 'rgba(0,0,0,.6)', strokeWidth: 2, paintOrder: 'stroke', fontWeight: 700 }

    mapRef.current = new jsVectorMap({
      selector: '#epiHcLocationMap',
      map: 'world',
      zoomButtons: false,
      zoomOnScroll: false,
      draggable: true,
      regionsSelectable: false,
      markersSelectable: false,
      backgroundColor: 'transparent',
      regionStyle: {
        initial: { fill: colors.bgFilter, stroke: colors.border, strokeWidth: 0.5 },
        hover: { fillOpacity: 0.85, cursor: 'pointer' },
      },
      markerStyle: {
        initial: { r: 0, fill: 'transparent', stroke: 'transparent' },
        hover: { r: 0, fill: 'transparent', stroke: 'transparent', cursor: 'default' },
      },
      series: { regions: [seriesConfig] },
      markers: Object.keys(labelCoords).map((key) => ({ name: key, coords: labelCoords[key] })),
      labels: {
        markers: {
          render(markerConfig) {
            return `${markerConfig.name} ${counts[markerConfig.name] ?? 0}`
          },
        },
      },
      regionLabelStyle: { initial: { ...labelHalo, fontSize: 8 } },
      markerLabelStyle: { initial: { ...labelHalo, fontSize: 11 } },
      // Kept enabled (but visually hidden via CSS) so this event still fires -
      // disabling showTooltip makes the library's own destroy() throw, since it
      // unconditionally calls the (then never-created) tooltip's .dispose().
      onRegionTooltipShow(event, tooltip, code) {
        const group = groupOf[code]
        if (!group) return
        setHover({ label: group, count: counts[group] })
      },
      onRegionClick(event, code) {
        const group = groupOf[code]
        if (!group) return
        drillGroup(group)
      },
    })

    // jsvectormap sizes its SVG from the container's measured width at construction
    // time; if the card/grid layout hasn't settled yet, that measurement can be too
    // narrow and the map renders shifted/cropped. Re-measure once layout has
    // settled, and again on any later resize.
    const raf = requestAnimationFrame(() => mapRef.current?.updateSize())
    const onWindowResize = () => mapRef.current?.updateSize()
    window.addEventListener('resize', onWindowResize)

    let ro
    if (wrapRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => mapRef.current?.updateSize())
      ro.observe(wrapRef.current)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onWindowResize)
      ro?.disconnect()
      mapRef.current?.destroy()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mode, sourcing, counts, maxCount, groups, colors, sourceColor])

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          🌍 Headcount by Location <InfoBtn tip="<strong>Purpose</strong>Headcount by geography, toggled DB vs OSP. Toggle Region/Sub Region to change map granularity; labels show each group's headcount for the selected sourcing type. Click the map for that region's agent details." />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="plan-sel">
            <button type="button" className={'plan-btn' + (sourcing === 'DB' ? ' active' : '')} onClick={() => setSourcing('DB')}>DB</button>
            <button type="button" className={'plan-btn' + (sourcing === 'OSP' ? ' active' : '')} onClick={() => setSourcing('OSP')}>OSP</button>
          </div>
          <div className="plan-sel">
            <button type="button" className={'plan-btn' + (mode === 'region' ? ' active' : '')} onClick={() => setMode('region')}>Region</button>
            <button type="button" className={'plan-btn' + (mode === 'subregion' ? ' active' : '')} onClick={() => setMode('subregion')}>Sub Region</button>
          </div>
        </div>
      </div>

      <div className="geo-map-inner" ref={wrapRef} onMouseLeave={() => setHover(null)}>
        <div id="epiHcLocationMap"></div>
        {hover && (
          <div className="geo-hover-card">
            <div className="geo-hover-name">{hover.label}</div>
            <div className="geo-hover-val" style={{ color: sourceColor }}>{hover.count}</div>
            <div className="geo-hover-sub">{sourcing} agents</div>
          </div>
        )}
      </div>
      <div className="heatmap-legend" style={{ justifyContent: 'center' }}>
        <span>Low</span>
        <div className="heatmap-legend-bar" style={{ background: `linear-gradient(90deg, ${shadeFor(0, sourceColor)}, ${shadeFor(1, sourceColor)})` }}></div>
        <span>High</span>
      </div>
      <div className="mc-drill-hint">Click a region for agent details ▸</div>
    </div>
  )
}
