import { REGIONS } from '../data/mockGenerators.js'

const HEADER_TITLES = {
  cco: 'SPOG Rohit — Customer Support Operations Dashboard',
  outage: 'SPOG Rohit — Agent Outage Report',
  epicenter: 'SPOG Rohit — Epicenter HC',
  kpi: 'SPOG Rohit — KPI Reports',
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
