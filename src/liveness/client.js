// Contract from group 4: main.py @ 38e09e8ed42178456876ef14fef3a14fc46a7b15.
// No group 1 JWT, locally computed verdict, or client-selected threshold.
export const LIVENESS_BASE_URL = import.meta.env?.VITE_LIVENESS_BASE_URL || '/liveness-api'

export function validateLivenessResult(data) {
  const score = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
  if (data?.status !== 'success' || typeof data.is_real !== 'boolean' ||
      data.result !== (data.is_real ? 'REAL' : 'FAKE') ||
      !score(data.real_score) || !score(data.spoof_score) || !score(data.threshold_used)) {
    throw new Error('API nhóm 4 trả kết quả không hợp lệ. Chưa thể xác nhận liveness.')
  }
  // Scores are rounded by the service; is_real/result are its verdict.
  return Object.freeze({ status: data.status, result: data.result, is_real: data.is_real,
    real_score: data.real_score, spoof_score: data.spoof_score, threshold_used: data.threshold_used })
}

export async function predictLiveness(blob, { signal, fetcher = globalThis.fetch, baseURL = LIVENESS_BASE_URL, timeout = 20000 } = {}) {
  if (!(blob instanceof Blob) || !['image/jpeg', 'image/png'].includes(blob.type) || !blob.size || blob.size > 5 * 1024 * 1024) throw new Error('Ảnh gửi liveness phải là JPEG/PNG, tối đa 5 MB.')
  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason)
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort, { once: true })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeout)
  try {
    const form = new FormData()
    form.append('file', blob, blob.type === 'image/png' ? 'face.png' : 'face.jpg')
    const response = await fetcher(baseURL.replace(/\/$/, '') + '/api/v1/predict-liveness', {
      method: 'POST', headers: { Accept: 'application/json' }, body: form, signal: controller.signal,
    })
    if (signal?.aborted) throw new DOMException('Đã hủy kiểm tra', 'AbortError')
    const data = await response.json().catch(() => null)
    if (signal?.aborted) throw new DOMException('Đã hủy kiểm tra', 'AbortError')
    if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : `Server liveness trả lỗi ${response.status}. Hãy kiểm tra dịch vụ nhóm 4.`)
    return validateLivenessResult(data)
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Đã hủy kiểm tra', 'AbortError')
    if (timedOut) throw new Error('Server liveness phản hồi quá lâu. Hãy thử kiểm tra lại.', { cause: error })
    if (error instanceof TypeError) throw new Error('Không kết nối được server liveness nhóm 4. Kiểm tra dịch vụ cổng 8000 hoặc cấu hình proxy.', { cause: error })
    throw error
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}
