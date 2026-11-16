import { lazy, Suspense, useEffect, useState } from 'react'
import App from './App.jsx'

const Showcase = import.meta.env.DEV ? lazy(() => import('./showcase/Showcase.jsx')) : null
const Portal = lazy(() => import('./server/ServerPortal.jsx'))
import './ui/tokens.css'
import './ui/ui.css'
import './portal/portal.css'
import './portal/mobile-first.css'

export default function Workspace() {
  const [path, setPath] = useState(window.location.hash)
  useEffect(() => {
    const change = () => { setPath(window.location.hash); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  if (Showcase && path.startsWith('#/ui-kit')) return <Suspense fallback={<p role="status">Đang mở thư viện giao diện…</p>}><Showcase path={path} /></Suspense>
  if (path.startsWith('#/camera')) return <App key={path.startsWith('#/camera/passive') ? 'passive' : 'full'} passiveOnly={path.startsWith('#/camera/passive')} />
  return <Suspense fallback={<p role="status">Đang mở không gian quản lý…</p>}><Portal path={path || '#/app'} /></Suspense>
}
