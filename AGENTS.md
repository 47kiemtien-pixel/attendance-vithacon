# Hướng dẫn AI Agent trong dự án

Dự án Hệ thống Quản lý Chấm công & Thanh toán Lương Việt Thành (attendance-system).

## Tích hợp Cas
Skill của Cas nằm trong `.claude/skills/`. Đọc `cas-sdk` trước, rồi tới skill của sản phẩm.
Không đoán cấu trúc API — luôn mở các liên kết `.md` được ghi trong skill.

### Danh mục Skill Cas đã cài đặt:
- `cas-sdk`: Nền tảng tích hợp Cas (Sandbox `https://sandbox.bankhub.dev`, Production `https://production.bankhub.dev`)
- `cas-pay-out`: API chi lương / chuyển khoản tự động
- `cas-qr-pay`: Tạo mã QR thanh toán động & nhận webhook
- `cas-virtual-account`: Quản lý tài khoản định danh
- `cas-transactions`: Lấy danh sách giao dịch & đối soát
- `cas-balance-hook`: Webhook biến động số dư
- `cas-auto-debit`: Trích nợ tự động
- `cas-deeplink`: Điều hướng sang app ngân hàng
- `cas-ekyc`: Định danh điện tử
- `cas-idkit`: Tra cứu doanh nghiệp & ngành nghề
- `cas-invoice-hub`: Quản lý hoá đơn
- `cas-payment-initiation`: Khởi tạo thanh toán
- `cas-tvan`: Truyền nhận thông điệp thuế điện tử
