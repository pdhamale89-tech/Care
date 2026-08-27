import { useApp } from '../../context/AppContext.jsx'

export default function InfoBtn({ tip, source = 'Care SPOG Data Warehouse', onDark = false }) {
  const { lastUpdated } = useApp()
  const fullTip = `${tip}<strong>Data Source</strong>${source}<strong>Last Refreshed</strong>${lastUpdated}`
  return <span className={'info-btn' + (onDark ? ' on-dark' : '')} data-tip={fullTip}>i</span>
}
