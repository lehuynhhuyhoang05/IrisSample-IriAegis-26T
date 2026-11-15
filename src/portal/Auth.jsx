import { useState } from 'react'
import { ArrowRight, BookOpen, ShieldCheck } from '../ui/icons'
import logo from '../assets/android/ic_app_logo.png'
import { Button, Field, Notice } from '../ui'
import { usePortal, useTask } from './Store.jsx'
import { DEMO_PASSWORD, uid } from './domain.js'
import { ErrorNotice, FaceFlow, go } from './shared.jsx'
import { changeMode } from '../server/config.js'

export default function Auth({ page }) {
  const { db, write, persist, login, simulate } = usePortal(), task = useTask()
  const [email, setEmail] = useState('super@demo.test'), [password, setPassword] = useState(DEMO_PASSWORD), [name, setName] = useState('')
  const [repeat, setRepeat] = useState(''), [ticket, setTicket] = useState(null), [code, setCode] = useState(''), [pending, setPending] = useState(null)
  const setup = !db.admins.length, reset = page === 'reset', forgot = page === 'forgot'
  const title = setup ? 'Khởi tạo quản trị viên' : reset ? 'Đặt lại mật khẩu' : forgot ? 'Quên mật khẩu' : 'Đăng nhập'
  async function submit(event) {
    event.preventDefault()
    task.run(async signal => {
      await simulate(signal)
      if (setup) {
        if (password !== repeat) throw new Error('Hai mật khẩu không trùng nhau.')
        write({ type: 'bootstrap', row: { name: name.trim(), email: email.trim(), password } }); go('login'); return
      }
      if (forgot) {
        const account = db.admins.find(a => a.email.toLowerCase() === email.trim().toLowerCase())
        if (!account) throw new Error('Không tìm thấy tài khoản trong dữ liệu demo.')
        setTicket({ id: uid('RESET').slice(-8), adminId: account.id, expires: Date.now() + 10 * 60 * 1000 }); return
      }
      if (reset) {
        if (!ticket || ticket.id !== code || Date.now() > ticket.expires) throw new Error('Mã demo sai hoặc đã hết hạn. Tạo lại từ Quên mật khẩu.')
        if (password.length < 6 || password !== repeat) throw new Error('Mật khẩu ít nhất 6 ký tự và hai lần nhập phải trùng nhau.')
        persist({ ...db, admins: db.admins.map(a => a.id === ticket.adminId ? { ...a, password } : a) }); setTicket(null); go('login'); return
      }
      const account = db.admins.find(a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password)
      if (!account) throw new Error('Email hoặc mật khẩu demo chưa đúng.')
      if (account.photo) setPending(account)
      else { login(account.id); go() }
    })
  }
  return <div className="aegis-ui portal-auth"><main className="portal-auth-main"><div className="portal-auth-form"><a className="portal-auth-brand" href="#/app"><img src={logo} alt="" />IriAegis</a>
    {pending ? <><h2>Xác thực tài khoản</h2><p>{pending.name}</p><FaceFlow onCancel={() => setPending(null)} onComplete={() => { login(pending.id); go() }} /></> : <>
      <span className="portal-demo-label">Bản demo</span><h2>{title}</h2>
      <ErrorNotice error={task.error} />
      <form className="portal-form" onSubmit={submit}>
        {setup && <Field label="Họ tên Super Admin" value={name} onChange={e => setName(e.target.value)} required />}
        {!reset && <Field label="Email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />}
        {reset && <Field label="Mã đặt lại demo" value={code} onChange={e => setCode(e.target.value)} required />}
        {!forgot && <Field label={reset ? 'Mật khẩu mới' : 'Mật khẩu'} type="password" autoComplete={reset || setup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required />}
        {(setup || reset) && <Field label="Nhập lại mật khẩu" type="password" value={repeat} onChange={e => setRepeat(e.target.value)} required />}
        <Button type="submit" icon={ArrowRight} busy={task.busy}>{setup ? 'Tạo Super Admin' : reset ? 'Lưu mật khẩu mới' : forgot ? 'Tạo yêu cầu demo' : 'Đăng nhập'}</Button>
      </form>
      {forgot && ticket && <Notice tone="info" title="Hộp thư giả lập — chưa gửi email">Mã: <strong>{ticket.id}</strong> · hết hạn sau 10 phút, mất khi tải lại trang. <Button variant="quiet" onClick={() => { setCode(ticket.id); setPassword(''); setRepeat(''); go('reset') }}>Mở đặt lại mật khẩu</Button></Notice>}
      {!setup && <div className="ui-actions"><Button variant="quiet" onClick={() => { task.setError(''); go(forgot || reset ? 'login' : 'forgot') }}>{forgot || reset ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}</Button></div>}
      {!setup && !forgot && !reset && <div className="portal-demo-accounts"><h3>Tài khoản thử nghiệm</h3><p>Mật khẩu mẫu: <code>{DEMO_PASSWORD}</code></p><div className="ui-actions"><Button variant="secondary" onClick={() => { setEmail('super@demo.test'); setPassword(DEMO_PASSWORD) }}>Super Admin</Button><Button variant="secondary" onClick={() => { setEmail('lan@demo.test'); setPassword(DEMO_PASSWORD) }}>Giảng viên Lan</Button></div></div>}
    </>}
    <div className="portal-auth-links"><button type="button" onClick={() => changeMode('server')}>Kết nối server nhóm 1</button><a href="#/camera">Camera độc lập</a><a href="#/ui-kit">Bộ giao diện chung</a></div>
  </div></main></div>
}
