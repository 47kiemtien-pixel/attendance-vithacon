---
name: cas-ekyc
description: "Tích hợp EKYC của Cas (scopes: ekyc): các bước tích hợp, API cần gọi và checklist trước khi lên production."
---

# Cas — EKYC

> Nguồn: https://cas.so/product/ekyc · Markdown: https://cas.so/product/ekyc.md

_Skill này được sinh tự động từ tài liệu Cas. Khi cần chi tiết (schema, mã lỗi, ví dụ), hãy tải bản Markdown mới nhất ở các liên kết bên dưới thay vì suy đoán._

## Khi nào dùng skill này

Khi tích hợp, mở rộng hoặc gỡ lỗi **EKYC** của Cas trong hệ thống của bạn.

## Tóm tắt sản phẩm

Truy vấn thông tin định danh cá nhân và doanh nghiệp đã xác thực qua Cas ID

Với ứng dụng [Cas ID](https://cas.so/cas-id), Cas có thể định danh khách hàng cũng như doanh nghiệp thuộc quyền sở hữu bởi khách hàng. 
Từ đó, Cas cung cấp API này cho phép khách hàng cấp quyền truy cập thông tin của KH cho ứng dụng của bạn với những thông tin đã được xác thực.

## Phân quyền (scopes)

`ekyc`

## Luồng tích hợp

Dưới đây là các bước để tích hợp eKYC vào sản phẩm của bạn.
1. Tạo một phân quyền [/grant/token](https://cas.so/general/api/grant/create.md) với `scopes` có giá trị là `ekyc`.

2. Mở giao diện Cas Link bằng `grantToken` được trả về ở bước trên. [Xem chi tiết](https://cas.so/general/link.md)

3. Khách hàng của bạn mở ứng dụng [Cas ID](https://cas.so/cas-id) và quét mã QR trên Cas Link.

4. Sau khi người dùng hoàn tất chấp nhận quyền truy cập thông tin của họ cho Ứng dụng của bạn, 
phía giao diện của bạn sẽ nhận được một publicToken, dùng publicToken này để lấy accessToken cho phân quyền. 
AccessToken này chỉ có thể truy cập trong vòng 5 phút. Sau 5 phút ứng dụng của bạn muốn truy cập lại thông tin thì bắt buộc làm lại từ bước 1.

5. Bây giờ bạn đã có thể gọi [API truy vấn thông tin định danh](https://cas.so/general/api/ekyc.md).

## API dùng trong luồng này

- [Tạo đối tượng phân quyền](https://cas.so/general/api/grant/create.md)
- [EKYC](https://cas.so/general/api/ekyc.md)
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
