/* global localStorage, window */
import { Buffer } from 'node:buffer'
import { URL } from 'node:url'
import { expect } from '@playwright/test'
import { matchOperation, requestErrors, responseErrors } from '../../scripts/openapi-contract.mjs'

export const actor = { admin_id: 'ADM1', full_name: 'Lê Huy Hoàng', email: 'hoang@test.local', role: 'SUPER_ADMIN', is_first_login: 0 }
export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4m0AAAAASUVORK5CYII=', 'base64')
export async function fixture(page) {
  await page.addInitScript(() => { localStorage.setItem('aegis.data-mode', 'server'); localStorage.setItem('aegis.api-base', window.location.origin + '/api/v1') })
  const state = { actor: { ...actor }, writes: [], seen: new Set(), violations: [], checkins: [], failAttendance: false, finishJobs: true, expireNext: false,
    students: Array.from({ length: 30 }, (_, index) => ({ student_id: `SV${String(index + 1).padStart(3, '0')}`, full_name: `Sinh viên kiểm thử ${String(index + 1).padStart(2, '0')}`, email: `sv${index + 1}@test.local`, phone: '0901234567' })),
    subjects: [{ subject_id: 'WEB301', subject_name: 'Phát triển ứng dụng Web', time_slot: 'Thứ 2 (07:30 - 09:30)', instructor_id: 'ADM1', subject_status: 'ASSIGNED' }],
    admins: [{ ...actor }], recipients: [{ email_id: 1, subject_id: 'WEB301', email_address: 'daotao@test.local', recipient_name: 'Phòng đào tạo', is_selected: true }], memberships: new Map() }
  state.memberships.set('WEB301', new Set(state.students.map(row => row.student_id)))
  await page.route('**/api/v1/**', async route => {
    // Group 4 uses the same version suffix under an independent proxy prefix.
    if (new URL(route.request().url()).pathname.startsWith('/liveness-api/')) return route.fallback()
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', ''), method = request.method(), multipart = request.headers()['content-type']?.includes('multipart/form-data')
    const raw = request.postData(), body = request.headers()['content-type']?.includes('json') ? request.postDataJSON() : multipart ? Object.fromEntries([...raw.matchAll(/name="([^"\r\n]+)"[^\r\n]*\r\n(?:[^\r\n]+\r\n)*\r\n([\s\S]*?)(?=\r\n--)/g)].map(match => [match[1], match[1] === 'file' ? 'binary' : match[2]])) : undefined
    const operation = matchOperation(method, path)
    if (operation) state.seen.add(`${method} ${operation.path}`)
    const errors = requestErrors(method, path, { query: url.searchParams, body, multipart })
    if (errors.length) state.violations.push(`${method} ${path}: ${errors.join('; ')}`)
    const reply = (data, status = 200) => {
      if (status < 400) { const errors = responseErrors(method, path, status, data); if (errors.length) state.violations.push(`response ${method} ${path}: ${errors.join('; ')}`) }
      return route.fulfill({ status, json: data })
    }
    if (errors.length) return reply({ error: { code: 'CONTRACT_MISMATCH', message: errors.join('; ') } }, 422)
    if (method !== 'GET') state.writes.push({ path, method, body: multipart ? raw : body, fields: multipart ? body : undefined })
    const pageData = items => {
      const q = url.searchParams.get('q')?.toLowerCase(), offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 25)
      let filtered = q ? items.filter(row => Object.values(row).join(' ').toLowerCase().includes(q)) : items
      const sort = url.searchParams.get('sort')
      if (sort) filtered = [...filtered].sort((a, b) => String(a[sort.replace(/^-/, '')] || '').localeCompare(String(b[sort.replace(/^-/, '')] || '')) * (sort.startsWith('-') ? -1 : 1))
      return { items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset }
    }
    if ((state.expireNext || state.expired) && method === 'GET' && !path.startsWith('/auth')) { state.expireNext = false; state.expired = true; return reply({ error: { code: 'INVALID_TOKEN', message: 'Token hết hạn' } }, 401) }
    if (path === '/health') return reply({ status: 'healthy' })
    if (path === '/auth/login') return reply({ access_token: 'access-test', refresh_token: 'refresh-test', admin: state.actor })
    if (path === '/auth/refresh') { state.expired = false; return reply({ access_token: 'access-renewed', token_type: 'Bearer', expires_in: 3600 }) }
    if (path === '/auth/me') return reply({ admin: state.actor })
    if (path === '/auth/logout') return reply({ message: 'Đăng xuất thành công' })
    if (path === '/auth/forgot-password') return reply({ message: 'Nếu email tồn tại, mã đã gửi.', expires_in: 120 })
    if (path === '/auth/reset-password' || path === '/auth/change-password') return reply({ message: 'Đã đổi mật khẩu' })
    if (path === '/auth/register') { const row = { ...body, admin_id: body.admin_id || 'ADM_NEW', is_first_login: 1 }; delete row.password; state.admins.push(row); return reply(row, 201) }
    if (path === '/subjects' && method === 'GET') return reply(pageData(state.subjects.filter(row => (!url.searchParams.get('status') || row.subject_status === url.searchParams.get('status')) && (!url.searchParams.get('instructor_id') || row.instructor_id === url.searchParams.get('instructor_id')))))
    if (path === '/subjects' && method === 'POST') { state.subjects.push(body); state.memberships.set(body.subject_id, new Set()); return reply(body, 201) }
    const subjectPath = path.match(/^\/subjects\/([^/]+)$/)
    if (subjectPath) {
      const id = decodeURIComponent(subjectPath[1]), row = state.subjects.find(row => row.subject_id === id)
      if (method === 'GET') return reply(row)
      if (method === 'PUT') { Object.assign(row, body); return reply(row) }
      if (method === 'DELETE') { state.subjects = state.subjects.filter(row => row !== id && row.subject_id !== id); return route.fulfill({ status: 204 }) }
    }
    const memberPath = path.match(/^\/subjects\/([^/]+)\/students(?:\/([^/]+))?$/)
    if (memberPath) {
      const id = decodeURIComponent(memberPath[1]), members = state.memberships.get(id) || new Set(); state.memberships.set(id, members)
      if (method === 'GET') return reply(pageData(state.students.filter(row => members.has(row.student_id)).map(row => ({ ...row, enrollment_status: 'Enrolled' }))))
      if (method === 'POST') { members.add(body.student_id); return reply({ ...body, subject_id: id }, 201) }
      if (method === 'DELETE') { members.delete(decodeURIComponent(memberPath[2])); return route.fulfill({ status: 204 }) }
    }
    if (path === '/students' && method === 'GET') return reply(pageData(state.students))
    if (path === '/students' && method === 'POST') {
      const row = { ...body }; delete row.checkin_password; delete row.subject_id
      state.students.unshift(row); if (body.subject_id) state.memberships.get(body.subject_id)?.add(body.student_id)
      return reply(row, 201)
    }
    const photoPath = path.match(/^\/students\/[^/]+\/photo$/)
    if (photoPath) return method === 'GET' ? route.fulfill({ contentType: 'image/png', body: png }) : reply({ message: 'Đã lưu ảnh' })
    if (/^\/students\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').at(-1)), row = state.students.find(row => row.student_id === id)
      if (method === 'GET') return reply({ student: row }) // This legacy detail response has no schema.
      if (method === 'PUT') { Object.assign(row, body); return reply({ student: row }) }
      if (method === 'DELETE') { state.students = state.students.filter(row => row.student_id !== id); return reply({ status: 'deleted' }) }
    }
    if (path === '/attendance' && method === 'POST') {
      if (state.failAttendance) { state.failAttendance = false; return reply({ error: { message: 'Server đang bận. Vui lòng thử lại.', code: 'TEMPORARY' } }, 503) }
      const row = { ...body, checkin_id: state.checkins.length + 10 }; state.checkins.push(row); return reply(row, 201)
    }
    if (path === '/attendance' || path === '/checkins') {
      const rows = state.checkins.filter(row => ['subject_id', 'student_id'].every(key => !url.searchParams.get(key) || row[key] === url.searchParams.get(key)) && (!url.searchParams.get('date') || row.checkin_date === url.searchParams.get('date')) && (!url.searchParams.get('date_from') || row.checkin_date >= url.searchParams.get('date_from')) && (!url.searchParams.get('date_to') || row.checkin_date <= url.searchParams.get('date_to')))
      return reply(pageData(rows.map(row => ({ ...row, student_name: state.students.find(s => s.student_id === row.student_id)?.full_name }))))
    }
    if (/^\/checkins\/[^/]+$/.test(path)) { state.checkins = state.checkins.filter(row => String(row.checkin_id) !== path.split('/').at(-1)); return route.fulfill({ status: 204 }) }
    if (path.endsWith('/attendance-summary')) return reply({ subject_id: path.split('/')[2], total_sessions: 1, items: [{ student_id: 'SV001', full_name: 'Sinh viên kiểm thử 01', present_count: 1, absent_count: 0, attendance_rate: 1 }] })
    if (path === '/admins') return reply(pageData(state.admins.filter(row => (state.actor.role === 'SUPER_ADMIN' || row.admin_id === state.actor.admin_id) && (!url.searchParams.get('role') || row.role === url.searchParams.get('role')))))
    if (path.startsWith('/admins/')) return reply(state.admins.find(row => row.admin_id === path.split('/').at(-1)) || state.actor)
    const recipientPath = path.match(/^\/subjects\/([^/]+)\/email-recipients(?:\/([^/]+))?$/)
    if (recipientPath) {
      const subject = decodeURIComponent(recipientPath[1]), id = Number(recipientPath[2])
      if (method === 'GET') return reply({ items: state.recipients.filter(row => row.subject_id === subject) })
      if (method === 'POST') {
        if (state.failRecipientEmail === body.email_address) { state.failRecipientEmail = ''; return reply({ error: { code: 'TEMPORARY', message: 'Dịch vụ email tạm bận.' } }, 503) }
        if (state.recipients.some(row => row.subject_id === subject && row.email_address === body.email_address)) return reply({ error: { code: 'DUPLICATE', message: 'Email đã có trong môn.' } }, 409)
        const row = { ...body, subject_id: subject, email_id: 10 + state.recipients.length }; state.recipients.push(row); return reply(row, 201)
      }
      if (method === 'PUT') {
        if (state.failRecipientEmail === body.email_address) { state.failRecipientEmail = ''; return reply({ error: { code: 'TEMPORARY', message: 'Dịch vụ email tạm bận.' } }, 503) }
        const row = state.recipients.find(row => row.email_id === id); Object.assign(row, body); return reply(row)
      }
      if (method === 'DELETE') { state.recipients = state.recipients.filter(row => row.email_id !== id); return route.fulfill({ status: 204 }) }
    }
    if (path.endsWith('/send-report')) return reply({ job_id: 'EMAIL1' }, 202)
    if (path === '/import/csv') return reply({ job_id: 'CSV1', status: 'queued' }, 202)
    if (path.startsWith('/jobs/')) return reply({ job_id: path.split('/').at(-1), status: state.finishJobs ? 'finished' : 'queued', result: state.finishJobs ? { imported: 2, updated: 0, skipped: 0 } : null })
    return reply({ error: { code: 'NOT_FOUND', message: 'Chức năng chưa triển khai trên server.' } }, 404)
  })
  return state
}
export async function login(page, identifier = 'hoang@test.local') {
  await page.goto('/#/app/login'); await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible()
  await page.getByLabel(/^Email/).fill(identifier); await page.getByLabel(/^Mật khẩu/).fill('test-password')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Môn học phụ trách' })).toBeVisible()
}
