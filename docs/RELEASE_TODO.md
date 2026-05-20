# Release Todo v1.5.0

## Muc Tieu Version

Version `1.5.0` gom cac thay doi chinh:

- Sua luong reset du lieu khi doi ngay cong sang nghi/phep/le.
- Chuan hoa input tien VND tren toan he thong.
- Hoan thien auto-update desktop app bang `electron-updater`.
- Bo sung SRS va tai lieu quan ly release/update.

## Todo Da Implement

- [x] Chuan hoa attendance record cho JSON store.
- [x] Dong bo logic attendance cho PostgreSQL store.
- [x] Dung chung helper parse/format tien VND.
- [x] Thay input tien bang `CurrencyInput` o Workers, Settings, Attendance.
- [x] Gan `UpdateBanner` vao React app.
- [x] Hoan thien Electron updater events: checking, available, not available, progress, downloaded, error.
- [x] Expose updater bridge qua preload: version, manual check, restart app.
- [x] Them `test:release` script.
- [x] Viet SRS.
- [x] Viet auto-update plan.
- [x] Dong bo version package cho release `1.5.0`.

## Giai Doan Test Kiem Thu

- [x] Syntax check Electron main/preload.
- [x] Syntax check server va stores.
- [x] Build client production.
- [x] Unit smoke test helper VND.
- [x] Smoke test JSON store: doi `Full` sang `Leave` phai reset luong/vi tri/dia diem/tien xe.
- [x] Smoke test API local `/api/auth/status`.
- [x] Smoke test Vite localhost.
- [x] Dong goi desktop bang `npm run desktop:pack`.
- [x] Kiem tra `latest.yml` tro dung artifact `attendance-system-desktop-setup-1.5.0.exe`.

## Xac Nhan Thu Cong Sau Khi Tao GitHub Release

- [ ] Test cai dat installer tren may Windows.
- [ ] Test auto-update tu version cu sang `1.5.0` qua GitHub Release.

## Dieu Kien Truoc Khi Tao GitHub Release

- `npm run test:release` pass.
- `npm run desktop:pack` pass.
- Thu muc `release` co installer va metadata update do electron-builder tao.
- GitHub Release tag `v1.5.0` phai upload day du artifact.
- Mo app version cu hon `1.5.0` de xac nhan banner update xuat hien.
