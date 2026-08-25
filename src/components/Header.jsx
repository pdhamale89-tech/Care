import { REGIONS } from '../data/mockGenerators.js'

const HEADER_TITLES = {
  cco: 'Care SPOG — Single Pane Of Glass Dashboard',
  outage: 'Care SPOG — Agent Outage Report',
  epicenter: 'Care SPOG — Epicenter HC',
  kpi: 'Care SPOG — KPI Reports',
}

export default function Header({ currentPage, activeRegion, onRegionChange }) {
  return (
    <header>
      <h1>{HEADER_TITLES[currentPage]}</h1>
      <div className="region-tiles">
        {REGIONS.map((r) => (
          <div
            key={r}
            className={'region-tile' + (activeRegion === r ? ' active' : '')}
            onClick={() => onRegionChange(r)}
          >
            {r}
          </div>
        ))}
      </div>
    </header>
  )
}
