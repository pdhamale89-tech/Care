import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import './index.css'
import App from './App.jsx'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Tooltip,
  Legend,
  Filler,
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
