import test from 'node:test'
import assert from 'node:assert/strict'
import { requestErrors, responseErrors } from '../scripts/openapi-contract.mjs'
import { audit } from '../scripts/audit-api.mjs'
import { attendanceBody, changePasswordBody, entityBody, loginBody, reportBody, resetBody, sortValue } from './server/contract.js'

test('mọi operation Web có vị trí triển khai; không có mapping endpoint tự tạo', () => {
  const result = audit(); assert.deepEqual(result.missing, []); assert.deepEqual(result.extra, []); assert.equal(result.excluded.length, 3)
})
test('payload mặc định đúng schema, không lẫn alias của backend cũ', () => {
  const cases = [
    ['/auth/login', loginBody('GV001', 'secret')], ['/auth/login', loginBody('a@school.test', 'secret')],
    ['/auth/reset-password', resetBody('a@school.test', 'token', 'new-password', 'new-password')],
    ['/auth/change-password', changePasswordBody('old-pass', 'new-password', 'new-password')],
    ['/auth/register', entityBody('admins', { full_name: 'Nguyễn An', email: 'a@school.test', password: 'new-password', role: 'SUPER_ADMIN', admin_code: '' }, { role: 'SUPER_ADMIN', repeat: 'new-password' })],
    ['/subjects', entityBody('courses', { subject_id: 'IT01', subject_name: 'Cơ sở dữ liệu', subject_status: 'ASSIGNED', instructor_id: 'ADM1', uuid: 'must-not-send' }, { role: 'SUPER_ADMIN' })],
    ['/students', entityBody('students', { student_id: 'SV01', full_name: 'Nguyễn An', role: 'SUPER_ADMIN', face_embedding: [1] }, { subjectId: 'IT01' })],
    ['/attendance', attendanceBody({ student_id: 'SV01', subject_id: 'IT01', checkin_date: '2026-11-15', checkin_time: '07:30:00', uuid: '00000000-0000-4000-8000-000000000001', device_id: 'old-field', liveness: true })],
    ['/subjects/IT01/send-report', reportBody('', '')],
  ]
  for (const [path, body] of cases) assert.deepEqual(requestErrors('POST', path, { body }), [], path)
  assert.deepEqual(requestErrors('PUT', '/students/SV01', { body: entityBody('students', { student_id: 'SV01', full_name: 'An', checkin_password: 'must-not-send' }, { editing: true }) }), [])
})
test('validator bắt endpoint lạ, trường thừa, thiếu required, sai enum/type và response thiếu', () => {
  assert.ok(requestErrors('POST', '/face/match', { body: {} }).length)
  assert.ok(requestErrors('POST', '/auth/change-password', { body: { current_password: 'a', new_password: '123456', old_password: 'a' } }).length)
  assert.ok(requestErrors('POST', '/auth/register', { body: { email: 'bad', password: '123', full_name: 'A', role: 'STUDENT' } }).length)
  assert.ok(requestErrors('GET', '/checkins', { query: new URLSearchParams({ date: '2026-11-15' }) }).length)
  assert.ok(responseErrors('GET', '/students', 200, { items: [] }).length)
})
test('legacy chỉ bật có chủ đích; mặc định giữ sort theo YAML và tùy chọn body rỗng', () => {
  assert.deepEqual(changePasswordBody('old', 'new-password', 'new-password', 'legacy-source'), { old_password: 'old', new_password: 'new-password', confirm_password: 'new-password' })
  assert.deepEqual(resetBody('a@b.test', '123', 'new-password', 'new-password', 'legacy-source'), { email: 'a@b.test', token: '123', new_password: 'new-password', confirm_password: 'new-password' })
  assert.equal(sortValue('-full_name'), '-full_name'); assert.equal(sortValue('-full_name', 'legacy-source'), 'full_name:desc')
  assert.deepEqual(reportBody('', '2026-11-15'), { date_to: '2026-11-15' })
})
test('ghi nhận mâu thuẫn thật trong YAML thay vì giả định hai định nghĩa giống nhau', () => {
  const body = { student_id: 'SV01', full_name: 'Nguyễn An', checkin_password: '123456' }
  assert.deepEqual(requestErrors('POST', '/students', { body, variant: 0 }), [])
  assert.ok(requestErrors('POST', '/students', { body, variant: 1 }).some(error => error.includes('checkin_password')))
  const checkin = { student_id: 'SV01', subject_id: 'IT01', uuid: '00000000-0000-4000-8000-000000000001' }
  assert.deepEqual(requestErrors('POST', '/attendance', { body: checkin, variant: 0 }), [])
  assert.ok(requestErrors('POST', '/attendance', { body: checkin, variant: 1 }).some(error => error.includes('required')))
})
