---
name: cas-idkit
description: "Tích hợp IDKit của Cas: các bước tích hợp, API cần gọi và checklist trước khi lên production."
---

# Cas — IDKit

> Nguồn: https://cas.so/product/idkit · Markdown: https://cas.so/product/idkit.md

_Skill này được sinh tự động từ tài liệu Cas. Khi cần chi tiết (schema, mã lỗi, ví dụ), hãy tải bản Markdown mới nhất ở các liên kết bên dưới thay vì suy đoán._

## Khi nào dùng skill này

Khi tích hợp, mở rộng hoặc gỡ lỗi **IDKit** của Cas trong hệ thống của bạn.

## Tóm tắt sản phẩm

Truy vấn các thông tin gồm:
- Thông tin chi tiết doanh nghiệp
- Danh sách mã ngành nghề của doanh nghiệp
- Thông tin Hộ kinh doanh
- Thông tin người nộp thuế

## Phân quyền (scopes)

Không xác định được từ tài liệu — đọc trang sản phẩm để lấy đúng giá trị `scopes`.

## Luồng tích hợp

#### Lấy thông tin doanh nghiệp

  

```bash
curl --location 'https://sandbox.bankhub.dev/idkit/business/0316794479' \
--header 'X-BankHub-Api-Version: 2023-01-01' \
--header 'x-client-id: <CLIENT_ID_HERE>' \
--header 'x-secret-key: <SECRET_KEY_HERE>' \
--header 'Content-Type: application/json' \
```

  
  
```js
 const axios = require('axios');

 let config = {
   method: 'get',
   maxBodyLength: Infinity,
   url: 'https://sandbox.bankhub.dev/idkit/business/0316794479',
   headers: { 
     'Accept': 'application/json', 
     'x-client-id': '<x-client-id>', 
     'x-secret-key': '<x-client-id>'
   }
 };

 axios.request(config)
 .then((response) => {
   console.log(JSON.stringify(response.data));
 })
 .catch((error) => {
   console.log(error);
 });
```
  

:::info
  Xem chi tiết API, [tại đây](https://cas.so/general/api/idkit-get-business.md)
:::

#### Lấy danh sách mã ngành nghề của doanh nghiệp

  

```bash
curl --location 'https://sandbox.bankhub.dev/idkit/business/0316794479/industries' \
--header 'X-BankHub-Api-Version: 2023-01-01' \
--header 'x-client-id: <CLIENT_ID_HERE>' \
--header 'x-secret-key: <SECRET_KEY_HERE>' \
--header 'Content-Type: application/json' \
```

  
  
```js
 const axios = require('axios');

 let config = {
   method: 'get',
   maxBodyLength: Infinity,
   url: 'https://sandbox.bankhub.dev/idkit/business/0316794479/industries',
   headers: { 
     'Accept': 'application/json', 
     'x-client-id': '<x-client-id>', 
     'x-secret-key': '<x-client-id>'
   }
 };

 axios.request(config)
 .then((response) => {
   console.log(JSON.stringify(response.data));
 })
 .catch((error) => {
   console.log(error);
 });
```
  

:::info
  Xem chi tiết API, [tại đây](https://cas.so/general/api/idkit-get-business-industries.md)
:::

## API dùng trong luồng này

- [Business](https://cas.so/general/api/idkit-get-business.md)
- [Business industries](https://cas.so/general/api/idkit-get-business-industries.md)

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
