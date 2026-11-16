import { useState } from 'react'
import { Badge, Button, Dialog, PageHeader } from '../ui'
import { usePortal } from './Store.jsx'

export function IrisUnavailable({ title = 'Ghi danh mống mắt', name, onClose }) {
  return <Dialog open title={title} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Đóng</Button>}><dl className="portal-details">{name && <><dt>Người đăng ký</dt><dd>{name}</dd></>}<dt>Thiết bị quét</dt><dd>Chưa kết nối</dd><dt>SDK / license</dt><dd>Chưa tích hợp trên Web</dd></dl><p className="ui-hint">Cần kết nối thiết bị quét mống mắt để tiếp tục.</p><Button disabled>Bắt đầu quét</Button></Dialog>
}

export default function Biometrics() {
  const { actor } = usePortal(), [enrolling, setEnrolling] = useState(false)
  return <><PageHeader title="Sinh trắc học" />
    <section className="portal-section"><div className="portal-section-heading"><h2>Khuôn mặt</h2><Badge tone={actor.photo ? 'success' : 'neutral'}>{actor.photo ? 'Đã lưu ảnh' : 'Chưa có ảnh'}</Badge></div>
      {actor.photo && <img className="server-photo" src={actor.photo} alt="Ảnh khuôn mặt của tôi" />}<p>Ảnh hồ sơ và kết quả liveness được dùng ở các bước khác nhau. Đối sánh danh tính trong bản dữ liệu mẫu vẫn là giả lập.</p><a className="ui-button ui-button--secondary" href="#/app/profile">Cập nhật ảnh trong hồ sơ</a></section>
    <section className="portal-section"><div className="portal-section-heading"><h2>Mống mắt</h2><Badge>Chưa ghi danh</Badge></div><p>Cần thiết bị quét và SDK tương thích. Bản Android hiện tại cũng chưa bật đầy đủ module này.</p><Button variant="secondary" onClick={() => setEnrolling(true)}>Ghi danh mống mắt</Button></section>
    <section className="portal-section"><h2>Xác thực thao tác nhạy cảm</h2><p>Bản dữ liệu mẫu dùng hộp thoại nhập lại mật khẩu trước các thao tác quản trị. Cơ chế khóa thiết bị của Android cần phương án tương ứng cho Web.</p></section>
    {enrolling && <IrisUnavailable name={actor.name} onClose={() => setEnrolling(false)} />}
  </>
}
