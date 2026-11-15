import { useEffect, useRef, useState } from 'react'
import { BookOpen, CalendarCheck, ClipboardList, Home, Mail, Settings2, ShieldCheck, UserCircle, Users } from '../ui/icons'
import { Button, Dialog, LoadingState, PageHeader } from '../ui'
import PortalShell from '../portal/PortalShell.jsx'
import { useTask } from '../portal/Store.jsx'
import { ServerProvider, useServer } from './Session.jsx'
import ServerAuth from './Auth.jsx'
import { ServerCatalog, ServerDetail } from './Catalog.jsx'
import { ServerAttendance, ServerReports } from './Attendance.jsx'
import { ServerEmail, ServerHome, ServerProfile, ServerSettings } from './Operations.jsx'
import { RequestError, Unavailable } from './common.jsx'
import './server.css'

function Content({ path }) {
  const { actor, restoring, logout, clearSession } = useServer(), task = useTask(), [leaving, setLeaving] = useState(false), main = useRef(null)
  const [route, query = ''] = path.replace(/^#\/?app\/?/, '').split('?'), [page = 'home', rawId] = route.split('/'), params = new URLSearchParams(query)
  let id = ''
  try { id = decodeURIComponent(rawId || '') } catch { /* Invalid route is handled as missing record. */ }
  useEffect(() => { main.current?.querySelector('h1')?.focus({ preventScroll: true }); window.scrollTo(0, 0) }, [path, actor])
  if (restoring) return <div className="aegis-ui"><LoadingState label="Đang khôi phục phiên đăng nhập…" /></div>
  if (!actor) return <ServerAuth key={page} page={page} />
  const nav = [['home', 'Môn phụ trách', Home], ['courses', 'Môn học', BookOpen], ['students', 'Sinh viên', Users], ['attendance', 'Điểm danh', CalendarCheck], ['reports', 'Lịch sử & báo cáo', ClipboardList], ['email', 'Email báo cáo', Mail], ['admins', actor.role === 'SUPER_ADMIN' ? 'Quản trị viên' : 'Tài khoản quản trị', ShieldCheck], ['profile', 'Hồ sơ của tôi', UserCircle], ['settings', 'Kết nối', Settings2]]
  let content
  if (actor.is_first_login === 1) content = <ServerProfile required />
  else if (['courses', 'students', 'admins'].includes(page)) content = id ? <ServerDetail key={`${page}-${id}`} entity={page} id={id} params={params} /> : <ServerCatalog key={page} entity={page} params={params} />
  else if (page === 'attendance') content = <ServerAttendance key={params.get('course') || ''} params={params} />
  else if (page === 'reports') content = <ServerReports key={query} params={params} />
  else if (page === 'email') content = <ServerEmail key={query} params={params} />
  else if (page === 'profile') content = <ServerProfile />
  else if (page === 'settings') content = <ServerSettings />
  else if (['home', 'login', 'forgot', 'reset', ''].includes(page)) content = <ServerHome />
  else content = <><PageHeader title="Chức năng chưa khả dụng" /><Unavailable title="Chưa có API tương ứng">Sao lưu/khôi phục, mống mắt và một số thao tác quản trị chưa có hợp đồng Web REST. Bạn có thể xem các luồng mẫu trong Kết nối → Dữ liệu mẫu.</Unavailable></>
  return <PortalShell mode="server" items={nav.map(([id, label, icon]) => ({ id, label, icon, href: `#/app/${id}` }))} activeId={page} actor={{ ...actor, name: actor.full_name }} onLogout={() => { task.setError(''); setLeaving(true) }}>
    <div ref={main} key={page}>{content}</div>
    {leaving && <Dialog open title="Đăng xuất?" onClose={() => { if (!task.busy) setLeaving(false) }} footer={<><Button variant="secondary" disabled={task.busy} onClick={() => setLeaving(false)}>Hủy</Button><Button busy={task.busy} onClick={() => task.run(logout)}>Đăng xuất</Button></>}><RequestError error={task.error} />{task.error && <><p>Chưa xác nhận thu hồi token trên server. Bạn vẫn có thể xóa phiên khỏi trình duyệt này.</p><Button variant="secondary" onClick={clearSession}>Chỉ xóa phiên trên thiết bị</Button></>}</Dialog>}
  </PortalShell>
}
export default function ServerPortal({ path }) { return <ServerProvider><Content path={path} /></ServerProvider> }
