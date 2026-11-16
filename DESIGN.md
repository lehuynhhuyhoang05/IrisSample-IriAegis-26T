# Thiết kế IriAegis Web

## Nguồn quy chuẩn

Nhận diện lấy từ app Android, các token gốc ở `src/android-tokens.css`. Dùng ảnh menu IriTech do trưởng nhóm cung cấp để định hướng điều hướng mobile: header, nút menu và drawer bên trái. Không sao chép nội dung marketing hoặc chuyển ứng dụng thành landing page.

- Giữ mint `#66CFCF`, teal `#3BA8A8`, nền `#F5FAFA`, mặt phẳng trắng và chữ `#263238` của Android.
- Biến ngữ nghĩa `--ui-*` ở `src/ui/tokens.css` ánh xạ tới tài nguyên Android. Màu nút/link teal đậm `#236E69` giữ tương phản chữ. Không tự đổi toàn bộ sang navy, xanh dương hoặc một bộ nhận diện mới.
- Font hệ thống, dấu tiếng Việt đầy đủ. Không tải font/thư viện icon mới chỉ để trang trí. Giữ logo Android và bộ SVG hiện có.
- Không gradient trang trí, card lồng card, shadow trên mọi khối, banner giải thích thường trực hoặc chữ kỹ thuật đặt vào tác vụ người dùng.

## Bố cục điều hướng

`src/portal/PortalShell.jsx` là shell dùng chung cho demo và server.

- Trên điện thoại: header mint, logo bên trái, nhãn môi trường nhỏ và nút Menu bên phải. Không có tabbar cố định phía dưới.
- Menu mở từ trái, nền trắng, chiếm tối đa 320px và 82% màn hình; nền trang còn lại mờ. Các nhóm Lớp học/Quản lý/Công cụ/Tài khoản có thể thu/mở. Mục đang chọn dùng nền mint nhạt. Không thêm icon trang trí vào từng dòng menu mobile.
- Menu giữ đủ đường dẫn theo quyền, có thể cuộn; đóng bằng nút X, Escape, chạm ngoài hoặc chọn chức năng. Đóng menu trả focus về nút mở. Nền trang không thể thao tác khi menu đang mở.
- Từ 768px: sidebar trắng, chữ đậm vừa phải, nhóm chức năng và mục đang chọn mint. Không dùng sidebar navy.
- Nội dung không bị ép thành phiên bản thu nhỏ của desktop. Khoảng chạm tối thiểu 44px; input ít nhất 16px; không khóa zoom, không tràn ngang.

## Nội dung và trạng thái

- Tiêu đề dùng tên tác vụ, không slogan/eyebrow hoặc đoạn hướng dẫn lặp dưới từng tiêu đề.
- Nhãn Demo/Server ở header cho biết môi trường. Không lặp banner giải thích dữ liệu thử trên mọi trang.
- Bỏ banner tĩnh ở sao lưu/điểm danh thử và luồng face. Nút/xác nhận vẫn ghi rõ thao tác giả lập, không trình bày kết quả demo là kết quả server.
- Báo cáo hiển thị tổng Đúng giờ/Muộn/Vắng bằng nhãn và số cùng hàng, tự xuống dòng khi cần. Không có thanh bar màu, thẻ KPI hoặc icon cho ba tổng này.
- Giữ lỗi thật, kết quả tác vụ, xác nhận xóa/khôi phục và trạng thái thiếu dịch vụ/thiết bị tại đúng vị trí cần xử lý.
- Thông tin kỹ thuật sao lưu đặt trong mục mở rộng. Hướng dẫn tích hợp/giới hạn model đặt trong tài liệu, không lặp trong giao diện chính.

## Màn điểm danh và form

Tên môn/ngày/ca hiển thị gọn; nút Đổi mở bảng chọn buổi học. Người đã được ghi nhận hiển thị giờ và trạng thái, không dùng nút disabled thay kết quả. Có bộ lọc Tất cả/Chưa ghi nhận/Đã ghi nhận và tìm theo tên/mã.

Ngày hiển thị dd/mm/yyyy một dòng; input native vẫn giữ label, value ISO, required/min/max và bộ chọn ngày trình duyệt. Không format lại payload gửi server.

Form có nhãn, lỗi cạnh trường, trạng thái chờ; modal giữ focus, vùng cuộn và nút lưu theo visualViewport khi mở bàn phím. Camera giữ oval và video inline. Việc sửa bố cục không thay đổi thuật toán liveness, quyền hoặc API.

## Kiểm tra

Chụp và mở ảnh home, danh sách lớp, điểm danh, báo cáo, sao lưu và menu tại 390px; thêm 360/768/1440px, nội dung dài và bàn phím. Kiểm tra theme Android, menu bên trái, thu/mở nhóm, backdrop, Escape và trả focus. Không sửa file trong lúc Playwright đang chạy để tránh Vite tải lại giữa ca.

Test WebKit mô phỏng không xác nhận Safari iPhone thật. Test API/liveness dùng fixture kiểm tra hợp đồng và điều phối, không đánh giá độ chính xác model hoặc backend thực tế.

## Tài liệu triển khai

Đọc `UI-GUIDELINES.md` cho cách dùng component. CSS sản phẩm dùng `src/portal/mobile-first.css` và `src/portal/workspace-layout.css`; tránh thêm override màu riêng ở từng màn. Skill frontend-design hỗ trợ quy trình xem/sửa ảnh, không thay thế yêu cầu nhận diện do trưởng nhóm chốt.

Kết quả đợt điều chỉnh theo ảnh trưởng nhóm: Chrome desktop/mobile 108/108 ca và WebKit 54/54 ca đạt ở lượt chạy đầy đủ. Đã xem ảnh menu trái, báo cáo không bar màu, sao lưu không banner và màn điểm danh. Đây vẫn là kiểm thử trình duyệt tự động; chưa xác nhận bản mới trên iPhone thật.

## Chuyển động tương tác

- Menu mở từ trái trong 220ms, đóng trong 160ms; nền mờ chuyển cùng menu. Không bật nảy hoặc scale cả trang.
- Khi đóng, giữ native dialog và khóa nền tới hết chuyển động, sau đó trả focus. Chọn đường dẫn hoặc đăng xuất đóng menu xong mới thực hiện bước tiếp theo; không gọi tác vụ hai lần khi bấm liên tiếp.
- Nhóm menu thu/mở 180ms, đảo hướng từ chiều cao hiện tại nếu bấm nhanh. Hộp thoại thường hiện nhẹ 140ms; nút phản hồi khi nhấn, không có hiệu ứng chạy trên mọi thẻ/dòng.
- Tôn trọng prefers-reduced-motion: bỏ chuyển vị trí và animation, vẫn thao tác đầy đủ. Không thêm motion vào video, oval, đo flash hoặc pipeline liveness.
- Code chung ở src/ui/motion.js và motion.css. Không cài thêm thư viện animation; giữ nguyên màu, font, bố cục Android đã chốt.

## Trình bày camera cho người dùng

Mặc định cả dev lẫn bản build hiển thị màn camera gọn: ngữ cảnh người cần xác thực, oval, một lời nhắc theo bước, đồng ý dùng ánh sáng/gửi ảnh và nút thao tác. Bỏ các hàng tiến trình lặp, tên model, điểm số, trạng thái phần cứng và mô tả API khỏi màn chính.

Thông tin kỹ thuật và kịch bản không camera chỉ bật khi đang dùng Vite dev và có VITE_CAMERA_DIAGNOSTICS=true hoặc localStorage aegis.camera-diagnostics=true. Bản production luôn bỏ các công cụ này kể cả trình duyệt còn lưu cờ từ lúc dev. Kết quả/phản hồi thật vẫn được kiểm tra, lỗi vẫn cho thử lại; không nới ngưỡng hoặc bỏ bước liveness. Chế độ Demo tiếp tục ghi rõ đối sánh mô phỏng, không biến thành xác thực danh tính thật bằng cách thay nhãn.
