---
name: cas-invoice-hub
description: "Tích hợp Invoice Hub của Cas (scopes: invoice): các bước tích hợp, API cần gọi và checklist trước khi lên production."
---

# Cas — Invoice Hub

> Nguồn: https://cas.so/product/invoice-hub · Markdown: https://cas.so/product/invoice-hub.md

_Skill này được sinh tự động từ tài liệu Cas. Khi cần chi tiết (schema, mã lỗi, ví dụ), hãy tải bản Markdown mới nhất ở các liên kết bên dưới thay vì suy đoán._

## Khi nào dùng skill này

Khi tích hợp, mở rộng hoặc gỡ lỗi **Invoice Hub** của Cas trong hệ thống của bạn.

## Tóm tắt sản phẩm

Tạo hóa đơn điện tử dễ dàng – Minh bạch tài chính tức thì

Cas Invoice Hub API hỗ trợ tạo hóa đơn điện tử một cách nhanh chóng, chính xác và tự động, giúp đơn giản hóa quy trình kế toán và đảm bảo tuân thủ quy định tài chính.
Bạn có thể:

- Khởi tạo hóa đơn trực tiếp từ giao dịch hoặc dữ liệu bán hàng

- Gửi hóa đơn điện tử đến người mua qua email hoặc link

- Đồng bộ dữ liệu hóa đơn phục vụ báo cáo thuế, kế toán

- Đảm bảo tính minh bạch và đối chiếu dễ dàng trong mọi hoạt động tài chính

## Phân quyền (scopes)

`invoice`

## Luồng tích hợp

Dưới đây là các bước để tích hợp Invoice Hub vào sản phẩm của bạn.
1. Tạo một phân quyền [/grant/token](https://cas.so/general/api/grant/create.md) với `scopes` có giá trị là `invoice`.

2. Mở giao diện Cas Link bằng `grantToken` được trả về ở bước trên. [Xem chi tiết](https://cas.so/general/link.md)

3. Sau khi người dùng hoàn tất xác thực, phía giao diện của bạn sẽ nhận được một publicToken, dùng publicToken này để lấy accessToken cho phân quyền.

4. Bây giờ bạn đã có thể gọi [API tạo hoá đơn](https://cas.so/general/api/invoice-hub.md).

## API dùng trong luồng này

- [Tạo đối tượng phân quyền](https://cas.so/general/api/grant/create.md)
- [Invoice Hub](https://cas.so/general/api/invoice-hub.md)
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
