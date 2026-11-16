import { classifyAttendance, fold, roster, scheduledOn, semesterReport, statusLabel } from './domain.js'
import { csvText } from './csv.js'

export function reportRows(db, course, { mode = 'history', date, scheduleId, from = '1900-01-01', to = '9999-12-31', query = '', status = 'all' } = {}) {
  if (!course || from > to) return []
  const rows = mode === 'session' ? roster(db, course, date, scheduleId || scheduledOn(course, date)[0]?.id)
    : mode === 'semester' ? semesterReport(db, course, from, to)
      : db.attendance.filter(a => a.courseId === course.id && a.date >= from && a.date <= to).map(a => ({ ...a, name: db.students.find(s => s.id === a.studentId)?.name || a.studentId, status: classifyAttendance(a.time, course.schedules.find(s => s.id === a.scheduleId)?.start) }))
  return rows.filter(s => fold(s.name + (s.studentId || s.id)).includes(fold(query)) && (status === 'all' || (mode === 'semester' ? s[status] > 0 : s.status === status)))
}

export function reportCSV(rows, mode, date) {
  return csvText(mode === 'semester' ? ['Mã SV', 'Họ tên', 'Đúng giờ', 'Muộn', 'Vắng', 'Tỷ lệ %'] : ['Mã SV', 'Họ tên', 'Ngày', 'Giờ', 'Trạng thái', 'Nguồn'],
    rows.map(s => mode === 'semester' ? [s.id, s.name, s.ON_TIME, s.LATE, s.ABSENT, s.rate ?? ''] : [s.studentId || s.id, s.name, s.date || date, s.record?.time || s.time || '', statusLabel[s.status], 'DEMO']))
}
