import { useState } from 'react'
import { Button, Field, PageHeader } from '../ui'
import { usePortal, useTask } from '../portal/Store.jsx'
import { isSuper, today } from '../portal/domain.js'
import { ErrorNotice, go } from '../portal/shared.jsx'

export default function AdminCreate() {
  const { actor, write, setFlash } = usePortal(), task = useTask()
  const [form, setForm] = useState({ id: '', name: '', email: '', code: '', dob: '', phone: '', gender: '', description: '', password: '', repeatPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }))

  function submit(event) {
    event.preventDefault()
    task.run(() => {
      if (form.password !== form.repeatPassword) throw new Error('Hai mật khẩu không trùng nhau.')
      const { repeatPassword, ...row } = form
      write({ type: 'save', entity: 'admins', row: { ...row, id: row.id.trim().toUpperCase(), name: row.name.trim(), email: row.email.trim() } })
      setFlash({ tone: 'success', text: 'Đã tạo tài khoản Admin trong dữ liệu mẫu.' })
      go('admins')
    })
  }

  if (!isSuper(actor)) return <section className="auth-admin-screen">
    <PageHeader title="Không có quyền truy cập" />
    <p className="portal-muted">Chỉ Super Admin mới được tạo tài khoản Admin.</p>
    <div className="ui-actions"><Button onClick={() => go()}>Về portal chính</Button></div>
  </section>

  return <section className="auth-admin-screen">
    <Button variant="quiet" onClick={() => go('admins')}>Quay lại danh sách Admin</Button>
    <PageHeader title="Thêm Admin mới" description="Tạo tài khoản quản trị trong dữ liệu mẫu." />
    <form className="auth-admin-form" onSubmit={submit} noValidate>
      <section className="auth-admin-section" aria-labelledby="admin-account-heading">
        <h2 id="admin-account-heading">Thông tin tài khoản</h2>
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} required />
        <Field label="Mật khẩu (ít nhất 6 ký tự)" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={6} value={form.password} onChange={event => update('password', event.target.value)} required />
        <Field label="Xác nhận mật khẩu" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.repeatPassword} onChange={event => update('repeatPassword', event.target.value)} required />
        <label className="portal-check"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} />Hiển thị mật khẩu</label>
      </section>
      <section className="auth-admin-section" aria-labelledby="admin-profile-heading">
        <h2 id="admin-profile-heading">Thông tin cá nhân</h2>
        <Field label="Họ và tên" autoComplete="name" value={form.name} onChange={event => update('name', event.target.value)} required />
        <Field label="Mã Admin" hint="2–30 ký tự in hoa, số, dấu gạch ngang hoặc gạch dưới." value={form.id} onChange={event => update('id', event.target.value.toUpperCase())} required />
        <Field label="Mã giảng viên" value={form.code} onChange={event => update('code', event.target.value)} />
        <Field label="Ngày sinh" type="date" max={today()} value={form.dob} onChange={event => update('dob', event.target.value)} />
        <Field label="Số điện thoại" type="tel" autoComplete="tel" value={form.phone} onChange={event => update('phone', event.target.value)} />
        <Field as="select" label="Giới tính" value={form.gender} onChange={event => update('gender', event.target.value)} options={[{ value: '', label: 'Chưa chọn' }, ...['Nam', 'Nữ', 'Khác'].map(value => ({ value, label: value }))]} />
        <Field as="textarea" label="Mô tả" rows={3} maxLength={2000} value={form.description} onChange={event => update('description', event.target.value)} />
      </section>
      <ErrorNotice error={task.error} />
      <div className="ui-actions auth-admin-actions">
        <Button type="button" variant="secondary" onClick={() => go('admins')}>Hủy</Button>
        <Button type="submit" busy={task.busy}>Tạo tài khoản Admin</Button>
      </div>
    </form>
  </section>
}
