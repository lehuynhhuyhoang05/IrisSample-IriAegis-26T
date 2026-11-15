import { useState } from 'react'
import { Button, Field, SearchField } from '../ui'
import { useResource } from './hooks.js'
import { queryString } from './client.js'
import { Pager, ResourceState } from './common.jsx'

export function SubjectPicker({ value, onChange, emptyLabel = 'Chọn môn học' }) {
  const [q, setQ] = useState(''), [search, setSearch] = useState(''), [offset, setOffset] = useState(0)
  const resource = useResource('/subjects' + queryString({ q: search, limit: 25, offset }))
  return <div className="server-subject-picker">{(resource.data?.total > 25 || q || search || offset > 0) && <form className="server-search" onSubmit={e => { e.preventDefault(); setSearch(q); setOffset(0) }}><SearchField label="Tìm môn học" placeholder="Tìm môn theo mã hoặc tên…" value={q} onChange={e => setQ(e.target.value)} /><Button type="submit" variant="secondary">Tìm môn</Button></form>}<ResourceState resource={resource}>{data => <><Field label="Môn học" as="select" value={value} onChange={e => onChange(e.target.value)} options={[{ value: '', label: emptyLabel }, ...(value && !data.items?.some(row => row.subject_id === value) ? [{ value, label: value }] : []), ...(data.items || []).map(row => ({ value: row.subject_id, label: `${row.subject_id} · ${row.subject_name}` }))]} />{(data.total > 25 || offset > 0) && <Pager total={data.total} offset={offset} onChange={setOffset} />}</>}</ResourceState></div>
}
