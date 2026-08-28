import { Fragment, useState } from 'react'
import Modal from '../common/Modal.jsx'
import { REGION_ACC, SUBREGION_ACC, SUBREGIONS_BY_REGION, COUNTRY_SUBREGION, COUNTRY_ACC, accTier } from '../../data/geoRegions.js'

const TIER_CLASS = { excellent: 'pos', good: 'pos', fair: 'neg', critical: 'neg' }

function countriesForSubregion(sub) {
  return Object.keys(COUNTRY_SUBREGION).filter((code) => COUNTRY_SUBREGION[code] === sub)
}

export default function OverallSlaDrillModal({ open, onClose, focusRegion }) {
  const [openRegions, setOpenRegions] = useState({})
  const [openSubregions, setOpenSubregions] = useState({})

  function toggleRegion(r) {
    setOpenRegions((prev) => ({ ...prev, [r]: !prev[r] }))
  }
  function toggleSubregion(s) {
    setOpenSubregions((prev) => ({ ...prev, [s]: !prev[s] }))
  }

  return (
    <Modal open={open} onClose={onClose} title="Overall SLA by Geography — Detail">
      <div className="tw scroll">
        <table>
          <thead>
            <tr><th>Geography</th><th>Overall SLA</th></tr>
          </thead>
          <tbody>
            {Object.keys(REGION_ACC).map((region) => {
              const regionOpen = !!openRegions[region] || region === focusRegion
              return (
                <Fragment key={region}>
                  <tr>
                    <td>
                      <button type="button" className="mtx-toggle" onClick={() => toggleRegion(region)}>
                        <span className="mtx-toggle-ic">{regionOpen ? '▾' : '▸'}</span>{region}
                      </button>
                    </td>
                    <td><span className={'badge ' + TIER_CLASS[accTier(REGION_ACC[region])]}>{REGION_ACC[region]}%</span></td>
                  </tr>
                  {regionOpen && SUBREGIONS_BY_REGION[region].map((sub) => {
                    const subOpen = !!openSubregions[sub]
                    return (
                      <Fragment key={sub}>
                        <tr>
                          <td style={{ paddingLeft: 26 }}>
                            <button type="button" className="mtx-toggle" onClick={() => toggleSubregion(sub)}>
                              <span className="mtx-toggle-ic">{subOpen ? '▾' : '▸'}</span>{sub}
                            </button>
                          </td>
                          <td><span className={'badge ' + TIER_CLASS[accTier(SUBREGION_ACC[sub])]}>{SUBREGION_ACC[sub]}%</span></td>
                        </tr>
                        {subOpen && countriesForSubregion(sub).map((code) => (
                          <tr key={code}>
                            <td style={{ paddingLeft: 48, color: 'var(--text-secondary)' }}>{code}</td>
                            <td><span className={'badge ' + TIER_CLASS[accTier(COUNTRY_ACC[code])]}>{COUNTRY_ACC[code]}%</span></td>
                          </tr>
                        ))}
                      </Fragment>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
