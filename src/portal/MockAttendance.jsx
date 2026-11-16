import { useState } from 'react'
import { Badge, Button, DataTable, EmptyState, Field, Notice, PageHeader } from '../ui'
import { usePortal, useTask } from './Store.jsx'
import { command, coursesFor, dayLabel, roster, scheduledOn, statusLabel, statusTone, today } from './domain.js'
import { Confirm, ErrorNotice, Person } from './shared.jsx'

// Android MockCheckinActivity: tooling for test records, never biometric attendance.
export default function MockAttendance() {
  const { db, actor, persist } = usePortal(), task = useTask()
  const courses = coursesFor(db, actor)
  const [courseId, setCourseId] = useState(courses[0]?.id || '')
  const [scheduleId, setScheduleId] = useState(''), [custom, setCustom] = useState(false)
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5))
  const [operation, setOperation] = useState(null), [message, setMessage] = useState('')
  const date = today(), course = courses.find(c => c.id === courseId)
  const schedules = scheduledOn(course, date), schedule = schedules.find(s => s.id === scheduleId) || schedules[0]
  const rows = roster(db, course, date, schedule?.id), pending = rows.filter(s => !s.record)
  async function perform() {
    let next = db, count = 0
    if (operation.kind === 'clear') {
      count = db.attendance.filter(a => a.courseId === courseId && a.date === date).length
      next = command(db, actor.id, { type: 'clearTestAttendance', courseId, date })
    } else {
      for (const student of pending.filter(s => !operation.id || s.id === operation.id)) {
        let value = custom ? time : new Date().toTimeString().slice(0, 5)
        if (operation.kind === 'random') {
          const start = Number(schedule.start.slice(0, 2)) * 60 + Number(schedule.start.slice(3))
          const minutes = Math.min(1439, Math.max(0, start - 15 + Math.floor(Math.random() * 76)))
          value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
        }
        next = command(next, actor.id, { type: 'attendance', courseId, scheduleId: schedule.id, studentId: student.id, date, time: value, simulated: true })
        count++
      }
    }
    persist(next)
    setMessage(operation.kind === 'clear' ? `Đã xóa ${count} lượt hôm nay của môn ${courseId}.` : `Đã tạo ${count} lượt thử; giữ nguyên các lượt đã có.`)
  }
  return <><PageHeader title="Điểm danh thử" /><Notice tone="info">Dữ liệu thử trên trình duyệt; không xác thực danh tính.</Notice>
    <div className="portal-filter-grid portal-mock-filters"><Field as="select" label="Môn học" value={courseId} onChange={e => { setCourseId(e.target.value); setScheduleId(''); setMessage(''); task.setError('') }} options={courses.map(c => ({ value: c.id, label: `${c.id} · ${c.name}` }))} /><Field as="select" label="Ca học hôm nay" value={schedule?.id || ''} onChange={e => setScheduleId(e.target.value)} options={schedules.length ? schedules.map(s => ({ value: s.id, label: `${dayLabel(s.day)} · ${s.start}–${s.end}` })) : [{ value: '', label: 'Không có ca học hôm nay' }]} /></div>
    {message && <p role="status">{message}</p>}<ErrorNotice error={task.error} />
    <div className="portal-form"><label className="portal-check"><input type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)} />Dùng giờ tùy chọn</label>{custom && <Field label="Giờ điểm danh thử" type="time" value={time} onChange={e => setTime(e.target.value)} />}</div>
    <div className="ui-actions"><Button disabled={!pending.length || (custom && !time)} onClick={() => setOperation({ kind: 'all' })}>Điểm danh các sinh viên còn lại</Button><Button variant="secondary" disabled={!pending.length} onClick={() => setOperation({ kind: 'random' })}>Tạo giờ ngẫu nhiên</Button><Button variant="quiet" disabled={!db.attendance.some(a => a.courseId === courseId && a.date === date)} onClick={() => setOperation({ kind: 'clear' })}>Xóa điểm danh hôm nay</Button></div>
    <DataTable caption="Dữ liệu điểm danh thử" rows={rows} variant="attendance-list" columns={[{ key: 'name', label: 'Sinh viên', render: s => <Person row={s} /> }, { key: 'status', label: 'Trạng thái', render: s => <Badge tone={statusTone[s.status]}>{statusLabel[s.status]}</Badge> }, { key: 'time', label: 'Giờ', render: s => s.record?.time || '—' }, { key: 'actions', label: 'Thao tác', render: s => <Button variant="quiet" disabled={!!s.record || (custom && !time)} onClick={() => setOperation({ kind: 'single', id: s.id })}>{s.record ? 'Đã ghi nhận' : 'Tạo lượt thử'}</Button> }]} empty={<EmptyState title="Không có sinh viên trong ca học hôm nay" />} />
    {operation && <Confirm title={operation.kind === 'clear' ? 'Xóa điểm danh hôm nay của môn?' : 'Tạo dữ liệu điểm danh thử?'} description={operation.kind === 'clear' ? 'Xóa tất cả lượt hôm nay của môn đang chọn, gồm các ca khác. Hồ sơ và ngày khác được giữ lại.' : 'Chỉ thêm sinh viên chưa có lượt trong ca đã chọn; dữ liệu được đánh dấu giả lập.'} onClose={() => setOperation(null)} onConfirm={perform} />}
  </>
}
