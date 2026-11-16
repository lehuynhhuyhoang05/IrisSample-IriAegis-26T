import { normalizeBaseURL } from './client.js'

export const DEFAULT_API_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1'
export function readBaseURL() {
  try { return normalizeBaseURL(localStorage.getItem('aegis.api-base') || DEFAULT_API_URL) } catch { return normalizeBaseURL('/api/v1') }
}
export function readMode() {
  try { return localStorage.getItem('aegis.data-mode') || import.meta.env?.VITE_DATA_MODE || 'server' } catch { return 'server' }
}
export function changeMode(mode) {
  localStorage.setItem('aegis.data-mode', mode)
  window.location.hash = '/app/login'
  window.location.reload()
}
