// Presentation-only diagnostics. A production build never exposes camera test tools.
export function cameraDiagnosticsEnabled() {
  if (!import.meta.env.DEV) return false
  if (import.meta.env.VITE_CAMERA_DIAGNOSTICS === 'true') return true
  try { return localStorage.getItem('aegis.camera-diagnostics') === 'true' } catch { return false }
}
