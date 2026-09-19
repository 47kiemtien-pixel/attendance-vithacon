---
name: cas-balance-hook
description: "Tích hợp Balance Hook của Cas (scopes: qrpay, virtual_account): các bước tích hợp, API cần gọi và checklist trước khi lên production."
---

# Cas — Balance Hook

> Nguồn: https://cas.so/product/balance-hook · Markdown: https://cas.so/product/balance-hook.md

_Skill này được sinh tự động từ tài liệu Cas. Khi cần chi tiết (schema, mã lỗi, ví dụ), hãy tải bản Markdown mới nhất ở các liên kết bên dưới thay vì suy đoán._

## Khi nào dùng skill này

Khi tích hợp, mở rộng hoặc gỡ lỗi **Balance Hook** của Cas trong hệ thống của bạn.

## Tóm tắt sản phẩm

Balance Hook là một webhook sự kiện được Cas cung cấp để thông báo tức thời khi có bất kỳ biến động số dư nào trên tài khoản ngân hàng hoặc tài khoản ảo (VA) mà bạn đã tích hợp.

Khi người dùng nạp tiền, rút tiền, hoặc phát sinh giao dịch làm thay đổi số dư, hệ thống của bạn sẽ nhận được một cuộc gọi `POST` từ Cas, giúp bạn xử lý giao dịch một cách nhanh chóng và tự động, không cần liên tục truy vấn.

## Phân quyền (scopes)

`qrpay` · `virtual_account`

## Luồng tích hợp

Dưới đây là các bước để tích hợp Balance Hook vào sản phẩm của bạn.

1. Tạo một phân quyền [/grant/token](https://cas.so/general/api/grant/create.md) với `scopes` có giá trị là `qrpay` hoặc `virtual_account`.
  - **user** (tuỳ chọn): thông tin khách hàng mà hệ thống của bạn đã lưu, dùng để điền sẵn biểu mẫu trên Cas Link
  và hỗ trợ kiểm tra thông tin tài khoản. [Xem chi tiết](#user-info)

2. Mở giao diện Cas Link bằng `grantToken` để người dùng liên kết tài khoản ngân hàng. [Xem chi tiết](https://cas.so/general/link.md)

3. Nhận `publicToken` sau khi người dùng hoàn tất liên kết, và dùng nó để lấy `accessToken`.

4. Sau khi có accessToken, gọi API Lấy thông tin định danh tài khoản để kiểm tra thông tin và bắt đầu thêm vào hệ thống của bạn.

5. Cấu hình endpoint nhận webhook, CAS.SO sẽ gửi dữ liệu thay đổi số dư khi có giao dịch mới phát sinh.

#### Thông tin khách hàng (`user`) {#user-info}

`user` là trường **tuỳ chọn** khi tạo phân quyền. Nếu hệ thống của bạn đã lưu sẵn thông tin của khách hàng, hãy truyền vào để:

- **Điền sẵn biểu mẫu liên kết**: Cas Link tự động điền các ô tên chủ tài khoản, số định danh, số điện thoại và email,
người dùng không cần nhập lại những thông tin bên bạn đã có.
- **Kiểm tra thông tin tài khoản**: với `scopes` là `qrpay`, Cas Link đối chiếu thông tin bạn gửi với thông tin tài khoản
mà ngân hàng trả về; nếu tên chủ tài khoản hoặc số định danh không khớp thì thao tác liên kết sẽ bị dừng lại và báo lỗi cho người dùng.

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `legalName` | string | Tên chủ tài khoản cá nhân |
| `idNumber` | string | Số định danh cá nhân (CCCD/CMND) của chủ tài khoản |
| `companyName` | string | Tên doanh nghiệp |
| `companyLegalId` | string | Mã số thuế/mã số doanh nghiệp |
| `mobileNumber` | string | Số điện thoại khách hàng đăng ký với ngân hàng |
| `email` | string | Email của khách hàng |

:::note
Tuỳ theo dịch vụ tài chính là loại **cá nhân** hay **doanh nghiệp** mà bạn truyền cặp `legalName`/`idNumber`
hoặc `companyName`/`companyLegalId`. Trường nào không truyền thì bỏ qua việc đối chiếu trường đó.
:::

## API dùng trong luồng này

- [Tạo đối tượng phân quyền](https://cas.so/general/api/grant/create.md)
- [Lấy mã truy cập](https://cas.so/general/api/grant/exchange.md)
- [Webhook](https://cas.so/general/api/webhook.md)

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
