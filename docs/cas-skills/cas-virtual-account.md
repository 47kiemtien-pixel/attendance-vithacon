---
name: cas-virtual-account
description: "Tích hợp Virtual Account của Cas (scopes: virtual_account): các bước tích hợp, API cần gọi và checklist trước khi lên production."
---

# Cas — Virtual Account

> Nguồn: https://cas.so/product/virtual-account · Markdown: https://cas.so/product/virtual-account.md

_Skill này được sinh tự động từ tài liệu Cas. Khi cần chi tiết (schema, mã lỗi, ví dụ), hãy tải bản Markdown mới nhất ở các liên kết bên dưới thay vì suy đoán._

## Khi nào dùng skill này

Khi tích hợp, mở rộng hoặc gỡ lỗi **Virtual Account** của Cas trong hệ thống của bạn.

## Tóm tắt sản phẩm

Tạo Tài khoản định danh (Tài khoản ảo).

Tài khoản định danh (Tài khoản ảo) là tài khoản phụ liên kết trực tiếp với tài khoản chính của khách hàng. 
Số Tài khoản định danh được thiết kế và hiển thị dưới dạng dãy chữ/số ký tự tuân theo cấu trúc VA do Cas cung cấp.

Tài khoản định danh có chức năng là số tài khoản thụ hưởng của khách hàng, giúp quản lý khoản phải thu dễ dàng, 
giảm thiểu số lượng tài khoản chuyên thu tại các ngân hàng, chủ động trong việc tạo và quản lý các số Tài khoản định danh thuận tiện cho người dùng.

## Phân quyền (scopes)

`virtual_account`

## Luồng tích hợp

Dưới đây là các bước để tích hợp Virtual Account vào sản phẩm của bạn.
1. Tạo một phân quyền [/grant/token](https://cas.so/general/api/grant/create.md) với `scopes` là `virtual_account`,
 `virtualAccountNumber` có giá trị được thiết lập theo cấu trúc phía Cas cung cấp cho bạn và `fiServiceId` mã dịch vụ tài chính đăng ký VA này.
  - **virtualAccountNumber**: sẽ được cấu hình riêng cho mỗi ứng dụng và mỗi dịch vụ tài chính tương ứng.
  - **fiServiceId**: bạn có thể gọi API [/fi-services](https://cas.so/general/api/institutions/get-fi-services.md) để lấy thông tin.
  - **user** (tuỳ chọn): thông tin khách hàng mà hệ thống của bạn đã lưu, dùng để điền sẵn biểu mẫu trên Cas Link
  và hỗ trợ kiểm tra thông tin tài khoản. [Xem chi tiết](#user-info)

2. Mở giao diện Cas Link bằng `grantToken` được trả về ở bước trên. [Xem chi tiết](https://cas.so/general/link.md)

3. Sau khi người dùng hoàn tất xác thực, phía giao diện của bạn sẽ nhận được một publicToken, dùng publicToken này để lấy accessToken cho phân quyền.

4. Sau khi có `accessToken`, gọi API [Lấy thông tin Tài khoản định danh](https://cas.so/general/api/get-virtual-account-identity.md) để kiểm tra thông tin chi tiết của TK và bắt đầu thêm vào hệ thống của bạn.

5. Kiểm tra VA hợp lệ với hệ thống của bạn, với trường hợp không hợp lệ gọi API [/grant/remove](https://cas.so/general/api/grant/remove.md) để thực hiện xoá phân quyền.

#### Thông tin khách hàng (`user`) {#user-info}

`user` là trường **tuỳ chọn** khi tạo phân quyền. Nếu hệ thống của bạn đã lưu sẵn thông tin của khách hàng, hãy truyền vào để:

- **Điền sẵn biểu mẫu liên kết**: Cas Link tự động điền các ô tên chủ tài khoản, số định danh, số điện thoại và email,
người dùng không cần nhập lại những thông tin bên bạn đã có.
- **Hỗ trợ kiểm tra thông tin tài khoản**: những thông tin này được gửi kèm khi Cas Link kiểm tra tài khoản với dịch vụ tài chính,
giúp phát hiện sớm trường hợp tài khoản đăng ký Tài khoản định danh không đúng với khách hàng trên hệ thống của bạn.

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
hoặc `companyName`/`companyLegalId`. Trường nào không truyền thì Cas Link để trống ô tương ứng cho người dùng tự nhập.
:::

## API dùng trong luồng này

- [Tạo đối tượng phân quyền](https://cas.so/general/api/grant/create.md)
- [Danh sách dịch vụ tài chính](https://cas.so/general/api/institutions/get-fi-services.md)
- [Virtual Account](https://cas.so/general/api/get-virtual-account-identity.md)
- [Xoá phân quyền](https://cas.so/general/api/grant/remove.md)
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
