import { useEffect, useRef, useState } from 'react'
import { ChevronRight, LogOut, MoreHorizontal } from '../ui/icons'
import { Dialog } from '../ui'
import logo from '../assets/android/ic_app_logo.png'
import { animateOverlay, toggleDisclosure } from '../ui/motion.js'

// Mobile navigation is a separate layout, not a compressed desktop sidebar.
export default function PortalShell({ items, activeId, actor, onLogout, children, mode = 'demo' }) {
  const [menu, setMenu] = useState(false)
  const drawer = useRef(null), closing = useRef(false), closeSequence = useRef(0)
  const openMenu = event => { event.currentTarget.focus({ preventScroll: true }); setMenu(true) }
  useEffect(() => { closeSequence.current++; closing.current = false; setMenu(false) }, [activeId])
  async function closeMenu(afterClose) {
    if (closing.current) return
    closing.current = true
    const sequence = ++closeSequence.current
    const panel = drawer.current
    const animation = animateOverlay(panel, { closing: true })
    if (animation) await animation.finished.catch(() => {})
    if (sequence !== closeSequence.current || !panel?.isConnected) return
    closing.current = false
    setMenu(false)
    afterClose?.()
  }
  function navigateFromDrawer(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const hash = event.currentTarget.hash
    closeMenu(() => { window.location.hash = hash })
  }
  const groups = [
    ['Lớp học', ['home', 'courses', 'attendance', 'reports']],
    ['Quản lý', ['students', 'admins', 'email']],
    ['Công cụ', ['mock-attendance', 'backups', 'biometrics']],
    ['Tài khoản', ['profile', 'settings']],
  ]
  const groupedLinks = list => groups.map(([label, ids]) => {
    const group = list.filter(item => ids.includes(item.id))
    return group.length ? <div className="portal-nav-group" key={label}><p>{label}</p>{links(group)}</div> : null
  })
  const links = (list, inDrawer = false) => list.map(({ id, href, label, icon: Icon }) => <a key={id} href={href} aria-current={activeId === id ? 'page' : undefined} onClick={inDrawer ? navigateFromDrawer : undefined}><Icon size={23} weight={activeId === id ? 'fill' : 'regular'} aria-hidden="true" /><span>{id === 'reports' ? 'Báo cáo' : id === 'home' && mode === 'server' ? 'Lớp học' : label}</span></a>)
  return <div className="aegis-ui portal-shell portal-layout">
    <a className="ui-skip" href="#portal-main">Đi đến nội dung</a>
    <aside className="portal-rail">
      <a className="portal-logo" href="#/app/home"><img src={logo} alt="" /><span>IriAegis</span></a>
      <nav aria-label="Điều hướng chính">{groupedLinks(items)}</nav>
      <div className="portal-rail-account"><span>{actor.name}</span><small>{actor.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Giảng viên'}</small><button type="button" onClick={onLogout}><LogOut size={17} />Đăng xuất</button></div>
    </aside>
    <div className="portal-body">
      <header className="portal-appbar"><a className="portal-logo" href="#/app/home"><img src={logo} alt="" /><span>IriAegis</span></a><div className="portal-appbar-actions"><a className="portal-demo-tag" href="#/app/settings" aria-label={mode === 'server' ? 'Cấu hình kết nối server' : 'Thiết lập demo'}>{mode === 'server' ? 'Server' : 'Demo'}</a><button type="button" className="portal-menu-button" aria-label="Mở menu điều hướng" aria-expanded={menu} aria-haspopup="dialog" onClick={openMenu}><MoreHorizontal size={26} aria-hidden="true" /><span>Menu</span></button></div></header>
      <main id="portal-main" className="ui-main" tabIndex={-1}>{children}</main>
    </div>
    {menu && <Dialog open dialogRef={drawer} className="portal-drawer" dismissOnBackdrop title={<span className="portal-logo"><img src={logo} alt="" /><span>IriAegis</span></span>} onClose={() => closeMenu()}>
      <nav className="portal-drawer-links" aria-label="Điều hướng trên điện thoại">{groups.map(([label, ids]) => {
        const group = items.filter(item => ids.includes(item.id))
        return group.length ? <details open key={label}><summary onClick={event => { event.preventDefault(); toggleDisclosure(event.currentTarget.parentElement) }}>{label}<ChevronRight size={17} aria-hidden="true" /></summary><div>{links(group, true)}</div></details> : null
      })}</nav>
      <div className="portal-menu-account"><strong>{actor.name}</strong><span>{actor.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Giảng viên'}</span></div>
      <div className="portal-more-tools">{mode === 'demo' && <><a href="#/camera" onClick={navigateFromDrawer}>Camera độc lập<ChevronRight size={17} /></a><a href="#/ui-kit" onClick={navigateFromDrawer}>Bộ giao diện<ChevronRight size={17} /></a></>}<button type="button" onClick={() => closeMenu(onLogout)}><LogOut size={18} />Đăng xuất</button></div>
    </Dialog>}
  </div>
}
