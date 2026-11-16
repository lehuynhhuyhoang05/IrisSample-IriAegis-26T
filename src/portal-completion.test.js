import test from 'node:test'
import assert from 'node:assert/strict'
import { seedData, command, today } from './portal/domain.js'
import { reportRows, reportCSV } from './portal/report-data.js'
import { encryptBackup, decryptBackup } from './portal/backup-crypto.js'

test('xóa điểm danh thử chỉ tác động môn hôm nay và kiểm tra quyền', () => {
  const db = seedData()
  const next = command(db, 'ADM_LAN', { type: 'clearTestAttendance', courseId: 'WEB301', date: today() })
  assert.equal(next.attendance.length, 0)
  assert.equal(db.attendance.length, 3)
  assert.equal(next.students.length, db.students.length)
  assert.throws(() => command(db, 'ADM_NAM', { type: 'clearTestAttendance', courseId: 'WEB301', date: today() }))
  assert.throws(() => command(db, 'SADM_DEMO', { type: 'clearTestAttendance', courseId: 'WEB301', date: '2000-01-01' }))
})

test('báo cáo/email giữ đúng bộ lọc trạng thái, từ khóa và loại tổng hợp', () => {
  const db = seedData(), course = db.courses[0]
  const rows = reportRows(db, course, { mode: 'session', date: today(), status: 'LATE' })
  assert.deepEqual(rows.map(s => s.id), ['SV003'])
  const csv = reportCSV(rows, 'session', today())
  assert(csv.includes('Trần Gia Hân')); assert(!csv.includes('Nguyễn An Bình'))
  assert.equal(reportRows(db, course, { mode: 'history', from: '2099-01-01' }).length, 0)
  assert.equal(reportRows(db, course, { mode: 'semester', from: course.startDate, to: course.endDate, query: 'SV003' })[0].LATE, 1)
})

test('backup mã hóa: roundtrip, sai mật khẩu, sửa ciphertext và file cũ', async () => {
  const backup = { format: 'iriaegis-web-demo', data: seedData() }
  const file = await encryptBackup(backup, 'Backup@123')
  assert(!JSON.stringify(file).includes('super@demo.test'))
  assert.deepEqual(await decryptBackup(file, 'Backup@123'), backup)
  await assert.rejects(decryptBackup(file, 'wrong'), /Sai mật khẩu/)
  await assert.rejects(decryptBackup({ ...file, ciphertext: 'AAAA' }, 'Backup@123'), /Sai mật khẩu/)
  assert.deepEqual(await decryptBackup(backup, ''), backup)
})
