import { useCallback, useEffect, useRef, useState } from 'react'
import { useServer } from './Session.jsx'
import { ApiError, listResult } from './client.js'
import { readAllPages } from './pagination.js'

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

export function useAllPages(path, rowKey) {
  const { api } = useServer()
  const [result, setResult] = useState({ path: '', revision: -1, data: null, loading: false, error: '' })
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    setResult({ path, revision, data: null, loading: true, error: '' })
    readAllPages(api, path, { signal: controller.signal, rowKey }).then(data => {
      if (!controller.signal.aborted) setResult({ path, revision, data, loading: false, error: '' })
    }).catch(error => { if (!controller.signal.aborted) setResult({ path, revision, data: null, loading: false, error: error.message }) })
    return () => controller.abort()
  }, [api, path, rowKey, revision])
  // A reload is pending immediately, before the effect starts. Do not expose the
  // previous receipt list as fresh or depend on an intermediate loading render.
  return { ...(result.path === path && result.revision === revision ? result : { data: null, loading: !!path, error: '' }), reload }
}
