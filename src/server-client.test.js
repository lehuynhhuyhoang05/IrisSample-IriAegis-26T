import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import YAML from 'yaml'
import { ApiError, createApiClient, listResult, normalizeBaseURL, queryString } from './server/client.js'

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
test('JWT refresh dùng chung cho request đồng thời, gửi lại với token mới', async () => {
  let tokens = { access_token: 'expired', refresh_token: 'refresh' }, refreshes = 0, expired = false
  const client = createApiClient({ baseURL: 'http://localhost:5000/api/v1/', getTokens: () => tokens, setTokens: value => { tokens = value }, onExpired: () => { expired = true },
    fetcher: async (url, options) => {
      if (url.endsWith('/auth/refresh')) { refreshes++; await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(JSON.parse(options.body).refresh_token, 'refresh'); return json({ access_token: 'fresh' }) }
      if (options.headers.Authorization === 'Bearer expired') return json({ error: { message: 'Hết hạn' } }, 401)
      assert.equal(options.headers.Authorization, 'Bearer fresh'); return json({ items: [], total: 0 })
    } })
  await Promise.all([client.request('/students'), client.request('/subjects')])
  assert.equal(refreshes, 1); assert.equal(expired, false)
})
test('204, lỗi 403/422 có thông tin, không fallback dữ liệu mẫu', async () => {
  const client = createApiClient({ baseURL: 'http://localhost:5000', getTokens: () => null, setTokens: () => {}, fetcher: async url => url.endsWith('/delete') ? new Response(null, { status: 204 }) : json({ error: { code: 'NOT_ENROLLED', message: 'Chưa ghi danh', details: { student_id: 'SV1' } } }, 422) })
  assert.equal(await client.request('/delete', { method: 'DELETE' }), null)
  await assert.rejects(client.request('/attendance'), e => e instanceof ApiError && e.status === 422 && e.code === 'NOT_ENROLLED' && e.details.student_id === 'SV1')
})
test('FormData để trình duyệt tạo boundary, timeout và hủy phân biệt được', async () => {
  const client = createApiClient({ baseURL: 'http://localhost:5000', getTokens: () => null, setTokens: () => {}, timeout: 15, fetcher: async (url, options) => {
    if (url.endsWith('/upload')) { assert.equal(options.headers['Content-Type'], undefined); assert.ok(options.body instanceof FormData); return json({ job_id: 'JOB1' }) }
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
  } })
  const body = new FormData(); body.set('file', new Blob(['x']), 'data.csv')
  assert.equal((await client.request('/upload', { method: 'POST', body })).job_id, 'JOB1')
  await assert.rejects(client.request('/slow'), error => error.code === 'TIMEOUT')
  const controller = new AbortController(); const request = client.request('/slow', { signal: controller.signal }); controller.abort()
  await assert.rejects(request, error => error.name === 'AbortError')
})
test('Refresh token hết hạn xóa phiên, lỗi mạng không xóa phiên', async () => {
  for (const status of [401, 503]) {
    let tokens = { access_token: 'old', refresh_token: 'refresh' }, expired = false
    const client = createApiClient({ baseURL: 'http://localhost:5000', getTokens: () => tokens, setTokens: value => { tokens = value }, onExpired: () => { expired = true }, fetcher: async url => json({ error: { message: 'Lỗi' } }, url.endsWith('/auth/refresh') ? status : 401) })
    await assert.rejects(client.request('/students'))
    assert.equal(expired, status === 401); assert.equal(tokens === null, status === 401)
  }
})
test('validate URL, phân trang, query không bỏ mất offset=0', () => {
  assert.equal(normalizeBaseURL('http://localhost:5000/api/v1/'), 'http://localhost:5000/api/v1')
  assert.throws(() => normalizeBaseURL('javascript:alert(1)'))
  assert.equal(queryString({ q: 'A B', offset: 0, empty: '' }), '?q=A+B&offset=0')
  assert.throws(() => listResult({ students: [] }))
})
test('đối chiếu endpoint frontend với YAML, ghi nhận đúng hai path trùng trong bản nhóm 1', () => {
  const document = YAML.parseDocument(fs.readFileSync(new URL('../openapi.yml', import.meta.url), 'utf8'), { uniqueKeys: false })
  assert.equal(document.errors.length, 0)
  const paths = document.get('paths').items, seen = new Set(), duplicates = []
  for (const entry of paths) { const path = entry.key.value; if (seen.has(path)) duplicates.push(path); seen.add(path) }
  assert.deepEqual(duplicates.sort(), ['/attendance', '/students'])
  for (const [path, method] of [['/auth/login', 'post'], ['/auth/me', 'get'], ['/auth/refresh', 'post'], ['/students', 'get'], ['/students/{id}', 'put'], ['/subjects', 'post'], ['/subjects/{subject_id}/students', 'post'], ['/attendance', 'post'], ['/attendance', 'get'], ['/import/csv', 'post'], ['/jobs/{id}', 'get'], ['/subjects/{subject_id}/send-report', 'post']]) {
    assert.ok(paths.some(entry => entry.key.value === path && entry.value.has(method)), `${method} ${path}`)
  }
})
