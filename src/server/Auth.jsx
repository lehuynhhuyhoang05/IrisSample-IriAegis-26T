import { useState } from 'react'
import { Button, Field, Notice } from '../ui'
import logo from '../assets/android/ic_app_logo.png'
import { useTask } from './use-task.js'
import { useServer } from './Session.jsx'
import { changeMode } from './config.js'
import { RequestError } from './common.jsx'
import { resetBody } from './contract.js'

export function ConnectionForm() {
  const { baseURL, configure, api } = useServer(), task = useTask()
  const [url, setURL] = useState(baseURL), [healthy, setHealthy] = useState(false)
  return <form className="portal-form" onSubmit={event => { event.preventDefault(); task.run(async () => configure(url)) }}>
    <Field label="Địa chỉ API" type="url" required value={url} onChange={event => { setURL(event.target.value); setHealthy(false) }} hint="URL gồm tiền tố /api/v1. Đổi server sẽ kết thúc phiên hiện tại." />
    <RequestError error={task.error} />
    {healthy && <Notice tone="success">Server hiện tại đã phản hồi kiểm tra kết nối.</Notice>}
    <div className="ui-actions"><Button type="submit" busy={task.busy}>Lưu địa chỉ</Button><Button variant="secondary" disabled={url !== baseURL} busy={task.busy} onClick={() => task.run(async signal => { await api.request('/health', { public: true, signal }); setHealthy(true) })}>Kiểm tra kết nối</Button></div>
  </form>
}
export default function ServerAuth({ page = 'login' }) {
  const { login, api, sessionError } = useServer(), task = useTask()
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [repeat, setRepeat] = useState(''), [token, setToken] = useState(''), [sent, setSent] = useState(false), [expires, setExpires] = useState(120)
  const forgot = page === 'forgot', reset = page === 'reset'
  async function submit(event) {
    event.preventDefault(); setSent(false)
    task.run(async signal => {
      if (forgot) { const result = await api.request('/auth/forgot-password', { method: 'POST', public: true, signal, body: { email: email.trim() } }); setExpires(result.expires_in ?? 120); setSent(true); return }
      if (reset) {
        if (password !== repeat) throw new Error('Hai mật khẩu không khớp.')
        await api.request('/auth/reset-password', { method: 'POST', public: true, signal, body: resetBody(email.trim(), token.trim(), password, repeat) }); setSent(true); setPassword(''); setRepeat(''); return
      }
      await login(email.trim(), password, signal); window.location.hash = '/app/home'
    })
  }
  return <div className="aegis-ui portal-auth"><main className="portal-auth-main"><div className="portal-auth-form">
    <a className="portal-auth-brand" href="#/app/login"><img src={logo} alt="" />IriAegis</a>
    <h1>{forgot ? 'Quên mật khẩu' : reset ? 'Đặt lại mật khẩu' : 'Đăng nhập'}</h1>
    <RequestError error={task.error || sessionError} />
    {sent && <Notice tone="success">{forgot ? `Nếu email tồn tại, mã đặt lại đã được gửi. Mã có hiệu lực ${expires} giây.` : 'Đã cập nhật mật khẩu. Bạn có thể đăng nhập lại.'}</Notice>}
    <form className="portal-form" onSubmit={submit}>
      <Field label={forgot || reset ? 'Email' : 'Email hoặc mã tài khoản'} type={forgot || reset ? 'email' : 'text'} autoComplete="username" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} required />
      {reset && <Field label="Mã đặt lại từ email" value={token} onChange={e => setToken(e.target.value)} required />}
      {!forgot && <Field label={reset ? 'Mật khẩu mới' : 'Mật khẩu'} type="password" autoComplete={reset ? 'new-password' : 'current-password'} minLength={reset ? 6 : undefined} value={password} onChange={e => setPassword(e.target.value)} required />}
      {reset && <Field label="Nhập lại mật khẩu" type="password" autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} required />}
      <Button type="submit" busy={task.busy}>{forgot ? 'Gửi yêu cầu đặt lại' : reset ? 'Lưu mật khẩu mới' : 'Đăng nhập'}</Button>
    </form>
    <div className="server-auth-links">{forgot ? <a href="#/app/reset">Tôi đã có mã đặt lại</a> : !reset && <a href="#/app/forgot">Quên mật khẩu?</a>}{(forgot || reset) && <a href="#/app/login">Quay lại đăng nhập</a>}</div>
    <details className="portal-help"><summary>Kết nối server</summary><ConnectionForm /></details>
    <div className="portal-auth-links"><button type="button" onClick={() => changeMode('demo')}>Mở dữ liệu mẫu</button><a href="#/camera">Camera độc lập</a></div>
  </div></main></div>
}
