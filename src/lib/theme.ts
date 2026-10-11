export const theme = {
  bg: '#000000',
  fg: '#FFFFFF',
  dim: 'rgba(255,255,255,0.55)',
  line: 'rgba(255,255,255,0.12)',
  surface: '#0D0D0D',

  // Tracking tightens as size grows. Leave fonts on the system face (SF / Roboto).
  type: {
    display: { fontSize: 34, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
    title:   { fontSize: 22, lineHeight: 26, fontWeight: '600', letterSpacing: -0.3 },
    body:    { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.4 },
  },

  // Critically damped by default; only add bounce after a flick.
  spring: { dampingRatio: 1, duration: 400 },
} as const;