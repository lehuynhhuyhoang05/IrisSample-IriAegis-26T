import { useState } from 'react'
import { Button, DataTable, EmptyState, Field, PageHeader } from '../ui'
import { csvText, download } from '../portal/csv.js'
import { today } from '../portal/domain.js'
import { useServer } from './Session.jsx'
import { useResource } from './hooks.js'
import { queryString } from './client.js'
import { sortValue } from './contract.js'
import { Pager, RequestError, ResourceState, ServerConfirm } from './common.jsx'
import { SubjectPicker } from './SubjectPicker.jsx'

export function ServerReports({ params }) {
  const { api } = useServer()
  const [course, setCourse] = useState(params.get('course') || ''), [date, setDate] = useState(params.get('date') || today()), [offset, setOffset] = useState(0), [tab, setTab] = useState(params.get('tab') || 'day')
  const [from, setFrom] = useState(params.get('date_from') || ''), [to, setTo] = useState(params.get('date_to') || today())
  const [student, setStudent] = useState(''), [studentFilter, setStudentFilter] = useState(''), [sort, setSort] = useState('-checkin_date'), [removing, setRemoving] = useState(null)
  const invalid = tab !== 'day' && from && to && from > to
  const canLoad = !invalid && (tab === 'history' || !!course) && (tab !== 'day' || !!date)
  const path = !canLoad ? null : tab === 'day'
    ? '/attendance' + queryString({ subject_id: course, date, limit: 25, offset })
    : tab === 'history'
      ? '/checkins' + queryString({ subject_id: course, student_id: studentFilter, date_from: from, date_to: to, sort: sortValue(sort), limit: 25, offset })
      : `/subjects/${encodeURIComponent(course)}/attendance-summary` + queryString({ date_from: from, date_to: to })
  const resource = useResource(path), summary = tab === 'summary'
  return <><PageHeader title="Lịch sử & báo cáo" />
    <div className="portal-tabs" role="tablist" aria-label="Loại báo cáo">{[['day', 'Theo ngày'], ['history', 'Lịch sử'], ['summary', 'Tổng hợp học kỳ']].map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setOffset(0) }}>{label}</button>)}</div>
    <SubjectPicker value={course} emptyLabel={tab === 'history' ? 'Tất cả môn được phép' : 'Chọn môn học'} onChange={value => { setCourse(value); setOffset(0) }} />
    {tab === 'day' ? <Field label="Ngày điểm danh" type="date" value={date} onChange={e => { setDate(e.target.value); setOffset(0) }} /> : <div className="portal-filter-grid server-date-range"><Field label="Từ ngày" type="date" value={from} onChange={e => { setFrom(e.target.value); setOffset(0) }} /><Field label="Đến ngày" type="date" value={to} min={from} onChange={e => { setTo(e.target.value); setOffset(0) }} /></div>}
    {tab === 'history' && <details className="server-filters"><summary>Lọc sinh viên và sắp xếp</summary><form className="portal-form" onSubmit={e => { e.preventDefault(); setStudentFilter(student.trim()); setOffset(0) }}><Field label="Mã sinh viên cần lọc" value={student} onChange={e => setStudent(e.target.value)} /><Field label="Sắp xếp lịch sử" as="select" value={sort} onChange={e => { setSort(e.target.value); setOffset(0) }} options={['checkin_date', 'checkin_time', 'updated_at'].flatMap((key, index) => [{ value: key, label: ['Ngày', 'Giờ', 'Ngày cập nhật'][index] + ' tăng dần' }, { value: `-${key}`, label: ['Ngày', 'Giờ', 'Ngày cập nhật'][index] + ' giảm dần' }])} /><Button type="submit" variant="secondary">Áp dụng mã sinh viên</Button></form></details>}
    {invalid && <RequestError error="Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." />}
    {!canLoad && !invalid ? <EmptyState title={tab === 'day' && !date ? 'Chọn ngày điểm danh' : 'Chọn môn để xem báo cáo'} /> : !invalid && <ResourceState resource={resource}>{data => {
      const rows = data.items || []
      return <>
        <div className="ui-actions server-context-actions"><Button variant="secondary" disabled={!rows.length} onClick={() => download(csvText(summary ? ['Mã SV', 'Họ tên', 'Có mặt', 'Vắng', 'Tỷ lệ'] : ['Mã SV', 'Môn', 'Ngày', 'Giờ'], rows.map(row => summary ? [row.student_id, row.full_name, row.present_count, row.absent_count, row.attendance_rate] : [row.student_id, row.subject_id, row.checkin_date, row.checkin_time])), `diem-danh-${course || 'tat-ca'}-${tab}-trang-${offset / 25 + 1}.csv`)}>Xuất CSV trang đang xem</Button>{course && <a href={`#/app/email?course=${encodeURIComponent(course)}&date_from=${tab === 'day' ? date : from}&date_to=${tab === 'day' ? date : to}`}>Chuẩn bị email →</a>}</div>
        {summary && <p>{data.total_sessions ?? 0} ngày học có bản ghi trong khoảng đã chọn.</p>}
        <DataTable caption="Báo cáo server" rowKey={summary ? 'student_id' : 'checkin_id'} rows={rows} columns={summary ? [
          { key: 'full_name', label: 'Sinh viên', render: row => <span>{row.full_name}<small className="portal-block-muted">{row.student_id}</small></span> },
          { key: 'present_count', label: 'Có mặt' }, { key: 'absent_count', label: 'Vắng' },
          { key: 'attendance_rate', label: 'Tỷ lệ', render: row => typeof row.attendance_rate === 'number' ? `${Math.round(row.attendance_rate * 100)}%` : '—' },
        ] : [
          { key: 'student_id', label: 'Sinh viên', render: row => <span>{row.student_name || row.student_id}{row.student_name && <small className="portal-block-muted">{row.student_id}</small>}</span> },
          { key: 'subject_id', label: 'Môn' }, { key: 'checkin_date', label: 'Ngày' }, { key: 'checkin_time', label: 'Giờ ghi nhận' },
          { key: 'actions', label: 'Thao tác', render: row => <Button variant="quiet" disabled={row.checkin_id == null} onClick={() => setRemoving(row)}>Xóa lượt</Button> },
        ]} empty={<EmptyState title="Chưa có bản ghi trong khoảng đã chọn" />} />
        {!summary && <Pager total={data.total} offset={offset} onChange={setOffset} />}
      </>
    }}</ResourceState>}
    {removing && <ServerConfirm title={`Xóa lượt điểm danh của ${removing.student_id}?`} description={`${removing.checkin_date} · ${removing.checkin_time}. Xóa mềm lượt đã chọn, không xóa sinh viên.`} onClose={() => setRemoving(null)} onConfirm={async signal => { await api.request(`/checkins/${encodeURIComponent(removing.checkin_id)}`, { method: 'DELETE', signal }); resource.reload() }} />}
  </>
}
