# Kiểm tra code tự động cho nhóm Web

## Các kiểm tra được chuẩn bị

- **GitHub Actions:** workflow `.github/workflows/quality.yml` chạy khi push lên GitHub, tạo/cập nhật pull request, chạy thủ công và merge queue. Job `Lint, test và build` dùng Node 22, `npm ci`, `npm run lint`, `npm test` và `npm run build`. Mỗi commit mới trên PR sẽ được kiểm tra lại; commit chỉ nằm trên máy cá nhân chưa kích hoạt GitHub Actions.
- **ESLint:** `eslint.config.js` kiểm tra các lỗi JavaScript cơ bản. Hiện tắt `no-unused-vars` riêng cho JSX vì cấu hình chưa có bộ phân tích JSX tương ứng; không khẳng định phát hiện hết lỗi React, accessibility hay bảo mật.
- **Dependabot:** `.github/dependabot.yml` đề xuất cập nhật npm và GitHub Actions hàng tuần qua PR. Dependabot đọc cấu hình và manifest trên nhánh mặc định; không tự sửa source hoặc tự merge.

## Chạy trước khi push

Yêu cầu Node 22 tương thích workflow và npm. Trong PowerShell tại thư mục source:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Không xóa `package-lock.json`; khi thêm dependency, commit cả thay đổi manifest và lockfile. Nếu một lệnh lỗi, sửa rồi chạy lại. Test hiện có chủ yếu kiểm tra tính vùng cắt ảnh; kiểm tra đạt không chứng minh camera, Safari, AI hay toàn bộ nghiệp vụ hoạt động đúng.

## Đưa bot lên GitHub

Hiện nhánh mặc định `main` trên remote từng được yêu cầu chỉ chứa README; code ứng dụng nằm trên `HuyHoang`. Workflow này được thiết kế cho nhánh có `package.json` và source tại gốc repository. Nếu đưa workflow vào nhánh chỉ có README rồi chạy ở đó, `npm ci` sẽ lỗi; không yêu cầu job trên nhánh không có project mà chưa điều chỉnh cấu trúc.

1. Nhóm thống nhất nhánh nhận PR có source và workflow; đưa các file `.github/`, `eslint.config.js`, `package.json`, `package-lock.json` lên nhánh đó bằng PR phù hợp. Giữ `main` như hiện tại nếu vẫn muốn nó chỉ chứa tài liệu.
2. Mở PR thử từ một nhánh source vào nhánh nhận PR; kiểm tra tab **Checks** hoặc **Actions** và sửa lỗi nếu có.
3. Để Dependabot theo dõi npm, nhánh mặc định cần chứa `.github/dependabot.yml`, `package.json` và `package-lock.json` tại đúng đường dẫn cấu hình. Nếu `main` vẫn chỉ có README, Dependabot npm chưa thể theo dõi source trên nhánh khác với cấu hình này. Cần thống nhất thay đổi nhánh mặc định hoặc cấu trúc repository trước.

## Yêu cầu kiểm tra trước merge

Người có quyền quản trị repository mở **Settings → Branches → Add branch protection rule** (hoặc sử dụng Rulesets), chọn chính xác nhánh nhận PR, bật **Require a pull request before merging**, yêu cầu tối thiểu một approval nếu nhóm muốn, và bật **Require status checks to pass before merging**. Chọn job `Lint, test và build` sau khi nó đã chạy thành công và xuất hiện trong danh sách; lưu rule. Cân nhắc bật yêu cầu áp dụng cho quản trị viên và tắt force push nếu phù hợp quy trình nhóm.

Quyền sử dụng branch protection phụ thuộc loại repository và gói GitHub; xem [GitHub Docs: quản lý branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule). Để Dependabot hoạt động, xem [GitHub Docs: cấu hình Dependabot](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates).

Một status check chỉ có tác dụng chặn merge khi rule đã được tạo và áp dụng đúng nhánh. CI không thay thế review nghiệp vụ, bảo mật hoặc kiểm thử trên thiết bị. Không đưa ảnh thật, mật khẩu hoặc token vào repository hay log.
