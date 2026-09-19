---
name: cas-sdk
description: "Nền tảng tích hợp Cas: môi trường, xác thực, vòng đời grant (token → Cas Link → exchange → gọi API), webhook và xử lý lỗi. Dùng cho mọi sản phẩm Cas."
---

# Cas — core

> Nguồn: https://cas.so/quickstart · Markdown: https://cas.so/quickstart.md

_Skill này được sinh tự động từ tài liệu Cas. Khi cần chi tiết (schema, mã lỗi, ví dụ), hãy tải bản Markdown mới nhất ở các liên kết bên dưới thay vì suy đoán._

## Môi trường & xác thực

| Môi trường | Base URL |
| --- | --- |
| Sandbox | `https://sandbox.bankhub.dev` |
| Production | `https://production.bankhub.dev` |

Mọi lệnh gọi từ server đều kèm: `x-client-id`, `x-secret-key`, `X-BankHub-Api-Version: 2023-01-01`.
API cần phân quyền kèm thêm `Authorization: <accessToken>` — giá trị token trần, KHÔNG có tiền tố `Bearer`.
Luôn đối chiếu bản `.md` của từng endpoint trước khi code, danh sách header có thể khác ở vài API.

## Luồng chung của mọi sản phẩm Cas

1. **Tạo grant token** — server gọi `POST /grant/token` với `scopes` của sản phẩm, nhận về `grantToken` và `expiration`.
2. **Mở Cas Link** — client mở giao diện Cas Link bằng `grantToken`; người dùng cuối chọn tổ chức tài chính và xác thực.
3. **Nhận `publicToken`** — Cas Link trả `publicToken` về client khi người dùng hoàn tất.
4. **Đổi lấy `accessToken`** — server gọi `POST /grant/exchange` với `publicToken`; lưu `accessToken` + `grantId`.
5. **Gọi API sản phẩm** — dùng `accessToken` gọi các API của sản phẩm tương ứng.
6. **Nhận webhook** — Cas gửi webhook (giao dịch, trạng thái grant…) về endpoint của bạn; xử lý idempotent.

## Đọc trước khi viết code

- [Bắt đầu](https://cas.so/quickstart.md)
- [Cas Link](https://cas.so/general/link.md)
- [Tạo đối tượng phân quyền](https://cas.so/general/api/grant/create.md)
- [Lấy mã truy cập](https://cas.so/general/api/grant/exchange.md)
- [Xoá phân quyền](https://cas.so/general/api/grant/remove.md)
- [Tạm dừng phân quyền](https://cas.so/general/api/grant/pause.md)
- [Update mode](https://cas.so/general/link/update-mode.md)
- [Webhook](https://cas.so/general/api/webhook.md)
- [Mã lỗi](https://cas.so/errors.md)
- [Production checklist](https://cas.so/launch-checklist.md)

## Quy tắc bắt buộc khi viết code

- `clientId` / `secretKey` chỉ tồn tại ở server và trong biến môi trường — không bao giờ đưa xuống client, không commit vào repo.
- `scopes` khi tạo grant chỉ gồm đúng quyền sản phẩm cần; thừa scope là thừa chi phí và rủi ro.
- Tránh tạo grant trùng: tra trong DB xem user đã có grant còn hiệu lực chưa trước khi mở Cas Link.
- Lưu `accessToken` và `grantId` ở nơi mã hoá được, gắn với user trong hệ thống của bạn; một user có thể có nhiều grant. Không hiển thị các giá trị này ra giao diện.
- Ghi log `requestId` (mọi response) và `grantId` (response liên quan grant) cho mọi lần gọi API — đây là thứ đội hỗ trợ Cas cần khi tra soát.
- Mọi lệnh gọi API phải có timeout, retry có backoff cho lỗi tạm thời, và không retry mù các thao tác tạo lệnh/chuyển tiền (dùng khoá idempotency của riêng bạn).
- Webhook: chỉ nhận từ IP của Cas, phản hồi 2xx thật nhanh rồi xử lý bất đồng bộ, và xử lý idempotent vì webhook có thể tới nhiều lần hoặc sai thứ tự.
- Xử lý `GRANT_LOGIN_REQUIRED` bằng cách mở lại Cas Link ở Update mode thay vì bắt user liên kết lại từ đầu.
- Xử lý webhook `GRANT`: `USER_PERMISSION_REVOKED`, `GRANT_DELETED`, `GRANT_PAUSED`, `DEFAULT_UPDATE` — cập nhật trạng thái liên kết trong hệ thống của bạn.
- Gọi `/grant/remove` khi user huỷ liên kết trong ứng dụng của bạn, và xử lý nhánh cần xác thực OTP.
- Chạy trọn vẹn trên `https://sandbox.bankhub.dev` trước, chỉ đổi sang `https://production.bankhub.dev` cùng với bộ secret production.

## Trước khi lên production

Đối chiếu **toàn bộ** production checklist: https://cas.so/launch-checklist.md

Với mỗi mục trong checklist, phải chỉ ra được đoạn code (đường dẫn file + dòng) chứng minh đã xử lý, hoặc ghi rõ lý do không áp dụng. Không đánh dấu hoàn thành khi chưa có bằng chứng.

## Sản phẩm khả dụng

Mỗi sản phẩm có skill riêng, cài thêm khi cần mở rộng:

- **Auto Debit** — `cas-auto-debit` — https://cas.so/skills/cas-auto-debit/SKILL.md
- **Balance Hook** — `cas-balance-hook` — https://cas.so/skills/cas-balance-hook/SKILL.md
- **Deeplink** — `cas-deeplink` — https://cas.so/skills/cas-deeplink/SKILL.md
- **EKYC** — `cas-ekyc` — https://cas.so/skills/cas-ekyc/SKILL.md
- **IDKit** — `cas-idkit` — https://cas.so/skills/cas-idkit/SKILL.md
- **Invoice Hub** — `cas-invoice-hub` — https://cas.so/skills/cas-invoice-hub/SKILL.md
- **Pay Out** — `cas-pay-out` — https://cas.so/skills/cas-pay-out/SKILL.md
- **Payment Initiation** — `cas-payment-initiation` — https://cas.so/skills/cas-payment-initiation/SKILL.md
- **QR Pay** — `cas-qr-pay` — https://cas.so/skills/cas-qr-pay/SKILL.md
- **Transactions** — `cas-transactions` — https://cas.so/skills/cas-transactions/SKILL.md
- **TVAN** — `cas-tvan` — https://cas.so/skills/cas-tvan/SKILL.md
- **Virtual Account** — `cas-virtual-account` — https://cas.so/skills/cas-virtual-account/SKILL.md
