import { useEffect, useRef } from 'react'

export default function InfoTip() {
  const tipRef = useRef(null)

  useEffect(() => {
    const tip = tipRef.current
    let hideTimer
    function onOver(e) {
      const btn = e.target.closest('.info-btn')
      if (!btn) return
      clearTimeout(hideTimer)
      tip.innerHTML = btn.dataset.tip || ''
      const r = btn.getBoundingClientRect()
      tip.style.left = Math.min(r.left, window.innerWidth - 288) + 'px'
      tip.style.top = (r.bottom + 8) + 'px'
      tip.classList.add('show')
    }
    function onOut(e) {
      if (!e.target.closest('.info-btn')) return
      hideTimer = setTimeout(() => tip.classList.remove('show'), 100)
    }
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      clearTimeout(hideTimer)
    }
  }, [])

  return <div id="globalInfoTip" ref={tipRef}></div>
}
