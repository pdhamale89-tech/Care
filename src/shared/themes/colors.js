// Dell Design System v3 token values (mirrors the CSS custom properties in
// theme.css) — kept as a parallel JS object because Chart.js/SVG rendering
// needs literal color values, not CSS custom properties.
const palettes = {
  light: {
    textPrimary: '#1D2C3B',   // dds-slate-70
    textSecondary: '#40586D', // dds-slate-50
    gridColor: 'rgba(0,0,0,.06)',
    bgFilter: '#EBF1F6',      // dds-slate-10
    bgCard: '#ffffff',
    border: '#EBF1F6',        // dds-color-border-neutral-subtle
    accentBlue: '#0672CB',    // dds-blue-60
    accentGreen: '#4A7600',   // dds-green-70 (text-success)
    accentOrange: '#EF6C00',  // dds-orange-60
    accentRed: '#B32020',     // dds-red-70 (text-error)
    accentPurple: '#703DB3',  // dds-purple-60
  },
  dark: {
    textPrimary: '#EBF1F6',   // dds-slate-10
    textSecondary: '#A4B8CD', // dds-slate-30
    gridColor: 'rgba(255,255,255,.06)',
    bgFilter: '#0A0E14',      // dds-slate-90
    bgCard: '#141D28',        // dds-slate-80
    border: '#1D2C3B',        // dds-slate-70
    accentBlue: '#31A2E3',    // dds-blue-40
    accentGreen: '#A6CF4A',   // dds-green-30
    accentOrange: '#FB8C00',  // dds-orange-50
    accentRed: '#FF8080',     // dds-red-30
    accentPurple: '#A66CFF',  // dds-purple-40
  },
}

export function getColors(theme) {
  return palettes[theme] || palettes.light
}
