// Web REST only. Android /sync endpoints must never be used as a CRUD shortcut.
export class ApiError extends Error {
  constructor(message, status = 0, code = '', details = null) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.details = details
  }
}
export function normalizeBaseURL(value) {
  const url = new URL(value, globalThis.location?.origin)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('URL server cần bắt đầu bằng http:// hoặc https://, không kèm tài khoản, query hoặc hash.')
  return url.href.replace(/\/$/, '')
}
export function createApiClient({ baseURL, fetcher = globalThis.fetch, getTokens, setTokens, onExpired = () => {}, timeout = 20000 }) {
  const base = normalizeBaseURL(baseURL)
  let refreshing
  async function send(path, { method = 'GET', body, signal, token, blob = false } = {}) {
    const controller = new AbortController()
    let timedOut = false
    const abort = () => controller.abort(signal?.reason)
    if (signal?.aborted) abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeout)
    try {
      const form = body instanceof FormData
      const response = await fetcher(base + path, { method, signal: controller.signal,
        headers: { Accept: blob ? 'image/*' : 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined && !form ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: form ? body : JSON.stringify(body) } : {}) })
      if (response.status === 204) return null
      if (response.ok && blob) {
        if (!/^image\/(jpeg|png)(;|$)/i.test(response.headers.get('content-type') || '')) throw new ApiError('Server chưa trả ảnh JPEG hoặc PNG hợp lệ.', response.status, 'INVALID_RESPONSE')
        return response.blob()
      }
      const type = response.headers.get('content-type') || ''
      const data = type.includes('json') ? await response.json() : null
      if (!response.ok) {
        const error = data?.error
        const fallback = response.status === 404 || response.status === 501 ? 'Chức năng này chưa khả dụng trên server đang kết nối.' : response.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : `Server trả lỗi ${response.status}. Vui lòng thử lại.`
        throw new ApiError(typeof error === 'string' ? error : error?.message || data?.message || fallback, response.status, error?.code, error?.details)
      }
      if (!data) throw new ApiError('Server trả dữ liệu không đúng định dạng JSON.', response.status, 'INVALID_RESPONSE')
      return data
    } catch (error) {
      if (signal?.aborted) throw new DOMException('Đã hủy yêu cầu', 'AbortError')
      if (timedOut) throw new ApiError('Server phản hồi quá lâu. Kiểm tra kết quả trước khi gửi lại.', 0, 'TIMEOUT')
      if (error instanceof ApiError) throw error
      throw new ApiError('Không kết nối được server. Kiểm tra địa chỉ, kết nối mạng và cấu hình CORS/HTTPS.', 0, 'NETWORK_ERROR')
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
  }
  async function refresh() {
    if (!refreshing) refreshing = (async () => {
      const tokens = getTokens()
      if (!tokens?.refresh_token) throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401)
      const result = await send('/auth/refresh', { method: 'POST', body: { refresh_token: tokens.refresh_token } })
      if (!result.access_token) throw new ApiError('Server không trả access token.', 401)
      const next = { ...tokens, access_token: result.access_token }; setTokens(next); return next
    })().finally(() => { refreshing = null })
    return refreshing
  }
  async function request(path, options = {}) {
    try { return await send(path, { ...options, token: options.public ? undefined : getTokens()?.access_token }) }
    catch (error) {
      if (error.status !== 401 || options.public) throw error
      let tokens
      try { tokens = await refresh() } catch (failure) {
        // A temporary network failure must not erase a still recoverable session.
        if (failure.status === 401 || failure.status === 422) { setTokens(null); onExpired() }
        throw failure
      }
      if (options.signal?.aborted) throw new DOMException('Đã hủy', 'AbortError')
      try { return await send(path, { ...options, token: tokens.access_token }) }
      catch (failure) { if (failure.status === 401) { setTokens(null); onExpired() }; throw failure }
    }
  }
  return { request, baseURL: base }
}
export function queryString(values = {}) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => { if (value !== '' && value !== null && value !== undefined) params.set(key, String(value)) })
  return params.size ? `?${params}` : ''
}
export function listResult(data) {
  if (!Array.isArray(data?.items) || !Number.isFinite(data.total)) throw new ApiError('Danh sách từ server thiếu items hoặc total.', 200, 'INVALID_RESPONSE')
  return data
}
export const unwrap = (data, key) => data?.[key] || data
