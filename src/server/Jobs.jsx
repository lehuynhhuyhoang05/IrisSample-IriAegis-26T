import { useEffect, useState } from 'react'
import { Button, DataTable, Dialog, Field, Notice } from '../ui'
import { useServer } from './Session.jsx'
import { useTask } from './use-task.js'
import { RequestError } from './common.jsx'
import { csvText, download, parseCSV } from '../portal/csv.js'

const terminal = ['finished', 'failed', 'stopped', 'canceled']
const labels = { queued: 'Đang chờ xử lý', started: 'Đang xử lý', deferred: 'Đang chờ', scheduled: 'Đã lên lịch', finished: 'Đã xử lý', failed: 'Xử lý thất bại', stopped: 'Đã dừng', canceled: 'Đã hủy' }
export function JobProgress({ id, onFinished }) {
  const { api } = useServer(), [job, setJob] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); let timer
    async function poll() {
      try {
        const result = await api.request(`/jobs/${encodeURIComponent(id)}`, { signal: controller.signal })
        if (controller.signal.aborted) return
        setJob(result); setError('')
        if (result.status === 'finished') onFinished?.(result)
        if (!terminal.includes(result.status)) timer = setTimeout(poll, 2000)
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message) }
    }
    poll(); return () => { controller.abort(); clearTimeout(timer) }
  }, [api, id, retry, onFinished])
  return <section className="server-job" aria-live="polite"><h3>{job ? labels[job.status] || job.status : 'Đang kiểm tra tiến độ…'}</h3><p className="ui-hint">Mã tác vụ: {id}</p><RequestError error={error} />{error && <Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Kiểm tra lại tác vụ</Button>}
    {job?.result && <>{Number.isFinite(job.result.imported) && <p>{job.result.imported} đã nhập · {job.result.updated ?? 0} cập nhật · {job.result.skipped ?? 0} bỏ qua</p>}{job.result.errors?.length > 0 && <Notice tone="warning" title="Một số dòng chưa nhập được"><span>{job.result.errors.join('; ')}</span></Notice>}</>}
    {job && ['failed', 'stopped', 'canceled'].includes(job.status) && <Notice tone="danger">Tác vụ chưa hoàn tất. Kiểm tra dữ liệu và liên hệ nhóm server với mã tác vụ ở trên.</Notice>}
    {job?.error && <details className="server-filters"><summary>Chi tiết lỗi từ server</summary><pre className="server-job-error">{job.error}</pre></details>}
  </section>
}
const headers = { students: ['student_id', 'full_name', 'phone', 'email', 'checkin_password', 'photo_path', 'subject_id', 'class_name'], subjects: ['subject_id', 'subject_name', 'time_slot', 'created_by', 'instructor_id', 'subject_status', 'semester_start_date', 'semester_end_date'], admin: ['admin_id', 'email', 'full_name', 'password', 'phone', 'date_of_birth', 'gender', 'role', 'admin_code', 'description'] }
export function ImportJob({ type, initialSubjectId = '', onClose }) {
  const { api } = useServer(), task = useTask()
  const [file, setFile] = useState(null), [preview, setPreview] = useState([]), [jobId, setJobId] = useState('')
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  async function choose(next) {
    setFile(null); setPreview([]); task.setError('')
    if (!next) return
    try {
      if (next.size > 1000000) throw new Error('Chọn file CSV tối đa 1 MB, không quá 500 dòng cho bản Web này.')
      const rows = parseCSV(await next.text())
      if (!rows.length) throw new Error('File chưa có dòng dữ liệu.')
      const required = type === 'students' ? ['student_id', 'full_name'] : type === 'subjects' ? ['subject_id', 'subject_name'] : ['email', 'full_name']
      if (required.some(key => !Object.hasOwn(rows[0], key))) throw new Error(`Thiếu cột bắt buộc: ${required.join(', ')}.`)
      setFile(next); setPreview(rows.slice(0, 5).map((row, id) => ({ ...row, id })))
    } catch (error) { task.setError(error.message) }
  }
  return <Dialog open title="Nhập CSV lên server" onClose={() => { if (!task.busy) onClose() }} footer={<><Button variant="secondary" disabled={task.busy} onClick={onClose}>Đóng</Button>{!jobId && <Button disabled={!file} busy={task.busy} onClick={() => task.run(async signal => { const body = new FormData(); body.set('type', type); body.set('file', file); if (type === 'students' && subjectId.trim()) body.set('subject_id', subjectId.trim()); const result = await api.request('/import/csv', { method: 'POST', body, signal }); if (!result.job_id) throw new Error('Server chưa trả mã tác vụ. Kiểm tra trước khi gửi lại file.'); setJobId(result.job_id) })}>Gửi file để xử lý</Button>}</>}>
    <RequestError error={task.error} />{jobId ? <><p>Server đã nhận file. Đóng cửa sổ không hủy tác vụ đang chạy.</p><JobProgress id={jobId} /></> : <div className="portal-form"><Button variant="quiet" onClick={() => download(csvText(headers[type], []), `mau-${type}-server.csv`)}>Tải mẫu CSV</Button>{type === 'students' && <Field label="Mã môn ghi danh (tùy chọn)" value={subjectId} onChange={e => setSubjectId(e.target.value)} hint="Áp dụng cho file nhập sinh viên khi muốn ghi danh vào một môn." />}<Field label="File CSV UTF-8" type="file" accept=".csv,text/csv" onChange={e => choose(e.target.files?.[0])} />{preview.length > 0 && <><p>Xem trước {preview.length} dòng đầu; server kiểm tra từng dòng khi nhập.</p><DataTable caption="Xem trước CSV" rows={preview} columns={headers[type].slice(0, 3).map(key => ({ key, label: key }))} /></>}</div>}
  </Dialog>
}
