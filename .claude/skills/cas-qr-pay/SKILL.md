---
name: cas-qr-pay
description: "Tích hợp QR Pay của Cas (scopes: qrpay): các bước tích hợp, API cần gọi và checklist trước khi lên production."
---

# Cas — QR Pay

> Nguồn: https://cas.so/product/qr-pay · Markdown: https://cas.so/product/qr-pay.md

_Skill này được sinh tự động từ tài liệu Cas. Khi cần chi tiết (schema, mã lỗi, ví dụ), hãy tải bản Markdown mới nhất ở các liên kết bên dưới thay vì suy đoán._

## Khi nào dùng skill này

Khi tích hợp, mở rộng hoặc gỡ lỗi **QR Pay** của Cas trong hệ thống của bạn.

## Tóm tắt sản phẩm

Tạo mã thanh toán

QR PAY (Mã QR thanh toán) là mã QR động được tạo theo đơn hàng và kèm xác nhận thanh toán.

Với mỗi mã thanh toán được tạo thì sẽ có một số tài khoản ảo được sinh ra và số tài khoản ảo này sẽ gắn với một đơn hàng tương ứng, 
khi KH thanh toán vào số tài khoản ảo thì đơn hàng đó cũng được xác nhận thanh toán thành công.

Khi khách hàng thực hiện thanh toán vào số tài khoản ảo với đúng số tiền hoặc đúng số tiền và nội dung thì phía Cas sẽ xác nhận đơn hàng của bạn thanh toán, 
hệ thống của bạn sẽ nhận được một [webhook](https://cas.so/general/api/webhook.md) loại TRANSACTIONS và paymentMeta sẽ kèm giá trị `referenceNumber` lúc tạo QR Pay.

## Phân quyền (scopes)

`qrpay`

## Luồng tích hợp

Dưới đây là các bước để tích hợp QR Pay vào sản phẩm của bạn.
1. Tạo một phân quyền [/grant/token](https://cas.so/general/api/grant/create.md) với `scopes` có giá trị là `qrpay`.
  - **user** (tuỳ chọn): thông tin khách hàng mà hệ thống của bạn đã lưu, dùng để điền sẵn biểu mẫu trên Cas Link
  và đối chiếu với thông tin tài khoản ngân hàng. [Xem chi tiết](#user-info)

2. Mở giao diện Cas Link bằng `grantToken` được trả về ở bước trên. [Xem chi tiết](https://cas.so/general/link.md)

3. Sau khi người dùng hoàn tất xác thực, phía giao diện của bạn sẽ nhận được một publicToken, dùng publicToken này để lấy accessToken cho phân quyền.

4. Sau khi có `accessToken`, gọi [API lấy thông tin định danh của TK tạo QR Pay](https://cas.so/general/api/get-qr-pay-identity.md) để kiểm tra thông tin TK có hợp lệ hay không. 
Trường hợp TK không hợp lệ bạn sẽ gọi [API /grant/remove](https://cas.so/general/api/grant/remove.md) để xoá phân quyền này.

5. Bây giờ bạn đã có thể gọi [API Tạo QR Pay](https://cas.so/general/api/create-qr-pay.md).

6. Tạo mã QR từ kết quả ở trường `qrCode` và hiển thị mã QR này trên giao diện của bạn. 
Để đơn giản việc tạo mã VietQR bạn có thể dùng [Quicklink của vietqr.io](https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/) để tạo QR và nhúng link vào hệ thống của bạn.

7. Xử lý trạng thái đơn hàng trên hệ thống của bạn khi nhận [webhook](https://cas.so/general/api/webhook.md) giao dịch,
và trường `referenceNumber` trong paymentMeta từ webhook là mã đơn hàng trên hệ thống của bạn.

#### Thông tin khách hàng (`user`) {#user-info}

`user` là trường **tuỳ chọn** khi tạo phân quyền. Nếu hệ thống của bạn đã lưu sẵn thông tin của khách hàng, hãy truyền vào để:

- **Kiểm tra thông tin tài khoản**: Cas Link đối chiếu thông tin bạn gửi với thông tin tài khoản mà ngân hàng trả về.
Nếu tên chủ tài khoản hoặc số định danh không khớp, thao tác liên kết sẽ bị dừng lại và báo lỗi cho người dùng.
- **Điền sẵn biểu mẫu liên kết**: Cas Link tự động điền các ô tên chủ tài khoản, số định danh, số điện thoại và email,
người dùng không cần nhập lại những thông tin bên bạn đã có.

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `legalName` | string | Tên chủ tài khoản cá nhân |
| `idNumber` | string | Số định danh cá nhân (CCCD/CMND) của chủ tài khoản |
| `companyName` | string | Tên doanh nghiệp |
| `companyLegalId` | string | Mã số thuế/mã số doanh nghiệp |
| `mobileNumber` | string | Số điện thoại khách hàng đăng ký với ngân hàng |
| `email` | string | Email của khách hàng |

:::note
Tuỳ theo dịch vụ tài chính là loại **cá nhân** hay **doanh nghiệp** mà Cas Link dùng cặp `legalName`/`idNumber`
hoặc `companyName`/`companyLegalId` để đối chiếu. Trường nào không truyền thì bỏ qua việc đối chiếu trường đó.
:::

## API dùng trong luồng này

- [Webhook](https://cas.so/general/api/webhook.md)
- [Tạo đối tượng phân quyền](https://cas.so/general/api/grant/create.md)
- [QR Pay Identity (Beta)](https://cas.so/general/api/get-qr-pay-identity.md)
- [Xoá phân quyền](https://cas.so/general/api/grant/remove.md)
- [Tạo mã thanh toán](https://cas.so/general/api/create-qr-pay.md)
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
