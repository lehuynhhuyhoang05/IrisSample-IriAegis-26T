import { normalizeBaseURL } from './client.js'

export const DEFAULT_API_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1'
export function readBaseURL() {
  try { return normalizeBaseURL(localStorage.getItem('aegis.api-base') || DEFAULT_API_URL) } catch { return normalizeBaseURL('/api/v1') }
}
