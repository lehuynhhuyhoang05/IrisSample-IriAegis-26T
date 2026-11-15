import { useCallback, useEffect, useRef, useState } from 'react'
import { useServer } from './Session.jsx'
import { ApiError, listResult } from './client.js'

export function useResource(path) {
  const { api } = useServer()
  const [result, setResult] = useState({ path: '', data: null, loading: true, error: '' })
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    setResult({ path, data: null, loading: true, error: '' })
    api.request(path, { signal: controller.signal }).then(data => {
      if (/^\/(students|subjects|admins)(\?|$)/.test(path) || /^\/subjects\/[^/]+\/students(\?|$)/.test(path) || /^\/(attendance|checkins)(\?|$)/.test(path)) listResult(data)
      if (/\/(email-recipients|attendance-summary)(\?|$)/.test(path) && !Array.isArray(data.items)) throw new ApiError('Danh sách từ server thiếu trường items.', 200, 'INVALID_RESPONSE')
      if (!controller.signal.aborted) setResult({ path, data, loading: false, error: '' })
    })
      .catch(error => { if (!controller.signal.aborted) setResult({ path, data: null, loading: false, error: error.message }) })
    return () => controller.abort()
  }, [api, path, revision])
  return { ...(result.path === path ? result : { data: null, loading: !!path, error: '' }), reload }
}
export function useStepFocus(step) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ block: 'start' }) }, [step])
  return ref
}
