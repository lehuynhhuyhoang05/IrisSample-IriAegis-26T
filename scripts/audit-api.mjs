/* global process, console, URL */
import fs from 'node:fs'
import { operations, duplicates } from './openapi-contract.mjs'

// Every Web operation must have an explicit UI/controller location, including planned routes.
export const coverage = {
  'GET /health': ['Auth.jsx', 'Kết nối → Kiểm tra kết nối'],
  'POST /auth/login': ['Session.jsx', 'Đăng nhập bằng email hoặc mã'],
  'POST /auth/refresh': ['client.js', 'Tự làm mới token sau 401'],
  'GET /auth/me': ['Session.jsx', 'Khôi phục phiên'],
  'POST /auth/logout': ['Session.jsx', 'Đăng xuất'],
  'POST /auth/forgot-password': ['Auth.jsx', 'Yêu cầu mã qua email'],
  'POST /auth/reset-password': ['Auth.jsx', 'Đặt lại mật khẩu'],
  'POST /auth/change-password': ['Operations.jsx', 'Hồ sơ / lần đăng nhập đầu'],
  'POST /auth/register': ['Catalog.jsx', 'Super Admin → tạo tài khoản, chọn vai trò'],
  'GET /students': ['Catalog.jsx', 'Danh sách, tìm kiếm, sắp xếp, phân trang'],
  'POST /students': ['Catalog.jsx', 'Thêm sinh viên, có thể ghi danh ngay'],
  'GET /students/{id}': ['Catalog.jsx', 'Chi tiết sinh viên'],
  'PUT /students/{id}': ['Catalog.jsx', 'Sửa sinh viên; ảnh qua endpoint ảnh'],
  'DELETE /students/{id}': ['Catalog.jsx', 'Xóa mềm hồ sơ'],
  'GET /students/{student_id}/photo': ['Catalog.jsx', 'Tải ảnh qua Bearer token'],
  'POST /students/{student_id}/photo': ['Catalog.jsx', 'Chụp/chọn và upload JPEG/PNG'],
  'GET /subjects': ['Catalog.jsx', 'Tìm, lọc status/instructor_id, sắp xếp, phân trang'],
  'POST /subjects': ['Catalog.jsx', 'Tạo môn có trạng thái và thông tin học kỳ'],
  'GET /subjects/{subject_id}': ['Catalog.jsx', 'Chi tiết môn'],
  'PUT /subjects/{subject_id}': ['Catalog.jsx', 'Sửa môn'],
  'DELETE /subjects/{subject_id}': ['Catalog.jsx', 'Xóa mềm môn'],
  'GET /subjects/{subject_id}/students': ['Catalog.jsx', 'Danh sách ghi danh, q/sort/phân trang'],
  'POST /subjects/{subject_id}/students': ['Catalog.jsx', 'Ghi danh, enrollment_status'],
  'DELETE /subjects/{subject_id}/students/{student_id}': ['Catalog.jsx', 'Bỏ khỏi môn'],
  'GET /checkins': ['Reports.jsx', 'Lịch sử theo môn/mã SV/khoảng ngày/sort/phân trang'],
  'DELETE /checkins/{checkin_id}': ['Reports.jsx', 'Xóa mềm lượt điểm danh'],
  'POST /attendance': ['Attendance.jsx', 'Điểm danh thủ công, UUID ổn định khi retry'],
  'GET /attendance': ['Reports.jsx', 'Lượt điểm danh theo môn/ngày'],
  'GET /subjects/{subject_id}/attendance-summary': ['Reports.jsx', 'Tổng hợp theo khoảng ngày'],
  'GET /admins': ['Catalog.jsx', 'Danh sách tài khoản; ADMIN chỉ xem chính mình theo API'],
  'GET /admins/{admin_id}': ['Catalog.jsx', 'Chi tiết tài khoản theo quyền'],
  'GET /subjects/{subject_id}/email-recipients': ['Operations.jsx', 'Danh sách người nhận'],
  'POST /subjects/{subject_id}/email-recipients': ['Operations.jsx', 'Thêm người nhận'],
  'PUT /subjects/{subject_id}/email-recipients/{email_id}': ['Operations.jsx', 'Sửa người nhận, is_selected'],
  'DELETE /subjects/{subject_id}/email-recipients/{email_id}': ['Operations.jsx', 'Xóa người nhận'],
  'POST /subjects/{subject_id}/send-report': ['Operations.jsx', 'Gửi với khoảng ngày tùy chọn, chờ job'],
  'POST /import/csv': ['Jobs.jsx', 'Ba loại CSV, subject_id tùy chọn, xem trước và gửi'],
  'GET /jobs/{id}': ['Jobs.jsx', 'Polling/tra cứu trạng thái tác vụ'],
}
export function audit() {
  const web = [...operations.keys()].filter(key => !key.includes('/sync/'))
  const excluded = [...operations.keys()].filter(key => key.includes('/sync/'))
  const missing = web.filter(key => !coverage[key])
  const extra = Object.keys(coverage).filter(key => !operations.has(key))
  for (const [file] of Object.values(coverage)) if (!fs.existsSync(new URL(`../src/server/${file}`, import.meta.url))) extra.push(`File không có: ${file}`)
  return { web, excluded, missing, extra, duplicates }
}
if (process.argv[1] && new URL(import.meta.url).pathname.toLowerCase().endsWith(process.argv[1].replaceAll('\\', '/').split('/').at(-1).toLowerCase())) {
  const result = audit()
  console.log(`${result.web.length} Web operations; ${result.excluded.length} Android sync operations excluded.`)
  console.log('Missing UI/controller mapping:', result.missing.length ? result.missing.join(', ') : 'none')
  console.log('Undocumented mapping:', result.extra.length ? result.extra.join(', ') : 'none')
  console.log('Conflicting duplicate paths in original YAML:', result.duplicates.join(', '))
  for (const key of result.web) console.log(`${key} -> ${coverage[key]?.join(' · ') || 'MISSING'}`)
  if (result.missing.length || result.extra.length) process.exitCode = 1
}
