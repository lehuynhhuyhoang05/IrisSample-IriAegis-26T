import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Download, Search, UserCheck } from '../ui/icons'
import SessionContext from '../ui/SessionContext.jsx'
import { Badge, Button, DataTable, Dialog, EmptyState, Field, Notice, PageHeader, SearchField } from '../ui'
import { usePortal, useTask } from './Store.jsx'
import { classifyAttendance, coursesFor, dateLabel, dayLabel, fold, localDate, roster, scheduledOn, semesterReport, statusLabel, statusTone, today } from './domain.js'
import { ErrorNotice, FaceFlow, go, Person } from './shared.jsx'
import { download } from './csv.js'
import { useStepFocus } from '../server/hooks.js'
import { reportCSV } from './report-data.js'

function useCourseFilter(initial, params) {
  const { db, actor } = usePortal(), courses = coursesFor(db, actor)
  const [courseId, setCourseId] = useState(initial || courses[0]?.id || '')
  const [date, setDate] = useState(() => {
    const value = params?.get('date') || ''
    const parsed = new Date(`${value}T12:00:00`)
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && localDate(parsed) === value ? value : today()
  }), [scheduleId, setScheduleId] = useState(params?.get('schedule') || '')
  const course = courses.find(c => c.id === courseId), schedules = scheduledOn(course, date)
  const selected = schedules.find(s => s.id === scheduleId) || schedules[0]
  return { courses, course, courseId, setCourseId, date, setDate, schedules, selected, setScheduleId }
}
function Filters({ filter, includeSession = true }) {
  return <div className="portal-filter-grid"><Field as="select" label="Môn học" value={filter.courseId} onChange={e => filter.setCourseId(e.target.value)} options={[{ value: '', label: 'Chọn môn học' }, ...filter.courses.map(c => ({ value: c.id, label: `${c.id} · ${c.name}` }))]} />{includeSession && <><Field type="date" label="Ngày học" value={filter.date} onChange={e => filter.setDate(e.target.value)} /><Field as="select" label="Ca học" value={filter.selected?.id || ''} onChange={e => filter.setScheduleId(e.target.value)} options={filter.schedules.length ? filter.schedules.map(s => ({ value: s.id, label: `${s.start}–${s.end}` })) : [{ value: '', label: 'Không có ca học ngày này' }]} /></>}</div>
}

export function Home() {
  const { db, actor } = usePortal()
  const courses = coursesFor(db, actor), date = today()
  const sessions = courses.flatMap(c => scheduledOn(c, date).map(s => ({ id: s.id, course: c, schedule: s, roster: roster(db, c, date, s.id) })))
  return <><PageHeader title="Hôm nay" description={new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })} />
    <section className="portal-today"><div className="portal-section-heading"><h2>Lịch dạy hôm nay</h2><span>{sessions.length} ca học</span></div>{sessions.length ? sessions.map(session => { const done = session.roster.filter(r => r.record).length; return <article className="portal-session-row" key={session.id}><div className="portal-session-time"><strong>{session.schedule.start}</strong><span>{session.schedule.end}</span></div><div className="portal-session-body"><a href={`#/app/courses/${session.course.id}`}><h3>{session.course.name}</h3></a><p>{session.course.id} · {session.course.room || 'Chưa có phòng'} · {session.roster.length} sinh viên</p><div className="portal-progress" role="progressbar" aria-label={`Điểm danh ${session.course.name}`} aria-valuemin={0} aria-valuemax={session.roster.length || 1} aria-valuenow={done}><span style={{ width: `${session.roster.length ? done * 100 / session.roster.length : 0}%` }} /></div><small>{done}/{session.roster.length} đã điểm danh</small></div><Button variant="secondary" icon={ArrowRight} onClick={() => go(`attendance?${new URLSearchParams({ course: session.course.id, date, schedule: session.schedule.id })}`)}>Vào lớp</Button></article> }) : <EmptyState title="Hôm nay chưa có lịch học" action={<Button variant="secondary" onClick={() => go('courses')}>Xem môn học</Button>}>Kiểm tra ngày học kỳ hoặc bổ sung ca học trong chi tiết môn.</EmptyState>}</section>
  </>
}

export function Attendance({ initialCourse, params }) {
  const { db, actor, write, simulate } = usePortal(), filter = useCourseFilter(initialCourse, params), task = useTask()
  const [query, setQuery] = useState(''), [mode, setMode] = useState('list'), [code, setCode] = useState(''), [studentId, setStudentId] = useState(''), [password, setPassword] = useState(''), [stage, setStage] = useState('select'), [saved, setSaved] = useState(null)
  const [listFilter, setListFilter] = useState('all')
  const rows = roster(db, filter.course, filter.date, filter.selected?.id)
  const selectedStudent = rows.find(s => s.id === studentId)
  const enrolledCount = db.enrollments.filter(row => row.courseId === filter.courseId).length
  // Offer navigation to an existing session; never move saved schedules or reset data.
  const previousSession = !filter.selected && filter.course ? Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${filter.date}T12:00:00`)
    date.setDate(date.getDate() - index - 1)
    const value = localDate(date), schedule = scheduledOn(filter.course, value)[0]
    return schedule ? { date: value, scheduleId: schedule.id } : null
  }).find(Boolean) : null
  const headingRef = useStepFocus(stage), listPosition = useRef(0), trigger = useRef(null)
  useEffect(() => { task.cancel(); setStage('select'); setStudentId(''); setPassword(''); setSaved(null); task.setError('') }, [filter.courseId, filter.date, filter.selected?.id]) // Cancel old requests before switching classes.
  const pending = rows.filter(s => !s.record)
  async function credentials(event) {
    event.preventDefault()
    task.run(async signal => {
      const student = rows.find(s => s.id === (mode === 'code' ? code.trim().toUpperCase() : studentId))
      if (!student) throw new Error('Sinh viên không thuộc danh sách buổi học này.')
      if (student.record) throw new Error('Sinh viên đã được điểm danh buổi này.')
      if (student.password !== password) throw new Error('Mật khẩu điểm danh demo chưa đúng.')
      if (filter.date > today()) throw new Error('Không thể điểm danh cho ngày tương lai.')
      await simulate(signal); setStudentId(student.id); setStage('face')
    })
  }
  async function save() {
    const time = new Date().toTimeString().slice(0, 5)
    write({ type: 'attendance', courseId: filter.courseId, scheduleId: filter.selected.id, studentId, date: filter.date, time, simulated: true })
    setSaved({ name: selectedStudent.name, time, status: classifyAttendance(time, filter.selected.start) }); setStage('done'); setPassword('')
  }
  function select(student) { listPosition.current = window.scrollY; trigger.current = document.activeElement; task.cancel(); setMode('list'); setCode(''); setStudentId(student.id); setPassword(''); setStage('credentials'); task.setError('') }
  function backToList() {
    task.cancel(); task.setError(''); setStage('select'); setPassword(''); setMode('list')
    requestAnimationFrame(() => { window.scrollTo(0, listPosition.current); if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }) })
  }
  if (stage !== 'select') return <section className={'server-workflow' + (stage === 'face' ? ' camera-step' : '')}><Button variant="quiet" onClick={backToList}>← Danh sách lớp</Button>
    <h1 ref={headingRef} tabIndex={-1}>{stage === 'face' ? 'Xác thực khuôn mặt' : stage === 'done' ? 'Kết quả điểm danh' : 'Thông tin điểm danh'}</h1>
    <div className="server-person-context"><strong>{selectedStudent?.name || 'Nhập mã sinh viên'}</strong><span>{filter.courseId} · {dateLabel(filter.date)} · {filter.selected?.start}–{filter.selected?.end}</span></div>
    {stage === 'face' && selectedStudent ? <FaceFlow key={`${filter.courseId}-${studentId}`} onComplete={save} onCancel={() => setStage('credentials')} /> : stage === 'done' && saved ? <section className="portal-result"><UserCheck size={32} /><h2>Đã ghi nhận điểm danh demo</h2><p>{saved.name} · {saved.time}</p><Badge tone={statusTone[saved.status]}>{statusLabel[saved.status]}</Badge><p>Kết quả giả lập, lưu tại trình duyệt.</p><div className="ui-actions"><Button onClick={() => { const next = pending[0]; if (next) select(next); else backToList() }}>{pending.length ? 'Sinh viên tiếp theo' : 'Về danh sách lớp'}</Button><Button variant="secondary" onClick={() => go(`reports?${new URLSearchParams({ course: filter.courseId, date: filter.date, schedule: filter.selected.id })}`)}>Xem báo cáo</Button></div></section> : <form onSubmit={credentials} className="portal-form">
      {mode === 'code' && <Field label="Mã sinh viên" value={code} onChange={e => setCode(e.target.value)} required />}
      <Field label="Mật khẩu điểm danh" type="password" value={password} onChange={e => setPassword(e.target.value)} required hint="Sinh viên mẫu dùng 123456." />
      <ErrorNotice error={task.error} /><div className="ui-actions"><Button type="submit" busy={task.busy}>Tiếp tục đến camera</Button><Button variant="secondary" onClick={backToList}>Hủy</Button></div>
    </form>}
  </section>
  return <div className="attendance-workspace"><PageHeader title="Điểm danh" actions={<Button variant="quiet" onClick={() => { listPosition.current = window.scrollY; trigger.current = document.activeElement; task.cancel(); setMode('code'); setCode(''); setStudentId(''); setPassword(''); setStage('credentials'); task.setError('') }} disabled={!filter.selected}>Nhập mã sinh viên</Button>} />
    <SessionContext title={filter.course?.name} subtitle={[filter.courseId, dateLabel(filter.date), filter.selected ? `${filter.selected.start}–${filter.selected.end}` : 'Không có ca học'].filter(Boolean).join(' · ')}><Filters filter={filter} /></SessionContext>
    {!filter.selected ? <EmptyState title={filter.course ? 'Không có ca học ngày này' : 'Chọn môn học để điểm danh'} action={filter.course && <div className="ui-actions">{previousSession && <Button onClick={() => { filter.setDate(previousSession.date); filter.setScheduleId(previousSession.scheduleId) }}>Xem buổi {dateLabel(previousSession.date)}</Button>}<Button variant="secondary" onClick={() => go(`courses/${filter.courseId}`)}>Xem lịch môn học</Button></div>}>{filter.course ? `Môn có ${enrolledCount} sinh viên đã ghi danh. Chọn Đổi để xem ngày và ca khác.` : 'Chọn Đổi để mở danh sách môn học.'}</EmptyState> : <>
      <div className="attendance-progress"><span><strong>{rows.length - pending.length}/{rows.length}</strong> đã ghi nhận</span><span>{pending.length} còn lại</span><progress max={rows.length || 1} value={rows.length - pending.length} aria-label="Tiến độ điểm danh" /></div>
      <div className="attendance-list-controls"><SearchField placeholder="Tìm tên hoặc mã sinh viên" value={query} onChange={e => setQuery(e.target.value)} /><div className="attendance-status-filters" aria-label="Lọc danh sách điểm danh">{[['all', `Tất cả (${rows.length})`], ['pending', `Chưa ghi nhận (${pending.length})`], ['done', `Đã ghi nhận (${rows.length - pending.length})`]].map(([value, label]) => <button type="button" key={value} aria-pressed={listFilter === value} onClick={() => setListFilter(value)}>{label}</button>)}</div></div>
      <DataTable variant="attendance-list attendance-roster" caption="Danh sách điểm danh" rows={rows.filter(s => fold(s.name + s.id).includes(fold(query)) && (listFilter === 'all' || (listFilter === 'done' ? !!s.record : !s.record)))} columns={[{ key: 'name', label: 'Sinh viên', render: s => <Person row={s} /> }, { key: 'status', label: 'Trạng thái', render: s => <Badge tone={statusTone[s.status]}>{statusLabel[s.status]}</Badge> }, { key: 'actions', label: 'Thao tác', render: s => s.record ? <span className="attendance-receipt"><Check size={16} /><span><span>Đã ghi nhận</span><time>{s.record.time}</time></span></span> : <Button variant="secondary" disabled={filter.date > today()} onClick={() => select(s)}>Điểm danh</Button> }]} />
    </>}
  </div>
}

export function Reports({ initialCourse, params }) {
  const { db } = usePortal(), filter = useCourseFilter(initialCourse, params)
  const [tab, setTab] = useState(['session', 'history', 'semester'].includes(params?.get('mode')) ? params.get('mode') : 'session')
  const [query, setQuery] = useState(params?.get('q') || ''), [status, setStatus] = useState(Object.hasOwn(statusLabel, params?.get('status')) ? params.get('status') : 'all')
  const [from, setFrom] = useState(params?.get('from') ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`), [to, setTo] = useState(params?.get('to') ?? today())
  const [stats, setStats] = useState(null)
  const daily = roster(db, filter.course, filter.date, filter.selected?.id)
  const summary = semesterReport(db, filter.course, from, to)
  const history = db.attendance.filter(a => a.courseId === filter.courseId && a.date >= from && a.date <= to).map(a => ({ ...a, status: classifyAttendance(a.time, filter.course?.schedules.find(s => s.id === a.scheduleId)?.start), name: db.students.find(s => s.id === a.studentId)?.name || a.studentId }))
  const source = tab === 'session' ? daily : tab === 'semester' ? summary : history
  const rows = source.filter(s => fold(s.name + (s.studentId || s.id)).includes(fold(query)) && (status === 'all' || (tab === 'semester' ? s[status] > 0 : s.status === status)))
  const columns = tab === 'semester' ? [{ key: 'name', label: 'Sinh viên', render: s => <Person row={s} /> }, { key: 'ON_TIME', label: 'Đúng giờ' }, { key: 'LATE', label: 'Muộn' }, { key: 'ABSENT', label: 'Vắng', render: s => <Badge tone={s.ABSENT >= 2 ? 'danger' : s.ABSENT ? 'warning' : 'neutral'}>{s.ABSENT}</Badge> }, { key: 'rate', label: 'Tỷ lệ có mặt', render: s => s.rate === null ? 'Chưa có buổi' : `${s.rate}%` }] : [{ key: 'name', label: 'Sinh viên', render: s => <span><strong>{s.name}</strong><small className="portal-block-muted">{s.studentId || s.id}</small></span> }, ...(tab === 'history' ? [{ key: 'date', label: 'Ngày', render: s => dateLabel(s.date) }] : []), { key: 'time', label: 'Giờ', render: s => s.record?.time || s.time || '—' }, { key: 'status', label: 'Trạng thái', render: s => <Badge tone={statusTone[s.status]}>{statusLabel[s.status]}</Badge> }]
  function exportRows() {
    download(reportCSV(rows, tab, filter.date), `bao-cao-${filter.courseId || 'trong'}-${tab}.csv`)
  }
  const emailParams = new URLSearchParams({ course: filter.courseId, mode: tab, date: filter.date, schedule: filter.selected?.id || '', from, to, q: query, status })
  return <><PageHeader  title="Lịch sử & báo cáo"  actions={<><Button variant="secondary" icon={Download} disabled={!rows.length} onClick={exportRows}>Xuất CSV đang lọc</Button><Button disabled={!filter.course || (tab !== 'session' && from > to)} onClick={() => go(`email?${emailParams}`)}>Chuẩn bị email</Button></>} />
    <div className="portal-tabs" role="tablist" aria-label="Loại báo cáo">{[['session', 'Theo buổi học'], ['history', 'Lịch sử ghi nhận'], ['semester', 'Tổng hợp học kỳ']].map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setStatus('all') }}>{label}</button>)}</div>
    <Filters filter={filter} includeSession={tab === 'session'} />
    {tab !== 'session' && <div className="portal-filter-grid portal-date-range"><Field type="date" label="Từ ngày" value={from} onChange={e => setFrom(e.target.value)} /><Field type="date" label="Đến ngày" value={to} min={from} onChange={e => setTo(e.target.value)} /></div>}
    {from > to && tab !== 'session' && <Notice tone="danger" title="Khoảng ngày không hợp lệ">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</Notice>}
    <div className="ui-toolbar"><SearchField placeholder="Tìm mã hoặc tên sinh viên…" value={query} onChange={e => setQuery(e.target.value)} /><Field as="select" label="Trạng thái" value={status} onChange={e => setStatus(e.target.value)} options={[{ value: 'all', label: 'Tất cả' }, ...(tab === 'semester' ? [{ value: 'ON_TIME', label: 'Có buổi đúng giờ' }, { value: 'LATE', label: 'Có buổi muộn' }, { value: 'ABSENT', label: 'Có buổi vắng' }] : Object.entries(statusLabel).map(([value, label]) => ({ value, label })))]} /></div>
    <ReportSummary rows={rows} semester={tab === 'semester'} />
    <DataTable variant="report" caption="Báo cáo điểm danh" rows={rows} columns={[...columns, { key: 'actions', label: 'Chi tiết', render: s => <Button variant="quiet" onClick={() => setStats(s.studentId || s.id)} aria-label={`Thống kê ${s.name}`}>Thống kê</Button> }]} empty={<EmptyState title="Chưa có dữ liệu phù hợp">Kiểm tra môn, buổi học, khoảng ngày hoặc bộ lọc.</EmptyState>} />
    <div className="ui-list-footer"><span>{rows.length} kết quả · dữ liệu demo</span></div>
    <details className="portal-help"><summary>Cách tính báo cáo</summary><p>Đúng giờ: đến hết 15 phút đầu. Tổng hợp học kỳ đếm các ngày có bản ghi điểm danh của môn, theo app Android. Vắng từ 2 buổi được cảnh báo. Danh sách buổi học trên Web vẫn hiển thị ca dự kiến; server chưa tích hợp.</p></details>
    {stats && <StudentStats db={db} course={filter.course} id={stats} onClose={() => setStats(null)} />}
  </>
}

function ReportSummary({ rows, semester = false }) {
  const keys = ['ON_TIME', 'LATE', 'ABSENT']
  const totals = keys.map(key => rows.reduce((sum, row) => sum + (semester ? row[key] || 0 : Number(row.status === key)), 0))
  return <dl className="portal-report-summary" aria-label={semester ? 'Lượt điểm danh trong học kỳ' : 'Tổng quan điểm danh'}>{keys.map((key, i) => <div key={key}><dt>{statusLabel[key]}</dt><dd>{totals[i]}</dd></div>)}</dl>
}

function StudentStats({ db, course, id, onClose }) {
  const student = db.students.find(s => s.id === id)
  const report = semesterReport(db, course, '1900-01-01', '9999-12-31').find(s => s.id === id)
  const records = db.attendance.filter(a => a.courseId === course?.id && a.studentId === id).sort((a, b) => b.date.localeCompare(a.date))
  return <Dialog open title={`Thống kê ${student?.name || id}`} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Đóng</Button>}>
    {report && <><ReportSummary rows={[report]} semester /><p>{report.total} ngày học có ghi nhận trong môn.</p>{report.ABSENT >= 2 && <Notice tone="warning" title={`Đã vắng ${report.ABSENT} buổi`} />}</>}
    <DataTable caption="Lịch sử sinh viên" rows={records} columns={[{ key: 'date', label: 'Ngày', render: r => dateLabel(r.date) }, { key: 'time', label: 'Giờ ghi nhận' }]} />
  </Dialog>
}
