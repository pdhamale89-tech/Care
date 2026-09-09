import { useApp } from '../../core/hooks/useApp.js'

export default function Toast() {
  const { toast } = useApp()
  return <div className={`toast ${toast.cls} ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
}
