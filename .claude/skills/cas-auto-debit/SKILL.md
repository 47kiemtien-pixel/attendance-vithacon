---
name: cas-auto-debit
description: "Tích hợp Auto Debit của Cas (scopes: auto_debit): các bước tích hợp, API cần gọi và checklist trước khi lên production."
---

# Cas — Auto Debit

> Nguồn: https://cas.so/product/auto-debit · Markdown: https://cas.so/product/auto-debit.md

_Skill này được sinh tự động từ tài liệu Cas. Khi cần chi tiết (schema, mã lỗi, ví dụ), hãy tải bản Markdown mới nhất ở các liên kết bên dưới thay vì suy đoán._

## Khi nào dùng skill này

Khi tích hợp, mở rộng hoặc gỡ lỗi **Auto Debit** của Cas trong hệ thống của bạn.

## Tóm tắt sản phẩm

Auto Debit (Thu phí tự động) là dịch vụ tự động trích một khoản tiền từ tài khoản của khách hàng và
chuyển vào tài khoản của doanh nghiệp để tự động gia hạn gói dịch vụ, thanh toán đơn hàng, thanh toán chi phí định kỳ, ... của khách hàng.

## Phân quyền (scopes)

`auto_debit`

## Luồng tích hợp

Dưới đây là các bước để tích hợp Thu phí tự động vào sản phẩm của bạn.
1. Tạo một phân quyền [/grant/token](https://cas.so/general/api/grant/create.md) với `scopes` có giá trị là `auto_debit`.

2. Mở giao diện Cas Link bằng `grantToken` được trả về ở bước trên. [Xem chi tiết](https://cas.so/general/link.md)

3. Sau khi người dùng hoàn tất xác thực, phía giao diện của bạn sẽ nhận được một publicToken, dùng publicToken này để lấy accessToken cho phân quyền.

4. Sau khi có `accessToken`, gọi [API lấy thông tin tài khoản dịch vụ thu hộ tự động](https://cas.so/general/api/auto-debit-identity.md) để kiểm tra thông tin.

5. Gọi [API Thu phí tự động](https://cas.so/general/api/auto-debit.md) để thực hiện tạo lệnh trích nợ tự động cho Gia hạn gói dịch vụ của khách hàng, thanh toán đơn hàng, ...

6. Khi một giao dịch Thu phí tự động (Trích nợ tự động) được xử lý thành công hoặc thật bại, 
phía hệ thống Cas sẽ gửi một [webhook](https://cas.so/general/api/webhook.md) kèm thông tin ở trường `autoDebit`,
hệ thống của bạn khi nhận được thông tin này cần kiểm tra lại thông tin thanh toán và tiếp tục xử lý các bước tiếp theo.

## API dùng trong luồng này

- [Tạo đối tượng phân quyền](https://cas.so/general/api/grant/create.md)
- [Auto Debit Identity](https://cas.so/general/api/auto-debit-identity.md)
- [Auto Debit](https://cas.so/general/api/auto-debit.md)
- [Webhook](https://cas.so/general/api/webhook.md)
- [Lấy mã truy cập](https://cas.so/general/api/grant/exchange.md)

## Đọc trước khi viết code

- [Cas SDK](https://cas.so/skills/cas-sdk/SKILL.md)
- [Cas Link](https://cas.so/general/link.md)
- [Webhook](https://cas.so/general/api/webhook.md)
- [Mã lỗi](https://cas.so/errors.md)

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

## Các skill Cas khác

Danh mục đầy đủ (dùng để thêm sản phẩm Cas mới về sau):

https://cas.so/skills/index.json
