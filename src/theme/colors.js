const palettes = {
  light: {
    textPrimary: '#1a1f36',
    textSecondary: '#6b7280',
    gridColor: 'rgba(0,0,0,.06)',
    bgFilter: '#eef1f6',
    bgCard: '#ffffff',
    border: '#e5e7eb',
    accentBlue: '#3b82f6',
    accentGreen: '#10b981',
    accentOrange: '#f59e0b',
    accentRed: '#ef4444',
    accentPurple: '#8b5cf6',
  },
  dark: {
    textPrimary: '#e5e7eb',
    textSecondary: '#9ca3af',
    gridColor: 'rgba(255,255,255,.06)',
    bgFilter: '#161929',
    bgCard: '#1e2235',
    border: '#2d3148',
    accentBlue: '#60a5fa',
    accentGreen: '#34d399',
    accentOrange: '#fbbf24',
    accentRed: '#f87171',
    accentPurple: '#a78bfa',
  },
}

export function getColors(theme) {
  return palettes[theme] || palettes.light
}
