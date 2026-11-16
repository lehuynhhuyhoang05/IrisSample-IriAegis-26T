import { useState } from 'react'
import { Button, DataTable, Dialog, EmptyState, Field, Notice, PageHeader } from '../ui'
import { useTask } from './use-task.js'
import { useServer } from './Session.jsx'
import { useResource } from './hooks.js'
import { queryString } from './client.js'
import { ResourceState, RequestError, ServerConfirm, Unavailable } from './common.jsx'
import { ConnectionForm } from './Auth.jsx'
import { SubjectPicker } from './SubjectPicker.jsx'
import { JobProgress } from './Jobs.jsx'
import { changePasswordBody, reportBody } from './contract.js'

export function ServerEmail({ params }) {
  const { api } = useServer(), task = useTask()
  const [course, setCourse] = useState(params.get('course') || ''), [from, setFrom] = useState(params.get('date_from') || ''), [to, setTo] = useState(params.get('date_to') || '')
  const [form, setForm] = useState(null), [removing, setRemoving] = useState(null), [preview, setPreview] = useState(false), [job, setJob] = useState('')
  const path = `/subjects/${encodeURIComponent(course)}/email-recipients`, resource = useResource(course ? path : null)
  function changeCourse(value) { task.cancel(); task.setError(''); setCourse(value); setJob(''); setPreview(false) }
  const recipients = resource.data?.items || [], selected = recipients.filter(row => row.is_selected ?? true)
  return <><PageHeader title="Email báo cáo" /><SubjectPicker value={course} onChange={changeCourse} />
    {course && <><div className="portal-filter-grid server-date-range"><Field label="Từ ngày" type="date" value={from} onChange={e => { setFrom(e.target.value); setJob('') }} /><Field label="Đến ngày" type="date" value={to} min={from} onChange={e => { setTo(e.target.value); setJob('') }} /></div>
      <div className="portal-section-heading"><h2>Người nhận</h2><Button variant="secondary" onClick={() => setForm({ email_address: '', recipient_name: '', is_selected: true })}>Thêm người nhận</Button></div>
      <ResourceState resource={resource}>{data => <DataTable rowKey="email_id" caption="Người nhận báo cáo" rows={data.items || []} columns={[{ key: 'email_address', label: 'Email', render: row => <span><strong>{row.email_address}</strong><small className="portal-block-muted">{row.recipient_name}</small></span> }, { key: 'is_selected', label: 'Nhận báo cáo', render: row => (row.is_selected ?? true) ? 'Được chọn' : 'Không chọn' }, { key: 'actions', label: 'Thao tác', render: row => <div className="ui-actions"><Button variant="quiet" onClick={() => setForm(row)}>Sửa</Button><Button variant="quiet" onClick={() => setRemoving(row)}>Xóa</Button></div> }]} empty={<EmptyState title="Chưa có người nhận" />} />}</ResourceState>
      <RequestError error={task.error} />
      <div className="server-section"><p>{selected.length} người nhận được chọn</p><Button disabled={resource.loading || !!resource.error || !selected.length || (from && to && from > to) || !!job} onClick={() => { task.setError(''); setPreview(true) }}>Kiểm tra và gửi báo cáo</Button></div>
      {job && <JobProgress id={job} />}
    </>}
    {form && <RecipientForm path={path} row={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); setJob(''); resource.reload() }} />}
    {removing && <ServerConfirm title={`Xóa ${removing.email_address}?`} description="Người này sẽ không còn trong danh sách nhận báo cáo của môn." onClose={() => setRemoving(null)} onConfirm={async signal => { await api.request(`${path}/${removing.email_id}`, { method: 'DELETE', signal }); resource.reload() }} />}
    {preview && <Dialog open title="Gửi báo cáo điểm danh" onClose={() => { if (!task.busy) setPreview(false) }} footer={<><Button variant="secondary" disabled={task.busy} onClick={() => setPreview(false)}>Quay lại</Button><Button busy={task.busy} onClick={() => task.run(async signal => { const result = await api.request(`/subjects/${encodeURIComponent(course)}/send-report`, { method: 'POST', body: reportBody(from, to), signal }); if (!result.job_id) throw new Error('Server chưa trả mã tác vụ gửi báo cáo. Kiểm tra trước khi gửi lại.'); setJob(result.job_id); setPreview(false) })}>Gửi cho {selected.length} người nhận</Button></>}>
      <RequestError error={task.error} /><p>{course} · {from || 'Không giới hạn đầu'} đến {to || 'không giới hạn cuối'}</p><ul>{selected.map(row => <li key={row.email_id}>{row.email_address}</li>)}</ul><p className="ui-hint">Server tạo nội dung báo cáo và gửi qua email. Yêu cầu được đưa vào hàng đợi chưa đồng nghĩa email đã gửi xong.</p>
    </Dialog>}
  </>
}
function RecipientForm({ path, row, onSaved, onClose }) {
  const { api } = useServer(), task = useTask(), [values, setValues] = useState({ email_address: row.email_address, recipient_name: row.recipient_name || '', is_selected: row.is_selected ?? true })
  return <Dialog open title={row.email_id ? 'Sửa người nhận' : 'Thêm người nhận'} onClose={() => { if (!task.busy) onClose() }} footer={<><Button variant="secondary" disabled={task.busy} onClick={onClose}>Hủy</Button><Button form="recipient-form" type="submit" busy={task.busy}>Lưu người nhận</Button></>}><form className="portal-form" id="recipient-form" onSubmit={e => { e.preventDefault(); task.run(async signal => { await api.request(path + (row.email_id ? `/${row.email_id}` : ''), { method: row.email_id ? 'PUT' : 'POST', body: values, signal }); onSaved() }) }}><RequestError error={task.error} /><Field label="Email người nhận" autoFocus required type="email" value={values.email_address} onChange={e => setValues({ ...values, email_address: e.target.value })} /><Field label="Tên người nhận" value={values.recipient_name} onChange={e => setValues({ ...values, recipient_name: e.target.value })} /><label className="portal-check"><input type="checkbox" checked={values.is_selected} onChange={e => setValues({ ...values, is_selected: e.target.checked })} />Chọn nhận báo cáo</label></form></Dialog>
}
export function ServerProfile({ required = false }) {
  const { actor, api, clearSession } = useServer(), task = useTask()
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [repeat, setRepeat] = useState('')
  return <><PageHeader title={required ? 'Đổi mật khẩu lần đầu' : 'Hồ sơ của tôi'} />
    <dl className="server-details"><div><dt>Họ tên</dt><dd>{actor.full_name}</dd></div><div><dt>Email</dt><dd>{actor.email}</dd></div><div><dt>Vai trò</dt><dd>{actor.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Giảng viên'}</dd></div></dl>
    <section className="server-section"><h2>Đổi mật khẩu</h2><form className="portal-form server-narrow" onSubmit={e => { e.preventDefault(); task.run(async signal => { if (next !== repeat) throw new Error('Hai mật khẩu mới không khớp.'); await api.request('/auth/change-password', { method: 'POST', signal, body: changePasswordBody(current, next, repeat) }); clearSession() }) }}>
      <RequestError error={task.error} /><Field label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} /><Field label="Mật khẩu mới" type="password" autoComplete="new-password" minLength={6} required value={next} onChange={e => setNext(e.target.value)} /><Field label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" required value={repeat} onChange={e => setRepeat(e.target.value)} /><Button type="submit" busy={task.busy}>Đổi mật khẩu và đăng nhập lại</Button>
    </form></section><Unavailable title="Thông tin hồ sơ">API cập nhật thông tin và ảnh quản trị viên chưa được mô tả. Thông tin ở trên được đọc từ phiên server.</Unavailable>
  </>
}
export function ServerSettings() {
  const [jobId, setJobId] = useState(''), [watch, setWatch] = useState('')
  return <><PageHeader title="Kết nối" /><div className="server-narrow"><ConnectionForm /><section className="server-section"><h2>Tra cứu tác vụ</h2><form className="portal-form" onSubmit={e => { e.preventDefault(); setWatch(jobId.trim()) }}><Field label="Mã tác vụ CSV / email" value={jobId} required onChange={e => setJobId(e.target.value)} /><Button variant="secondary" type="submit">Xem tiến độ</Button></form>{watch && <JobProgress id={watch} />}</section></div></>
}
export function ServerHome() {
  const resource = useResource('/subjects' + queryString({ limit: 5, offset: 0 }))
  return <><PageHeader title="Môn học phụ trách" actions={<a href="#/app/courses">Tất cả môn học →</a>} />
    <ResourceState resource={resource}>{data => <>
      <div className="server-course-list">{(data.items || []).map(row => <article key={row.subject_id}>
        <a href={`#/app/courses/${encodeURIComponent(row.subject_id)}`}><h2>{row.subject_name}</h2></a>
        <p>{row.subject_id} · {row.time_slot || 'Chưa có lịch học'}</p>
        <a className="ui-button ui-button--secondary" href={`#/app/attendance?course=${encodeURIComponent(row.subject_id)}`}>Mở điểm danh →</a>
      </article>)}</div>
      {!data.items?.length && <EmptyState title="Chưa có môn học được phân công" action={<a href="#/app/courses">Xem môn học</a>} />}
    </>}</ResourceState>
  </>
}
