import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createApiClient, normalizeBaseURL, unwrap } from './client.js'
import { readBaseURL } from './config.js'
import { loginBody } from './contract.js'

const Context = createContext(null)
function readTokens() { try { return JSON.parse(sessionStorage.getItem('aegis.server-session') || 'null') } catch { return null } }
export const useServer = () => useContext(Context)
export function ServerProvider({ children }) {
  const tokens = useRef(readTokens()), [actor, setActor] = useState(null), [baseURL, setBase] = useState(readBaseURL)
  const [restoring, setRestoring] = useState(!!tokens.current), [sessionError, setSessionError] = useState('')
  function setTokens(value) {
    tokens.current = value
    try { value ? sessionStorage.setItem('aegis.server-session', JSON.stringify(value)) : sessionStorage.removeItem('aegis.server-session') } catch { /* Memory session remains usable. */ }
  }
  const api = useMemo(() => createApiClient({ baseURL, getTokens: () => tokens.current, setTokens,
    onExpired: () => { setActor(null); setSessionError('Phiên đã hết hạn. Vui lòng đăng nhập lại.') } }), [baseURL])
  useEffect(() => {
    if (!tokens.current) return
    const controller = new AbortController()
    api.request('/auth/me', { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setActor(unwrap(data, 'admin')); setSessionError('') }
    }).catch(error => { if (!controller.signal.aborted) setSessionError(error.message) }).finally(() => { if (!controller.signal.aborted) setRestoring(false) })
    return () => controller.abort()
  }, [api])
  async function login(identifier, password, signal) {
    const result = await api.request('/auth/login', { method: 'POST', public: true, signal, body: loginBody(identifier, password) })
    if (!result.access_token || !result.refresh_token) throw new Error('Phản hồi đăng nhập thiếu token.')
    setTokens({ access_token: result.access_token, refresh_token: result.refresh_token })
    const account = result.admin || unwrap(await api.request('/auth/me', { signal }), 'admin')
    setActor(account); setSessionError('')
  }
  function clearSession() { setTokens(null); setActor(null); setSessionError(''); window.location.hash = '/app/login' }
  async function logout(signal) {
    await api.request('/auth/logout', { method: 'POST', signal, body: { refresh_token: tokens.current?.refresh_token } })
    clearSession()
  }
  function configure(value) {
    const next = normalizeBaseURL(value)
    localStorage.setItem('aegis.api-base', next); clearSession(); setBase(next)
  }
  return <Context.Provider value={{ api, baseURL, configure, actor, restoring, sessionError, login, logout, clearSession }}>{children}</Context.Provider>
}
