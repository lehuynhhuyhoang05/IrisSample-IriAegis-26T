import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { command, seedData, STORAGE_KEY, validateBackup } from './domain.js'

const Context = createContext(null)
function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { data: seedData(), warning: '' }
    const data = JSON.parse(raw)
    if (data.admins?.length === 0 && data.version === 1) return { data: seedData(true), warning: '' }
    return { data: validateBackup({ format: 'iriaegis-web-demo', data }), warning: '' }
  } catch { return { data: seedData(), warning: 'Không đọc được dữ liệu demo cũ. Đang dùng dữ liệu mẫu; chưa ghi đè bản cũ.' } }
}
export function PortalProvider({ children }) {
  const [initial] = useState(read)
  const [db, setDb] = useState(initial.data)
  const dbRef = useRef(db)
  const [actorId, setActorId] = useState(() => { try { return sessionStorage.getItem('aegis.actor') || '' } catch { return '' } })
  const [flash, setFlash] = useState(initial.warning ? { tone: 'warning', text: initial.warning } : null)
  const [scenario, setScenario] = useState('success')
  const actor = db.admins.find(a => a.id === actorId)
  function persist(next) {
    const text = JSON.stringify(next)
    if (text.length > 3500000) throw new Error('Dữ liệu demo đã đầy. Hãy xuất bản sao lưu và giảm số ảnh trước khi lưu.')
    try { localStorage.setItem(STORAGE_KEY, text) } catch { throw new Error('Trình duyệt không cho lưu hoặc bộ nhớ đầy. Chưa lưu thay đổi; hãy xuất dữ liệu trước.') }
    dbRef.current = next; setDb(next)
  }
  function login(id) { setActorId(id); try { sessionStorage.setItem('aegis.actor', id) } catch { /* Memory-only session still works. */ } }
  function logout() { setActorId(''); try { sessionStorage.removeItem('aegis.actor') } catch { /* No persistent session. */ } window.location.hash = '/app/login' }
  function write(action) { const next = command(dbRef.current, actorId, action); persist(next); return next }
  async function simulate(signal) {
    await new Promise(resolve => setTimeout(resolve, scenario === 'slow' ? 1800 : 400))
    if (signal?.aborted) throw new DOMException('Đã hủy', 'AbortError')
    if (scenario === 'error') throw new Error('Giả lập lỗi kết nối. Dữ liệu chưa được gửi; chọn kịch bản Thành công rồi thử lại.')
    return { simulated: true }
  }
  return <Context.Provider value={{ db, actor, write, persist, login, logout, flash, setFlash, scenario, setScenario, simulate }}>{children}</Context.Provider>
}
export const usePortal = () => useContext(Context)

export function useTask() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  const cancel = useCallback(() => { controller.current?.abort(); lock.current = false; setBusy(false) }, [])
  async function run(fn) {
    if (lock.current) return false
    const request = new AbortController()
    controller.current = request
    lock.current = true; setBusy(true); setError('')
    try { await fn(request.signal); return true } catch (e) { if (e.name !== 'AbortError' && !request.signal.aborted) setError(e.message || 'Không thể thực hiện thao tác.'); return false }
    finally { if (controller.current === request) { lock.current = false; setBusy(false) } }
  }
  return { run, busy, error, setError, cancel }
}
