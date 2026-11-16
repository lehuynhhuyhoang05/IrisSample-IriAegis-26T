import { useCallback, useEffect, useRef, useState } from 'react'

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
