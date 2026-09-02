import { useEffect, useMemo, useRef, useState } from 'react'
import jsVectorMap from 'jsvectormap'
import 'jsvectormap/dist/maps/world.js'
import 'jsvectormap/dist/jsvectormap.min.css'
import { COUNTRY_REGION, COUNTRY_SUBREGION, computeAccuracy, accTier } from '../../data/geoRegions.js'
import { hashSeed } from '../../data/mockGenerators.js'
import { getColors } from '../../theme/colors.js'
import { useApp } from '../../context/AppContext.jsx'
import InfoBtn from '../common/InfoBtn.jsx'
import OverallSlaDrillModal from './OverallSlaDrillModal.jsx'

// Hand-picked on-land coordinates so region/sub-region labels land in a
// recognizable spot instead of at an arbitrary country's bounding-box center.
const REGION_LABEL_COORDS = { AMER: [32, -97], EMEA: [50, 10], APJ: [19, 100] }
const SUBREGION_LABEL_COORDS = {
  NA: [45, -100], Brazil: [-10, -55], MMCLA: [15, -85],
  UKI: [54, -3], NER: [60, 15], CER: [50, 10], SER: [40, 22],
  JPN: [36, 138], KOR: [36, 128], IND: [22, 78], ANZ: [-25, 135], SubAsia: [28, 70], CCC: [25, 105],
}

function tierColor(val, c) {
  const scale = { excellent: c.accentGreen, good: c.accentBlue, fair: c.accentOrange, critical: c.accentRed }
  return scale[accTier(val)]
}

export default function ForecastAdherenceMap() {
  const { theme, ccoFilters, ccoView } = useApp()
  const [mode, setMode] = useState('region')
  const [hover, setHover] = useState(null)
  const [drillOpen, setDrillOpen] = useState(false)
  const mapRef = useRef(null)
  const wrapRef = useRef(null)
  const colors = getColors(theme)

  const seed = useMemo(
    () => hashSeed(ccoFilters.subRegion.join(',') + ccoFilters.quarter.join(',') + ccoFilters.week.join(',') + ccoView + 'overallSlaMap'),
    [ccoFilters, ccoView],
  )
  const { regionAcc, subregionAcc } = useMemo(() => computeAccuracy(seed), [seed])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.destroy()
      mapRef.current = null
    }
    setHover(null)
    // jsvectormap's own destroy() doesn't reliably remove marker-label <text>
    // nodes it injected via labels.markers.render — without this, switching
    // Region/Sub Region leaves the previous instance's labels behind, stacked
    // underneath the new ones.
    const container = document.getElementById('forecastAdherenceMap')
    if (container) container.innerHTML = ''
    const isSubregion = mode === 'subregion'
    const groupAcc = isSubregion ? subregionAcc : regionAcc
    const groupOf = isSubregion ? COUNTRY_SUBREGION : COUNTRY_REGION
    const labelCoords = isSubregion ? SUBREGION_LABEL_COORDS : REGION_LABEL_COORDS
    const tierScale = { excellent: colors.accentGreen, good: colors.accentBlue, fair: colors.accentOrange, critical: colors.accentRed }

    const seriesConfig = {
      attribute: 'fill',
      scale: Object.keys(groupAcc).reduce((acc, key) => {
        acc[key] = tierScale[accTier(groupAcc[key])]
        return acc
      }, {}),
      values: groupOf,
    }

    const labelHalo = { fill: '#fff', stroke: 'rgba(0,0,0,.6)', strokeWidth: 2, paintOrder: 'stroke', fontWeight: 700 }

    mapRef.current = new jsVectorMap({
      selector: '#forecastAdherenceMap',
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
            return `${markerConfig.name} ${groupAcc[markerConfig.name]}%`
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
        setHover({ label: group, value: groupAcc[group] })
      },
      onRegionClick() {
        setDrillOpen(true)
      },
    })

    // jsvectormap sizes its SVG from the container's measured width at construction
    // time; if the card/grid layout hasn't settled yet (e.g. right after a tab/theme
    // switch), that measurement can be too narrow and the map renders shifted/cropped.
    // Re-measure once layout has settled, and again on any later resize.
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
  }, [theme, mode, regionAcc, subregionAcc])

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          🌍 Overall SLA <InfoBtn tip={`<strong>Purpose</strong>Overall SLA by geography, ${ccoView} view. Toggle Region/Sub Region to change map granularity; % labels are shown directly on the map.<strong>Tip</strong>💡 Click the map for a Channel/Segment/Region/Sub Region variance matrix.`} />
        </div>
        <div className="plan-sel">
          <button type="button" className={'plan-btn' + (mode === 'region' ? ' active' : '')} onClick={() => setMode('region')}>Region</button>
          <button type="button" className={'plan-btn' + (mode === 'subregion' ? ' active' : '')} onClick={() => setMode('subregion')}>Sub Region</button>
        </div>
      </div>

      <div className="geo-map-inner" ref={wrapRef} onMouseLeave={() => setHover(null)}>
        <div id="forecastAdherenceMap"></div>
        {hover && (
          <div className="geo-hover-card">
            <div className="geo-hover-name">{hover.label}</div>
            <div className="geo-hover-val" style={{ color: tierColor(hover.value, colors) }}>{hover.value}%</div>
          </div>
        )}
      </div>
      <div className="geo-legend">
        <span className="geo-legend-item"><span className="geo-legend-dot" style={{ background: colors.accentGreen }}></span>≥90% Excellent</span>
        <span className="geo-legend-item"><span className="geo-legend-dot" style={{ background: colors.accentBlue }}></span>80–90% Good</span>
        <span className="geo-legend-item"><span className="geo-legend-dot" style={{ background: colors.accentOrange }}></span>70–80% Fair</span>
        <span className="geo-legend-item"><span className="geo-legend-dot" style={{ background: colors.accentRed }}></span>&lt;70% Critical</span>
      </div>

      <OverallSlaDrillModal open={drillOpen} onClose={() => setDrillOpen(false)} seed={seed} />
    </div>
  )
}
