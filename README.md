# Attendance System

## Mục tiêu kiến trúc

Kiến trúc đích để desktop Windows và iPhone dùng chung dữ liệu:

- `Desktop app` Electron chỉ là client
- `iPhone app` sau này cũng là client
- `Public API server` chạy Node/Express
- `PostgreSQL` là nguồn dữ liệu trung tâm

Luồng tổng quát:

- Desktop -> `https://api.yourdomain.com/api`
- iPhone -> `https://api.yourdomain.com/api`
- API -> PostgreSQL

## Trạng thái backend hiện tại

Backend hiện có 2 storage driver:

- `json`
- `postgres`

Quy tắc chọn driver:

- `ATTENDANCE_DATA_DRIVER=postgres` -> dùng PostgreSQL
- `ATTENDANCE_DATA_DRIVER=json` -> dùng file JSON
- nếu không chỉ định nhưng có `DATABASE_URL` hoặc `PG*` -> dùng PostgreSQL
- nếu không có gì -> fallback về JSON

Mục đích:

- không làm gãy app hiện tại
- cho phép chuyển dần từ local JSON sang public PostgreSQL

## Schema PostgreSQL

Khi chạy với driver `postgres`, server tự tạo schema gồm:

- `workers`
- `attendance_records`
- `preset_jobs`
- `app_users`

Ý nghĩa:

- `workers`: công nhân
- `attendance_records`: dữ liệu chấm công từng ngày theo công nhân
- `preset_jobs`: mẫu vị trí/địa điểm/lương
- `app_users`: tài khoản đăng nhập

Nếu database trống và `server/data/*.json` còn tồn tại, server sẽ import dữ liệu JSON cũ một lần.

## Authentication

Backend đã có auth cơ bản:

- `POST /api/auth/bootstrap`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/status`

Nguyên tắc:

- khi chưa có user nào, gọi `bootstrap` để tạo admin đầu tiên
- sau đó đăng nhập qua `login`
- server trả về JWT access token
- các route dữ liệu chỉ bắt buộc auth khi `AUTH_REQUIRED=true`

Lưu ý:

- desktop app hiện đã có màn đăng nhập
- token được lưu local và tự gắn `Authorization: Bearer ...` cho mọi request API
- nếu token hết hạn hoặc bị từ chối `401`, app sẽ tự xóa phiên và quay về màn đăng nhập

## File môi trường

Xem file mẫu:

- [.env.example](C:/Users%20/Minh%20Thien%20IT/Desktop/attendance-system/.env.example)

Biến quan trọng:

- `NODE_ENV`
- `HOST`
- `PORT`
- `ATTENDANCE_DATA_DRIVER`
- `DATABASE_URL`
- `AUTH_REQUIRED`
- `JWT_SECRET`
- `CORS_ORIGIN`

Ví dụ production:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=5000
ATTENDANCE_DATA_DRIVER=postgres
DATABASE_URL=postgres://attendance_user:strong_password@postgres:5432/attendance_system
AUTH_REQUIRED=true
JWT_SECRET=replace-with-long-random-secret
CORS_ORIGIN=https://app.yourdomain.com,https://admin.yourdomain.com
```

## Chạy public server bằng Docker Compose

Các file deploy đã chuẩn bị:

- [Dockerfile](C:/Users%20/Minh%20Thien%20IT/Desktop/attendance-system/Dockerfile)
- [docker-compose.production.yml](C:/Users%20/Minh%20Thien%20IT/Desktop/attendance-system/docker-compose.production.yml)
- [deploy/nginx.conf](C:/Users%20/Minh%20Thien%20IT/Desktop/attendance-system/deploy/nginx.conf)

### Bước 1. Tạo file `.env`

```bash
cp .env.example .env
```

Sửa tối thiểu:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- mật khẩu PostgreSQL

### Bước 2. Chạy stack

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Stack gồm:

- `postgres`
- `api`
- `nginx`

### Bước 3. Kiểm tra health

```bash
curl http://localhost/api/health
```

hoặc:

```bash
curl http://localhost:5000/api/health
```

## Bootstrap admin đầu tiên

Sau khi server chạy và database trống:

```bash
curl -X POST http://localhost:5000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "change_me_now",
    "fullName": "System Admin"
  }'
```

Kết quả trả về:

- `token`
- `user`

Sau đó đăng nhập:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "change_me_now"
  }'
```

## Trình tự bật `AUTH_REQUIRED=true`

Để tránh tự khóa ứng dụng ngoài hệ thống, nên làm theo đúng thứ tự:

1. deploy backend mới
2. cập nhật desktop app có màn đăng nhập
3. bootstrap admin đầu tiên bằng `/api/auth/bootstrap`
4. đăng nhập kiểm tra `/api/auth/login`
5. chỉ sau đó mới đặt:

```env
AUTH_REQUIRED=true
```

Nếu bật `AUTH_REQUIRED=true` quá sớm trong khi client cũ chưa có login flow, app desktop cũ sẽ không truy cập được dữ liệu.

## Reverse proxy và HTTPS

File `deploy/nginx.conf` hiện là bản cơ bản chạy HTTP nội bộ.

Để public thật:

1. trỏ domain ví dụ `api.yourdomain.com` về VPS
2. dùng Nginx hoặc Caddy để terminate HTTPS
3. cấp SSL bằng Let's Encrypt
4. chỉ expose `443`, không để app trần ra internet

Nếu dùng VPS Ubuntu không cần Docker, bạn vẫn nên có:

- `PostgreSQL`
- `Node.js`
- `Nginx`
- `systemd` hoặc `pm2`
- `certbot`

## Desktop app -> public API

Desktop frontend hiện hỗ trợ cấu hình API URL runtime.

Thứ tự ưu tiên:

1. query param `apiUrl` do Electron truyền vào
2. `VITE_API_URL`
3. mặc định `http://127.0.0.1:5000/api`

Desktop có thể dùng API public bằng cách:

```powershell
$env:ATTENDANCE_API_URL="https://api.yourdomain.com/api"
npm run desktop:start:lan
```

Khi `ATTENDANCE_API_URL` được set:

- Electron bỏ qua embedded local server
- app desktop kết nối thẳng tới API public/shared

## Giai đoạn kế tiếp nên làm

1. thêm refresh token hoặc session table nếu muốn quản lý đăng nhập tốt hơn
2. tách role `admin` / `manager`
3. làm mobile app iOS bằng React Native / Expo dùng chung API
4. thêm audit log và backup DB định kỳ
