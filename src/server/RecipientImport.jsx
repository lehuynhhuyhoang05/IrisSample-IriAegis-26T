import { useEffect, useRef, useState } from 'react'
import { Button, DataTable, Dialog, Field } from '../ui'
import { csvText, download } from '../portal/csv.js'
import { recipientRows } from './recipient-import.js'
import { useServer } from './Session.jsx'
import { RequestError } from './common.jsx'

const labels = { pending: 'Chờ nhập', created: 'Đã thêm', existing: 'Đã có trong môn', duplicate: 'Trùng trong file', failed: 'Chưa thêm / chưa xác nhận' }

export default function RecipientImport({ course, existing, onChanged, onClose }) {
  const { api } = useServer()
  const [rows, setRows] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const controller = useRef(null), running = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])
  const pending = rows.filter(row => ['pending', 'failed'].includes(row.status))
  const created = rows.filter(row => row.status === 'created').length
  async function choose(file) {
    setRows([]); setError('')
    if (!file) return
    try {
      if (file.size > 1000000) throw new Error('CSV tối đa 1 MB và 500 dòng.')
      const parsed = recipientRows(await file.text(), existing)
      setRows(parsed)
    } catch (failure) { setError(failure.message) }
  }
  async function run() {
    if (running.current) return
    running.current = true; setBusy(true); setError('')
    const request = new AbortController(); controller.current = request
    const update = (id, status, message = '') => setRows(previous => previous.map(row => row.id === id ? { ...row, status, message } : row))
    try {
      for (const row of pending) {
        if (request.signal.aborted) break
        try {
          await api.request(`/subjects/${encodeURIComponent(course)}/email-recipients`, { method: 'POST', body: row.body, signal: request.signal })
          update(row.id, 'created')
        } catch (failure) {
          if (failure.status === 409) { update(row.id, 'existing'); continue }
          update(row.id, 'failed', request.signal.aborted ? 'Yêu cầu đã dừng; kiểm tra danh sách trước khi thử lại.' : failure.message)
          if (request.signal.aborted || !failure.status || failure.status >= 500 || [401, 403].includes(failure.status)) {
            setError('Đã dừng nhập. Những dòng đã thêm được giữ lại; các dòng chưa xác nhận có thể thử lại, server từ chối email trùng.')
            break
          }
        }
      }
    } finally {
      running.current = false; setBusy(false); onChanged()
    }
  }
  return <Dialog open title="Nhập CSV người nhận" onClose={() => { if (!busy) onClose() }} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Đóng</Button>{busy ? <Button variant="secondary" onClick={() => controller.current?.abort()}>Dừng nhập</Button> : <Button disabled={!pending.length} onClick={run}>{rows.some(row => row.status === 'failed') ? 'Thử lại các dòng chưa nhập' : `Nhập ${pending.length} người nhận`}</Button>}</>}>
    <p>{course}</p><RequestError error={error} />
    <Button variant="quiet" disabled={busy} onClick={() => download(csvText(['email_address', 'recipient_name', 'is_selected'], []), 'mau-nguoi-nhan.csv')}>Tải CSV mẫu</Button>
    <Field label="File CSV người nhận" type="file" accept=".csv,text/csv" disabled={busy} onChange={e => choose(e.target.files?.[0])} />
    {rows.length > 0 && <><p role="status">{created} đã thêm · {rows.filter(row => ['existing', 'duplicate'].includes(row.status)).length} bỏ qua · {pending.length} chưa nhập{busy ? ' · Đang xử lý…' : ''}</p>
      <DataTable caption="Kiểm tra người nhận CSV" rows={rows} columns={[{ key: 'id', label: 'Dòng' }, { key: 'email', label: 'Email', render: row => row.body.email_address }, { key: 'name', label: 'Tên', render: row => row.body.recipient_name }, { key: 'status', label: 'Kết quả', render: row => <span>{labels[row.status]}{row.message && <small className="portal-block-muted">{row.message}</small>}</span> }]} />
    </>}
  </Dialog>
}
