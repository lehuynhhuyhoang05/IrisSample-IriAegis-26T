import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyAttendance, command, coursesFor, roster, seedData, semesterReport, today, validateBackup } from './portal/domain.js'
import { csvText, parseCSV } from './portal/csv.js'

test('dữ liệu mẫu liên kết đúng và hỗ trợ kiểm thử các vai trò, lớp học, điểm danh và báo cáo', () => {
  const db = seedData(), date = today()
  assert.deepEqual(validateBackup({ format: 'iriaegis-web-demo', data: db }), db)
  assert.deepEqual(db.admins.map(a => a.email), ['super@demo.test', 'lan@demo.test', 'nam@demo.test'])
  assert.deepEqual(coursesFor(db, db.admins[0]).map(c => c.id), ['WEB301', 'CSDL201', 'JAVA202'])
  assert.deepEqual(coursesFor(db, db.admins[1]).map(c => c.id), ['WEB301'])
  assert.deepEqual(coursesFor(db, db.admins[2]).map(c => c.id), ['CSDL201'])
  assert.equal(db.students.length, 8)
  assert(db.students.every(s => s.password === '123456'))
  assert.equal(db.enrollments.filter(e => e.courseId === 'WEB301').length, 8)
  assert.equal(db.enrollments.filter(e => e.courseId === 'CSDL201').length, 4)
  assert.equal(db.enrollments.filter(e => e.courseId === 'JAVA202').length, 0)
  const rows = roster(db, db.courses[0], date, 'WEB_S1')
  assert.equal(rows.length, 8)
  assert.equal(rows.filter(s => s.record).length, 3)
  assert.equal(rows.find(s => s.id === 'SV003').status, 'LATE')
  assert.deepEqual(db.recipients.map(r => r.courseId), ['WEB301', 'CSDL201'])
  assert(db.students.every(s => /^\d{10}$/.test(s.phone)))
  assert.equal(new Set(db.students.map(s => s.className)).size, 2)
})

test('giảng viên không thể sửa môn ngoài phạm vi, quản lý admin hoặc xóa sinh viên toàn hệ thống', () => {
  const db = seedData()
  assert.deepEqual(coursesFor(db, db.admins[1]).map(c => c.id), ['WEB301'])
  assert.throws(() => command(db, 'ADM_LAN', { type: 'save', entity: 'courses', originalId: 'CSDL201', row: db.courses[1] }), /không được sửa/)
  assert.throws(() => command(db, 'ADM_LAN', { type: 'delete', entity: 'students', id: 'SV001' }), /Super Admin/)
  assert.throws(() => command(db, 'ADM_LAN', { type: 'save', entity: 'admins', row: { ...db.admins[2], id: 'ADM_NEW' } }), /Super Admin/)
})
test('môn học kiểm tra kỳ học, phân công và các ca không trùng trước khi lưu', () => {
  const db = seedData()
  const row = {
    id: 'WEB499', name: 'Kiểm thử lịch', instructorId: 'ADM_LAN', room: 'C.401', semester: 'Học kỳ 2',
    startDate: '2026-01-01', endDate: '2026-12-31',
    schedules: [
      { id: 'WEB499_A', day: 2, start: '09:00', end: '10:00' },
      { id: 'WEB499_B', day: 2, start: '10:00', end: '11:00' },
    ],
  }
  const saved = command(db, 'SADM_DEMO', { type: 'save', entity: 'courses', row })
  assert.equal(saved.courses.at(-1).room, 'C.401')
  assert.equal(saved.courses.at(-1).instructorId, 'ADM_LAN')
  assert.equal(saved.courses.at(-1).schedules.length, 2)
  assert.throws(() => command(db, 'SADM_DEMO', { type: 'save', entity: 'courses', row: { ...row, endDate: '2025-12-31' } }), /Ngày học kỳ/)
  assert.throws(() => command(db, 'SADM_DEMO', { type: 'save', entity: 'courses', row: { ...row, instructorId: 'UNKNOWN' } }), /Giảng viên không tồn tại/)
  assert.throws(() => command(db, 'SADM_DEMO', { type: 'save', entity: 'courses', row: { ...row, schedules: [row.schedules[0], { ...row.schedules[1], start: '09:30' }] } }), /không được trùng giờ/)
  assert.equal(db.courses.some(course => course.id === 'WEB499'), false)
})
test('bỏ khỏi môn giữ hồ sơ, môn khác và lịch sử; xóa môn chỉ xóa dữ liệu liên quan', () => {
  const db = seedData()
  const removed = command(db, 'SADM_DEMO', { type: 'unenroll', studentId: 'SV001', courseId: 'WEB301' })
  assert.equal(removed.students.length, db.students.length)
  assert.equal(removed.attendance.length, db.attendance.length)
  assert(removed.enrollments.some(e => e.studentId === 'SV001' && e.courseId === 'CSDL201'))
  const deleted = command(removed, 'SADM_DEMO', { type: 'delete', entity: 'courses', id: 'WEB301' })
  assert(!deleted.attendance.some(a => a.courseId === 'WEB301'))
  assert(!deleted.recipients.some(a => a.courseId === 'WEB301'))
  assert(deleted.courses.some(c => c.id === 'CSDL201'))
  assert.equal(db.courses.length, 3)
})
test('điểm danh chỉ một lần/buổi, có đăng ký, đúng lịch, không tương lai', () => {
  const db = seedData()
  const action = { type: 'attendance', studentId: 'SV004', courseId: 'WEB301', scheduleId: 'WEB_S1', date: today(), time: '07:45', simulated: true }
  const next = command(db, 'ADM_LAN', action)
  assert.equal(next.attendance.at(-1).status, 'ON_TIME')
  assert.throws(() => command(next, 'ADM_LAN', action), /đã điểm danh/)
  assert.throws(() => command(db, 'ADM_LAN', { ...action, studentId: 'SV999' }), /chưa đăng ký/)
  assert.throws(() => command(db, 'ADM_LAN', { ...action, date: '2099-01-01' }), /không hợp lệ/)
  assert.throws(() => command(db, 'ADM_LAN', { ...action, scheduleId: 'NO' }), /không hợp lệ/)
})
test('ngăn xóa Super Admin và lịch có điểm danh; validation không làm thay đổi db', () => {
  const db = seedData()
  assert.throws(() => command(db, 'SADM_DEMO', { type: 'delete', entity: 'admins', id: 'SADM_DEMO' }), /Không thể xóa/)
  const course = structuredClone(db.courses[0]); course.schedules[0].start = '08:00'
  assert.throws(() => command(db, 'SADM_DEMO', { type: 'save', entity: 'courses', originalId: course.id, row: course }), /Không đổi lịch/)
  assert.equal(db.courses[0].schedules[0].start, '07:30')
})
test('vắng chỉ tính sau khi ca học kết thúc', () => {
  const db = seedData(), course = db.courses[0], date = today()
  const before = roster(db, course, date, 'WEB_S1', new Date(`${date}T07:00:00`))
  const after = roster(db, course, date, 'WEB_S1', new Date(`${date}T12:00:00`))
  assert.equal(before.find(s => s.id === 'SV004').status, 'PENDING')
  assert.equal(after.find(s => s.id === 'SV004').status, 'ABSENT')
  assert.equal(after.find(s => s.id === 'SV003').status, 'LATE')
  assert.equal(semesterReport(db, course, '2099-01-01', '2099-12-31').every(s => s.total === 0), true)
})
test('backup roundtrip và từ chối dữ liệu sai, trùng, mất quan hệ', () => {
  const backup = { format: 'iriaegis-web-demo', data: seedData() }
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(backup))), backup.data)
  const bad = structuredClone(backup); bad.data.enrollments[0].studentId = 'NO'
  assert.throws(() => validateBackup(bad), /không hợp lệ/)
  const duplicate = structuredClone(backup); duplicate.data.attendance.push(duplicate.data.attendance[0])
  assert.throws(() => validateBackup(duplicate), /trùng/)
  const object = structuredClone(backup); object.data.students[0].className = { attack: true }
  assert.throws(() => validateBackup(object), /className/)
  assert.throws(() => validateBackup({ data: {} }), /Không phải/)
})
test('CSV hỗ trợ dấu phẩy, ngoặc kép, xuống dòng; từ chối hỏng và chống formula injection khi xuất', () => {
  const values = parseCSV('\uFEFFid,name\r\nSV01,"An, Bình"\r\nSV02,"Tên ""mẫu""\nHai dòng"')
  assert.equal(values[0].name, 'An, Bình')
  assert.equal(values[1].name, 'Tên "mẫu"\nHai dòng')
  assert.throws(() => parseCSV('id,name\nSV01,"thiếu'), /ngoặc/)
  assert.throws(() => parseCSV('id,id\n1,2'), /trùng/)
  assert.match(csvText(['name'], [['=SUM(1,2)']]), /'=SUM/)
})


test('biên đúng giờ Android: hết 15 phút vẫn đúng giờ, sau đó là muộn', () => {
  assert.equal(classifyAttendance('07:29:59', '07:30'), 'ON_TIME')
  assert.equal(classifyAttendance('07:45:00', '07:30'), 'ON_TIME')
  assert.equal(classifyAttendance('07:45:01', '07:30'), 'LATE')
})
test('học kỳ đếm ngày đã có điểm danh, không suy diễn tất cả lịch dự kiến', () => {
  const db = seedData(), course = db.courses[0]
  const rows = semesterReport(db, course, course.startDate, course.endDate)
  assert.equal(rows.find(s => s.id === 'SV004').total, 1)
  assert.equal(rows.find(s => s.id === 'SV004').ABSENT, 1)
  assert.equal(rows.find(s => s.id === 'SV003').LATE, 1)
  db.attendance = []
  assert.equal(semesterReport(db, course, course.startDate, course.endDate)[0].total, 0)
})
test('email yêu cầu chọn người nhận đúng môn và chuẩn bị file trước', () => {
  const db = seedData(), action = { type: 'email', courseId: 'WEB301', subject: 'Báo cáo', recipientIds: ['MAIL_1'], attachmentReady: true }
  assert.throws(() => command(db, 'SADM_DEMO', { ...action, attachmentReady: false }))
  assert.throws(() => command(db, 'SADM_DEMO', { ...action, recipientIds: [] }))
  assert.throws(() => command(db, 'SADM_DEMO', { ...action, recipientIds: ['NO'] }))
  assert.equal(command(db, 'SADM_DEMO', action).outbox[0].recipientCount, 1)
})
