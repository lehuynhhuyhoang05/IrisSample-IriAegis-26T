import { useEffect, useRef } from 'react'
import { Button, Dialog, EmptyState, LoadingState, Notice } from '../ui'
import { useTask } from './use-task.js'

export function RequestError({ error }) {
  const ref = useRef(null)
  useEffect(() => { if (error) { ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ block: 'nearest' }) } }, [error])
  return error ? <div ref={ref} tabIndex={-1}><Notice tone="danger">{error}</Notice></div> : null
}
export function ResourceState({ resource, children }) {
  if (resource.loading) return <LoadingState />
  if (resource.error) return <><RequestError error={resource.error} /><Button variant="secondary" onClick={resource.reload}>Thử tải lại</Button></>
  if (!resource.data) return <EmptyState title="Chưa có dữ liệu" />
  return children(resource.data)
}
export function Pager({ total = 0, offset, limit = 25, onChange }) {
  return <div className="server-pager"><span>{total ? `${offset + 1}–${Math.min(offset + limit, total)} / ${total}` : '0 kết quả'}</span>{(total > limit || offset > 0) && <div className="ui-actions"><Button variant="quiet" disabled={!offset} onClick={() => onChange(Math.max(0, offset - limit))}>Trước</Button><Button variant="quiet" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>Sau</Button></div>}</div>
}
export function ServerConfirm({ title, description, actionLabel = 'Xóa', onConfirm, onClose }) {
  const task = useTask()
  return <Dialog open title={title} description={description} onClose={() => { if (!task.busy) onClose() }} footer={<><Button variant="secondary" disabled={task.busy} onClick={onClose}>Hủy</Button><Button variant="danger" busy={task.busy} onClick={() => task.run(async signal => { await onConfirm(signal); onClose() })}>{actionLabel}</Button></>}><RequestError error={task.error} /></Dialog>
}
export function Unavailable({ title, children }) {
  return <section className="server-unavailable"><h2>{title}</h2><p>{children}</p></section>
}
