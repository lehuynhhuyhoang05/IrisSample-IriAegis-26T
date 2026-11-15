import { useEffect, useState } from 'react'
import { ChevronRight, LogOut, MoreHorizontal, UserCircle } from '../ui/icons'
import { Dialog } from '../ui'
import logo from '../assets/android/ic_app_logo.png'

// Mobile navigation is a separate layout, not a compressed desktop sidebar.
export default function PortalShell({ items, activeId, actor, onLogout, children, mode = 'demo' }) {
  const [menu, setMenu] = useState(false)
  useEffect(() => { setMenu(false) }, [activeId])
  const primaryIds = ['home', 'courses', 'attendance', 'reports']
  const primary = primaryIds.map(id => items.find(item => item.id === id)).filter(Boolean)
  const links = list => list.map(({ id, href, label, icon: Icon }) => <a key={id} href={href} aria-current={activeId === id ? 'page' : undefined} onClick={() => setMenu(false)}><Icon size={23} weight={activeId === id ? 'fill' : 'regular'} aria-hidden="true" /><span>{id === 'reports' ? 'Báo cáo' : id === 'home' && mode === 'server' ? 'Lớp học' : label}</span></a>)
  return <div className="aegis-ui portal-shell portal-layout">
    <a className="ui-skip" href="#portal-main">Đi đến nội dung</a>
    <aside className="portal-rail">
      <a className="portal-logo" href="#/app/home"><img src={logo} alt="" /><span>IriAegis</span></a>
      <nav aria-label="Điều hướng chính">{links(items)}</nav>
      <div className="portal-rail-account"><span>{actor.name}</span><small>{actor.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Giảng viên'}</small><button type="button" onClick={onLogout}><LogOut size={17} />Đăng xuất</button></div>
    </aside>
    <div className="portal-body">
      <header className="portal-appbar"><a className="portal-logo" href="#/app/home"><img src={logo} alt="" /><span>IriAegis</span></a><div className="portal-appbar-actions"><a className="portal-demo-tag" href="#/app/settings" aria-label={mode === 'server' ? 'Cấu hình kết nối server' : 'Thiết lập demo'}>{mode === 'server' ? 'Server' : 'Demo'}</a><button type="button" className="portal-account-button" aria-label="Mở menu tài khoản" aria-expanded={menu} onClick={() => setMenu(true)}><UserCircle size={24} strokeWidth={1.5} /></button></div></header>
      <main id="portal-main" className="ui-main" tabIndex={-1}>{children}</main>
    </div>
    <nav className="portal-tabbar" aria-label="Điều hướng trên điện thoại">{links(primary)}<button type="button" aria-label="Thêm mục điều hướng" aria-expanded={menu} aria-current={!primaryIds.includes(activeId) ? 'page' : undefined} onClick={() => setMenu(true)}><MoreHorizontal size={23} /><span>Thêm</span></button></nav>
    {menu && <Dialog open title="Tài khoản & chức năng" onClose={() => setMenu(false)}>
      <div className="portal-menu-account"><strong>{actor.name}</strong><span>{actor.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Giảng viên'}</span></div>
      <nav className="portal-more-links" aria-label="Các chức năng khác">{links(items.filter(item => !primaryIds.includes(item.id)))}</nav>
      <div className="portal-more-tools">{mode === 'demo' && <><a href="#/camera" onClick={() => setMenu(false)}>Camera độc lập<ChevronRight size={17} /></a><a href="#/ui-kit" onClick={() => setMenu(false)}>Bộ giao diện<ChevronRight size={17} /></a></>}<button type="button" onClick={() => { setMenu(false); onLogout() }}><LogOut size={18} />Đăng xuất</button></div>
    </Dialog>}
  </div>
}
